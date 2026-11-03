import { get, put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getAppUrl } from "@/lib/app-url";
import {
  isAllowedR2Url,
  isR2Configured,
  uploadToR2,
} from "@/lib/r2";

function extensionFor(contentType: string) {
  const type = (contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (type === "image/jpeg") return "jpg";
  if (type === "audio/mp4" || type === "audio/mp4a-latm" || type === "audio/aac") {
    return "m4a";
  }
  if (type === "audio/mpeg") return "mp3";
  if (type === "audio/webm") return "webm";
  if (type === "video/quicktime") return "mov";
  if (type === "video/mp4") return "mp4";
  if (type === "video/webm") return "webm";
  const ext = type.split("/")[1] ?? "bin";
  return ext === "jpeg" ? "jpg" : ext;
}

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Prefer Cloudflare R2 when configured (temporary bypass when Blob quota is exhausted). */
export function isCloudStorageConfigured() {
  return isR2Configured() || isBlobConfigured();
}

export function activeStorageProvider(): "r2" | "blob" | "none" {
  if (isR2Configured()) return "r2";
  if (isBlobConfigured()) return "blob";
  return "none";
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

/** Vercel Blob store access — never flip this when R2 is enabled. */
export function vercelBlobAccess(): "private" | "public" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

/**
 * Access hint for *new* uploads / client helpers.
 * Existing private Vercel Blob URLs must keep using vercelBlobAccess() in /api/media.
 */
export function blobAccess(): "private" | "public" {
  if (isR2Configured()) return "public";
  return vercelBlobAccess();
}

function toAppMediaUrl(blobUrl: string) {
  if (isAllowedR2Url(blobUrl)) return blobUrl;
  if (vercelBlobAccess() === "public") return blobUrl;
  const encoded = encodeURIComponent(blobUrl);
  return `/api/media?url=${encoded}`;
}

/** Map a Vercel Blob URL to the URL stored in attachments JSON. */
export function toAppMediaUrlFromBlob(blobUrl: string) {
  return toAppMediaUrl(blobUrl);
}

/** URL the browser / iOS Image can actually load (private Blob → /api/media). */
export function toReadableMediaUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  if (isAllowedBlobUrl(trimmed)) return toAppMediaUrlFromBlob(trimmed);
  return trimmed;
}

/**
 * Upload a file to R2 (preferred) or Vercel Blob when configured.
 * Local disk fallback only outside Vercel (dev without cloud storage).
 */
async function uploadFile(
  file: File,
  userId: string,
  folder: "uploads" | "id-docs" | "community" | "jobs" | "broadcast"
) {
  const ext = extensionFor(file.type);
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const pathname = `${folder}/${safeUserId}-${Date.now()}.${ext}`;

  if (isR2Configured()) {
    const { url } = await uploadToR2(pathname, file, file.type);
    return { url, blobUrl: url };
  }

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
      "Stockage cloud saturé ou non configuré. Ajoutez Cloudflare R2 (R2_*) ou réactivez Vercel Blob."
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${safeUserId}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);
  return { url: `/${folder}/${filename}` };
}

export async function uploadImage(file: File, userId: string) {
  return uploadFile(file, userId, "uploads");
}

/** Private ID document (images or PDF). Prefer blobUrl for admin-only serving. */
export async function uploadIdDocument(file: File, userId: string) {
  return uploadFile(file, userId, "id-docs");
}

/** Community feed attachments (images, short videos or PDF business docs). */
export async function uploadCommunityFile(file: File, userId: string) {
  return uploadFile(file, userId, "community");
}

/** Job CV / job profile documents (PDF or image). */
export async function uploadJobFile(file: File, userId: string) {
  return uploadFile(file, userId, "jobs");
}

/** Admin broadcast attachments (images or PDF). */
export async function uploadBroadcastFile(file: File, userId: string) {
  return uploadFile(file, userId, "broadcast");
}

/** Stream a private blob through our API (auth optional — URL is unguessable). */
export async function fetchPrivateBlob(blobUrl: string) {
  if (!isBlobConfigured()) {
    throw new Error("Blob non configuré");
  }
  if (!isAllowedVercelBlobUrl(blobUrl)) {
    throw new Error("URL blob invalide");
  }
  return get(blobUrl, { access: vercelBlobAccess() });
}

function isAllowedVercelBlobUrl(url: string) {
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

export function isAllowedBlobUrl(url: string) {
  return isAllowedVercelBlobUrl(url) || isAllowedR2Url(url);
}

/** Absolute media URL for emails / Stripe (optional helper). */
export function absoluteMediaUrl(storedUrl: string) {
  if (storedUrl.startsWith("http://") || storedUrl.startsWith("https://")) {
    return storedUrl;
  }
  return `${getAppUrl()}${storedUrl.startsWith("/") ? "" : "/"}${storedUrl}`;
}
