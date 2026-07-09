import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

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
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    });
    return { url: blob.url };
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
