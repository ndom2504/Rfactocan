import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/auth";
import {
  COMMUNITY_ALLOWED_DOCS,
  COMMUNITY_ALLOWED_IMAGES,
  COMMUNITY_ALLOWED_VIDEOS,
  COMMUNITY_MAX_VIDEO_BYTES,
  isAllowedCommunityContentType,
  maxBytesForCommunityContentType,
} from "@/lib/community";
import {
  blobAccess,
  isBlobConfigured,
  uploadCommunityFile,
} from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Community media upload.
 *
 * 1) JSON (Vercel Blob client upload) — videos / large files: browser/app talk
 *    directly to Blob storage (bypasses ~4.5 MB Vercel function body limit).
 * 2) multipart FormData — small files through the server (images / local dev).
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";

  // —— Client direct-to-Blob (handleUpload token exchange) ——
  if (contentType.includes("application/json")) {
    if (!isBlobConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stockage cloud non configuré (BLOB_READ_WRITE_TOKEN). Requis pour les vidéos en production.",
        },
        { status: 503 }
      );
    }

    try {
      const body = (await request.json()) as HandleUploadBody;
      const result = await handleUpload({
        request,
        body,
        onBeforeGenerateToken: async (_pathname, clientPayload) => {
          let requestedType = "";
          let requestedSize = 0;
          try {
            if (clientPayload) {
              const meta = JSON.parse(clientPayload) as {
                contentType?: string;
                size?: number;
              };
              requestedType = (
                meta.contentType || ""
              ).toLowerCase().split(";")[0]?.trim() ?? "";
              requestedSize = Number(meta.size) || 0;
            }
          } catch {
            /* ignore malformed payload */
          }

          if (
            requestedType &&
            !isAllowedCommunityContentType(requestedType)
          ) {
            throw new Error(
              "Type de fichier non autorisé (image, vidéo courte ou PDF)."
            );
          }

          const max =
            (requestedType &&
              maxBytesForCommunityContentType(requestedType)) ||
            COMMUNITY_MAX_VIDEO_BYTES;

          if (requestedSize > 0 && requestedSize > max) {
            throw new Error(
              requestedType.startsWith("video/")
                ? `Vidéo trop volumineuse (max ${Math.floor(max / (1024 * 1024))} Mo).`
                : `Fichier trop volumineux (max ${Math.floor(max / (1024 * 1024))} Mo).`
            );
          }

          const allowed = [
            ...COMMUNITY_ALLOWED_IMAGES,
            ...COMMUNITY_ALLOWED_VIDEOS,
            ...COMMUNITY_ALLOWED_DOCS,
          ];

          return {
            allowedContentTypes: allowed,
            maximumSizeInBytes: max,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({
              userId: session.id,
              contentType: requestedType,
            }),
          };
        },
        onUploadCompleted: async () => {
          // No DB write needed — client attaches URL to the post create payload.
        },
      });

      return NextResponse.json(result);
    } catch (error) {
      console.error("Community client upload error:", error);
      const message =
        error instanceof Error ? error.message : "Échec de l'upload.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  // —— Legacy multipart through the serverless function ——
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  const type = (file.type || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (!isAllowedCommunityContentType(type)) {
    return NextResponse.json(
      {
        error:
          "Fichier non autorisé. Images (jpeg, png, webp), vidéos (mp4, webm, mov) ou PDF.",
      },
      { status: 400 }
    );
  }

  const max = maxBytesForCommunityContentType(type);
  if (file.size > max) {
    const isImage = COMMUNITY_ALLOWED_IMAGES.has(type);
    const isVideo = COMMUNITY_ALLOWED_VIDEOS.has(type);
    return NextResponse.json(
      {
        error: isImage
          ? "Image trop volumineuse (max 2 Mo)."
          : isVideo
            ? `Vidéo trop volumineuse (max ${Math.floor(max / (1024 * 1024))} Mo).`
            : "PDF trop volumineux (max 5 Mo).",
      },
      { status: 400 }
    );
  }

  // Vercel serverless request body limit ~4.5 MB — refuse early with clear message.
  const VERCEL_BODY_SAFE = 4 * 1024 * 1024;
  if (file.size > VERCEL_BODY_SAFE) {
    return NextResponse.json(
      {
        error:
          "Fichier trop grand pour l’upload classique. Réessayez (l’app doit utiliser l’upload direct). Vidéos : max 100 Mo, ou compressez le clip.",
        code: "USE_CLIENT_UPLOAD",
        access: blobAccess(),
      },
      { status: 413 }
    );
  }

  try {
    const { url } = await uploadCommunityFile(file, session.id);
    return NextResponse.json({
      url,
      name: file.name.slice(0, 180),
      contentType: type || file.type,
      size: file.size,
    });
  } catch (error) {
    console.error("Community upload error:", error);
    const message =
      error instanceof Error ? error.message : "Échec de l'upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Public config so clients know access mode + limits (no secrets). */
export async function GET() {
  return NextResponse.json({
    access: blobAccess(),
    maxVideoBytes: COMMUNITY_MAX_VIDEO_BYTES,
    maxImageBytes: maxBytesForCommunityContentType("image/jpeg"),
    maxDocBytes: maxBytesForCommunityContentType("application/pdf"),
    blobConfigured: isBlobConfigured(),
  });
}
