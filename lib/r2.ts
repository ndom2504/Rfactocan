import { createHash } from "crypto";
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Creds = { accessKeyId: string; secretAccessKey: string };

let cachedCreds: R2Creds | null = null;
let cachedCredsKey = "";

/**
 * R2 is ready when account + bucket name + public URL + credentials exist.
 * Credentials may be:
 * - S3 Access Key ID + Secret from R2 → Manage R2 API Tokens, or
 * - a Cloudflare API token value (`cfut_…`) which we convert to S3 keys
 *   (Access Key ID = token id, Secret = sha256(token value)).
 */
export function isR2Configured() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || "";
  const accessKey = process.env.R2_ACCESS_KEY_ID?.trim() || "";
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
  const bucket = process.env.R2_BUCKET?.trim() || "";
  const publicUrl = process.env.R2_PUBLIC_BASE_URL?.trim() || "";
  if (!accountId || !accessKey || !bucket || !publicUrl) return false;
  if (bucket.startsWith("http://") || bucket.startsWith("https://")) return false;
  // cfut_ tokens only need the bearer value; secret may be a placeholder.
  if (accessKey.startsWith("cfut_")) return true;
  return Boolean(secret);
}

async function resolveR2Credentials(): Promise<R2Creds> {
  const accessKey = process.env.R2_ACCESS_KEY_ID!.trim();
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
  const cacheKey = `${accessKey}:${secret}`;
  if (cachedCreds && cachedCredsKey === cacheKey) return cachedCreds;

  if (!accessKey.startsWith("cfut_")) {
    cachedCreds = { accessKeyId: accessKey, secretAccessKey: secret };
    cachedCredsKey = cacheKey;
    return cachedCreds;
  }

  // Cloudflare API token → S3-compatible pair (official R2 docs).
  const verify = await fetch(
    "https://api.cloudflare.com/client/v4/user/tokens/verify",
    { headers: { Authorization: `Bearer ${accessKey}` } }
  );
  const body = (await verify.json()) as {
    success?: boolean;
    result?: { id?: string };
    errors?: { message?: string }[];
  };
  const tokenId = body.result?.id?.trim();
  if (!verify.ok || !body.success || !tokenId) {
    throw new Error(
      "Token Cloudflare R2 invalide. Crée un token via R2 → Manage R2 API Tokens (Object Read & Write)."
    );
  }
  cachedCreds = {
    accessKeyId: tokenId,
    secretAccessKey: createHash("sha256").update(accessKey).digest("hex"),
  };
  cachedCredsKey = cacheKey;
  return cachedCreds;
}

async function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID!.trim();
  const credentials = await resolveR2Credentials();
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials,
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

function mapR2Error(error: unknown): Error {
  const msg = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  if (/AccessDenied|Access Denied|Forbidden/i.test(msg + name)) {
    return new Error(
      "R2 Access Denied : le token n’a pas le droit d’écriture. Dans Cloudflare → R2 → Manage R2 API Tokens, crée un token « Object Read & Write » sur le bucket rfactomedia, puis mets Access Key ID + Secret Access Key dans Vercel."
    );
  }
  return error instanceof Error ? error : new Error(msg);
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

  try {
    const client = await r2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!.trim(),
        Key: key,
        Body: bytes,
        ContentType: contentType || "application/octet-stream",
      })
    );
  } catch (error) {
    throw mapR2Error(error);
  }

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
  try {
    const client = await r2Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!.trim(),
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });
    const uploadUrl = await getSignedUrl(client, command, {
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
  } catch (error) {
    throw mapR2Error(error);
  }
}

export async function fetchR2Object(url: string) {
  if (!isR2Configured() || !isAllowedR2Url(url)) {
    throw new Error("URL R2 invalide");
  }
  const base = publicBase();
  const key = decodeURIComponent(url.replace(base + "/", "").replace(/^\//, ""));
  const client = await r2Client();
  return client.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!.trim(),
      Key: key,
    })
  );
}
