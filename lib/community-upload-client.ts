/**
 * Community media upload from the browser.
 * Prefer Cloudflare R2 (presigned PUT) when configured — works when Vercel Blob
 * quota is exhausted. Falls back to Vercel Blob client upload, then FormData.
 */

import { upload } from "@vercel/blob/client";
import {
  isVideoAttachment,
  maxBytesForCommunityContentType,
  type CommunityAttachment,
} from "@/lib/community";

const SERVER_FORM_SAFE_BYTES = 3.5 * 1024 * 1024;

type BlobAccess = "public" | "private";

type UploadConfig = {
  access: BlobAccess;
  blobConfigured: boolean;
  r2Configured: boolean;
  storageProvider: "r2" | "blob" | "none";
  maxVideoBytes: number;
};

let cachedConfig: UploadConfig | null = null;

async function getUploadConfig(): Promise<UploadConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch("/api/community/upload", { method: "GET" });
    if (res.ok) {
      const data = (await res.json()) as Partial<UploadConfig> & {
        storageProvider?: string;
      };
      cachedConfig = {
        access: data.access === "public" ? "public" : "private",
        blobConfigured: Boolean(data.blobConfigured),
        r2Configured: Boolean(data.r2Configured),
        storageProvider:
          data.storageProvider === "r2" || data.storageProvider === "blob"
            ? data.storageProvider
            : data.r2Configured
              ? "r2"
              : data.blobConfigured
                ? "blob"
                : "none",
        maxVideoBytes: Number(data.maxVideoBytes) || 500 * 1024 * 1024,
      };
      return cachedConfig;
    }
  } catch {
    /* fall through */
  }
  return {
    access: "private",
    blobConfigured: true,
    r2Configured: false,
    storageProvider: "blob",
    maxVideoBytes: 500 * 1024 * 1024,
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

async function uploadViaR2Presign(file: File): Promise<CommunityAttachment> {
  const config = await getUploadConfig();
  if (file.size > config.maxVideoBytes) {
    throw new Error(
      `Fichier trop volumineux (max ${Math.floor(config.maxVideoBytes / (1024 * 1024))} Mo). Compressez la vidéo.`
    );
  }
  const typeMax = maxBytesForCommunityContentType(file.type);
  if (file.size > typeMax) {
    throw new Error(
      `Fichier trop volumineux (max ${Math.floor(typeMax / (1024 * 1024))} Mo).`
    );
  }

  const res = await fetch("/api/community/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: file.type || "application/octet-stream",
      size: file.size,
      fileName: file.name,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Échec du pré-signage R2");
  }

  const put = await fetch(data.uploadUrl as string, {
    method: "PUT",
    headers: {
      "Content-Type":
        (data.headers?.["Content-Type"] as string) ||
        file.type ||
        "application/octet-stream",
    },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Upload R2 échoué (${put.status})`);
  }

  return {
    url: data.url as string,
    name: (data.name as string) || file.name,
    contentType: (data.contentType as string) || file.type,
    size: file.size,
  };
}

async function uploadViaBlobDirect(file: File): Promise<CommunityAttachment> {
  const config = await getUploadConfig();
  if (!config.blobConfigured && !config.r2Configured) {
    throw new Error(
      "Stockage cloud non configuré. Contactez l’admin (R2_* ou BLOB_READ_WRITE_TOKEN)."
    );
  }
  if (file.size > config.maxVideoBytes) {
    throw new Error(
      `Fichier trop volumineux (max ${Math.floor(config.maxVideoBytes / (1024 * 1024))} Mo). Compressez la vidéo.`
    );
  }
  const typeMax = maxBytesForCommunityContentType(file.type);
  if (file.size > typeMax) {
    throw new Error(
      `Fichier trop volumineux (max ${Math.floor(typeMax / (1024 * 1024))} Mo).`
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
 * Pick the right path: R2 → Blob direct → FormData.
 */
export async function uploadCommunityAttachment(
  file: File
): Promise<CommunityAttachment> {
  const config = await getUploadConfig();
  const isVideo = isVideoAttachment(file.type, file.name);
  const needsDirect = isVideo || file.size > SERVER_FORM_SAFE_BYTES;

  if (config.storageProvider === "r2" || config.r2Configured) {
    if (needsDirect) {
      return uploadViaR2Presign(file);
    }
    try {
      return await uploadViaFormData(file);
    } catch {
      return uploadViaR2Presign(file);
    }
  }

  if (needsDirect) {
    try {
      return await uploadViaBlobDirect(file);
    } catch (e) {
      if (file.size <= SERVER_FORM_SAFE_BYTES) {
        return uploadViaFormData(file);
      }
      throw e;
    }
  }
  return uploadViaFormData(file);
}
