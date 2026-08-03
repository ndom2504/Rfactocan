/**
 * Community media upload from the browser.
 * Videos & larger files go direct to Vercel Blob (avoids ~4.5 MB serverless limit).
 * Small images/PDF can still use the classic FormData path.
 */

import { upload } from "@vercel/blob/client";
import {
  isVideoAttachment,
  type CommunityAttachment,
} from "@/lib/community";

const SERVER_FORM_SAFE_BYTES = 3.5 * 1024 * 1024;

type BlobAccess = "public" | "private";

type UploadConfig = {
  access: BlobAccess;
  blobConfigured: boolean;
  maxVideoBytes: number;
};

let cachedConfig: UploadConfig | null = null;

async function getUploadConfig(): Promise<UploadConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch("/api/community/upload", { method: "GET" });
    if (res.ok) {
      const data = (await res.json()) as Partial<UploadConfig>;
      cachedConfig = {
        access: data.access === "public" ? "public" : "private",
        blobConfigured: Boolean(data.blobConfigured),
        maxVideoBytes: Number(data.maxVideoBytes) || 25 * 1024 * 1024,
      };
      return cachedConfig;
    }
  } catch {
    /* fall through */
  }
  return {
    access: "private",
    blobConfigured: true,
    maxVideoBytes: 25 * 1024 * 1024,
  };
}

function toAppMediaUrl(blobUrl: string, access: BlobAccess) {
  if (access === "public") return blobUrl;
  return `/api/media?url=${encodeURIComponent(blobUrl)}`;
}

function safePathname(file: File) {
  const raw = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const name = raw.slice(0, 80) || "file";
  return `community/${Date.now()}-${name}`;
}

async function uploadViaFormData(file: File): Promise<CommunityAttachment> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/community/upload", {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Upload échoué");
  }
  return {
    url: data.url,
    name: data.name || file.name,
    contentType: data.contentType || file.type,
    size: data.size ?? file.size,
  };
}

async function uploadViaBlobDirect(file: File): Promise<CommunityAttachment> {
  const config = await getUploadConfig();
  if (!config.blobConfigured) {
    throw new Error(
      "Stockage cloud non configuré. Contactez l’admin (BLOB_READ_WRITE_TOKEN)."
    );
  }
  if (file.size > config.maxVideoBytes) {
    throw new Error(
      `Fichier trop volumineux (max ${Math.floor(config.maxVideoBytes / (1024 * 1024))} Mo). Compressez la vidéo.`
    );
  }

  const result = await upload(safePathname(file), file, {
    access: config.access,
    handleUploadUrl: "/api/community/upload",
    multipart: file.size > 4 * 1024 * 1024,
    contentType: file.type || undefined,
    clientPayload: JSON.stringify({
      contentType: file.type,
      size: file.size,
    }),
  });

  return {
    url: toAppMediaUrl(result.url, config.access),
    name: file.name.slice(0, 180),
    contentType: file.type || "application/octet-stream",
    size: file.size,
  };
}

/**
 * Pick the right path: direct Blob for videos / large files, FormData otherwise.
 */
export async function uploadCommunityAttachment(
  file: File
): Promise<CommunityAttachment> {
  const isVideo = isVideoAttachment(file.type, file.name);
  if (isVideo || file.size > SERVER_FORM_SAFE_BYTES) {
    try {
      return await uploadViaBlobDirect(file);
    } catch (e) {
      // If Blob client path fails (dev without token), try FormData only if small enough
      if (file.size <= SERVER_FORM_SAFE_BYTES) {
        return uploadViaFormData(file);
      }
      throw e;
    }
  }
  return uploadViaFormData(file);
}
