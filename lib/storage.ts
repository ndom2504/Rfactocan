import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

function extensionFor(contentType: string) {
  const ext = contentType.split("/")[1] ?? "bin";
  return ext === "jpeg" ? "jpg" : ext;
}

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Upload an image to Vercel Blob when configured; otherwise fall back to
 * local `public/uploads` for local development without a Blob token.
 */
export async function uploadImage(file: File, userId: string) {
  const ext = extensionFor(file.type);
  const pathname = `uploads/${userId}-${Date.now()}.${ext}`;

  if (isBlobConfigured()) {
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${userId}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);
  return { url: `/uploads/${filename}` };
}
