import { get, put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getAppUrl } from "@/lib/app-url";

function extensionFor(contentType: string) {
  const ext = contentType.split("/")[1] ?? "bin";
  return ext === "jpeg" ? "jpg" : ext;
}

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

/** Match store access mode: private (default) or public. */
export function blobAccess(): "private" | "public" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

function toAppMediaUrl(blobUrl: string) {
  if (blobAccess() === "public") return blobUrl;
  const encoded = encodeURIComponent(blobUrl);
  // Relative URL works in browser; absolute needed if ever emailed.
  return `/api/media?url=${encoded}`;
}

/**
 * Upload an image to Vercel Blob when configured.
 * Local disk fallback only outside Vercel (dev without a Blob token).
 * On Vercel, missing BLOB_READ_WRITE_TOKEN fails with a clear error — never
 * write to the read-only serverless filesystem.
 */
export async function uploadImage(file: File, userId: string) {
  const ext = extensionFor(file.type);
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const pathname = `uploads/${safeUserId}-${Date.now()}.${ext}`;

  if (isBlobConfigured()) {
    const access = blobAccess();
    const blob = await put(pathname, file, {
      access,
      contentType: file.type,
      addRandomSuffix: true,
    });
    return { url: toAppMediaUrl(blob.url), blobUrl: blob.url };
  }

  if (isVercelRuntime() || process.env.NODE_ENV === "production") {
    throw new Error(
      "Stockage cloud non configuré. Sur Vercel : Storage → Blob → lier le store au projet (Production), vérifier BLOB_READ_WRITE_TOKEN, puis Redeploy."
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${safeUserId}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);
  return { url: `/uploads/${filename}` };
}

/** Stream a private blob through our API (auth optional — URL is unguessable). */
export async function fetchPrivateBlob(blobUrl: string) {
  if (!isBlobConfigured()) {
    throw new Error("Blob non configuré");
  }
  if (!isAllowedBlobUrl(blobUrl)) {
    throw new Error("URL blob invalide");
  }
  return get(blobUrl, { access: blobAccess() });
}

export function isAllowedBlobUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname.endsWith(".blob.vercel-storage.com") ||
        parsed.hostname.endsWith(".public.blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}

/** Absolute media URL for emails / Stripe (optional helper). */
export function absoluteMediaUrl(storedUrl: string) {
  if (storedUrl.startsWith("http://") || storedUrl.startsWith("https://")) {
    return storedUrl;
  }
  return `${getAppUrl()}${storedUrl.startsWith("/") ? "" : "/"}${storedUrl}`;
}
