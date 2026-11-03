import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * R2 S3 credentials (from R2 → Manage R2 API Tokens), not a Cloudflare
 * Account API token (`cfut_…`). Bucket must be the bucket *name*, not the
 * public `*.r2.dev` URL.
 */
export function isR2Configured() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || "";
  const accessKey = process.env.R2_ACCESS_KEY_ID?.trim() || "";
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
  const bucket = process.env.R2_BUCKET?.trim() || "";
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim() || "";
  if (!accountId || !accessKey || !secret || !bucket || !publicBase) return false;
  if (bucket.startsWith("http://") || bucket.startsWith("https://")) return false;
  if (accessKey.startsWith("cfut_")) return false;
  return true;
}

function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID!.trim();
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
  });
}

function publicBase() {
  return process.env.R2_PUBLIC_BASE_URL!.trim().replace(/\/$/, "");
}

export function isAllowedR2Url(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const base = process.env.R2_PUBLIC_BASE_URL?.trim();
    if (base) {
      const baseHost = new URL(base).hostname;
      if (parsed.hostname === baseHost) return true;
    }
    return (
      parsed.hostname.endsWith(".r2.dev") ||
      parsed.hostname.endsWith(".r2.cloudflarestorage.com")
    );
  } catch {
    return false;
  }
}

export async function uploadToR2(
  pathname: string,
  body: Buffer | Uint8Array | Blob,
  contentType: string
) {
  if (!isR2Configured()) {
    throw new Error("R2 non configuré");
  }
  const key = pathname.replace(/^\/+/, "");
  const bytes =
    body instanceof Blob
      ? Buffer.from(await body.arrayBuffer())
      : Buffer.from(body);

  await r2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!.trim(),
      Key: key,
      Body: bytes,
      ContentType: contentType || "application/octet-stream",
    })
  );

  return { url: `${publicBase()}/${key}`, key };
}

/** Client PUT for large files (bypasses Vercel ~4.5 MB body limit). */
export async function createR2PresignedPut(
  pathname: string,
  contentType: string,
  expiresInSec = 600
) {
  if (!isR2Configured()) {
    throw new Error("R2 non configuré");
  }
  const key = pathname.replace(/^\/+/, "");
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!.trim(),
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  const uploadUrl = await getSignedUrl(r2Client(), command, {
    expiresIn: expiresInSec,
  });
  return {
    uploadUrl,
    publicUrl: `${publicBase()}/${key}`,
    key,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
    },
  };
}

export async function fetchR2Object(url: string) {
  if (!isR2Configured() || !isAllowedR2Url(url)) {
    throw new Error("URL R2 invalide");
  }
  const base = publicBase();
  const key = decodeURIComponent(url.replace(base + "/", "").replace(/^\//, ""));
  const result = await r2Client().send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!.trim(),
      Key: key,
    })
  );
  return result;
}
