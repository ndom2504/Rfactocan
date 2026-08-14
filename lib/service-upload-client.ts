/**
 * Service offer photo upload from the browser.
 * Large files go direct to Vercel Blob (avoids ~4.5 MB serverless limit).
 */

import { upload } from "@vercel/blob/client";
import {
  isAllowedServiceImageType,
  SERVICE_MAX_IMAGE_BYTES,
} from "@/lib/service-upload";

const SERVER_FORM_SAFE_BYTES = 3.5 * 1024 * 1024;

type BlobAccess = "public" | "private";

type UploadConfig = {
  access: BlobAccess;
  blobConfigured: boolean;
  maxBytes: number;
};

let cachedConfig: UploadConfig | null = null;

async function getUploadConfig(): Promise<UploadConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch("/api/services/upload", { method: "GET" });
    if (res.ok) {
      const data = (await res.json()) as Partial<UploadConfig>;
      cachedConfig = {
        access: data.access === "public" ? "public" : "private",
        blobConfigured: Boolean(data.blobConfigured),
        maxBytes: Number(data.maxBytes) || SERVICE_MAX_IMAGE_BYTES,
      };
      return cachedConfig;
    }
  } catch {
    /* fall through */
  }
  return {
    access: "private",
    blobConfigured: true,
    maxBytes: SERVICE_MAX_IMAGE_BYTES,
  };
}

function toAppMediaUrl(blobUrl: string, access: BlobAccess) {
  if (access === "public") return blobUrl;
  return `/api/media?url=${encodeURIComponent(blobUrl)}`;
}

function safePathname(file: File) {
  const raw = (file.name || "photo").replace(/[^a-zA-Z0-9._-]/g, "_");
  const name = raw.slice(0, 80) || "photo";
  return `uploads/${Date.now()}-${name}`;
}

async function uploadViaFormData(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/services/upload", {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Upload échoué");
  }
  return data.url as string;
}

async function uploadViaBlobDirect(file: File): Promise<string> {
  const config = await getUploadConfig();
  if (!config.blobConfigured) {
    throw new Error(
      "Stockage cloud non configuré. Contactez l’admin (BLOB_READ_WRITE_TOKEN)."
    );
  }
  if (file.size > config.maxBytes) {
    throw new Error(
      `Fichier trop volumineux (max ${Math.floor(config.maxBytes / (1024 * 1024))} Mo).`
    );
  }

  const result = await upload(safePathname(file), file, {
    access: config.access,
    handleUploadUrl: "/api/services/upload",
    multipart: file.size > 4 * 1024 * 1024,
    contentType: file.type || undefined,
    clientPayload: JSON.stringify({
      contentType: file.type,
      size: file.size,
    }),
  });

  return toAppMediaUrl(result.url, config.access);
}

/** Upload a service offer photo (jpeg, png, webp, gif — max 100 Mo). */
export async function uploadServicePhoto(file: File): Promise<string> {
  if (!isAllowedServiceImageType(file.type)) {
    throw new Error("Type de fichier non autorisé (jpeg, png, webp, gif).");
  }
  if (file.size > SERVICE_MAX_IMAGE_BYTES) {
    throw new Error(
      `Fichier trop volumineux (max ${Math.floor(SERVICE_MAX_IMAGE_BYTES / (1024 * 1024))} Mo).`
    );
  }

  if (file.size > SERVER_FORM_SAFE_BYTES) {
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
