import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/auth";
import {
  isAllowedServiceImageType,
  SERVICE_ALLOWED_IMAGES,
  SERVICE_MAX_IMAGE_BYTES,
} from "@/lib/service-upload";
import { blobAccess, isBlobConfigured, uploadImage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Service offer photo upload (max 100 Mo).
 * JSON: Vercel Blob client upload for large files.
 * multipart: small files through the server.
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    if (!isBlobConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stockage cloud non configuré (BLOB_READ_WRITE_TOKEN). Requis pour les photos > 4 Mo en production.",
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
              requestedType = meta.contentType || "";
              requestedSize = Number(meta.size) || 0;
            }
          } catch {
            /* ignore */
          }

          if (requestedType && !isAllowedServiceImageType(requestedType)) {
            throw new Error(
              "Type de fichier non autorisé (jpeg, png, webp, gif)."
            );
          }

          if (
            requestedSize > 0 &&
            requestedSize > SERVICE_MAX_IMAGE_BYTES
          ) {
            throw new Error(
              `Fichier trop volumineux (max ${Math.floor(SERVICE_MAX_IMAGE_BYTES / (1024 * 1024))} Mo).`
            );
          }

          return {
            allowedContentTypes: [...SERVICE_ALLOWED_IMAGES],
            maximumSizeInBytes: SERVICE_MAX_IMAGE_BYTES,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({
              userId: session.id,
              contentType: requestedType,
            }),
          };
        },
        onUploadCompleted: async () => {},
      });

      return NextResponse.json(result);
    } catch (error) {
      console.error("Service client upload error:", error);
      const message =
        error instanceof Error ? error.message : "Échec de l'upload.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  const type = (file.type || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (!isAllowedServiceImageType(type)) {
    return NextResponse.json(
      {
        error: "Type de fichier non autorisé (jpeg, png, webp, gif).",
      },
      { status: 400 }
    );
  }

  if (file.size > SERVICE_MAX_IMAGE_BYTES) {
    return NextResponse.json(
      {
        error: `Fichier trop volumineux (max ${Math.floor(SERVICE_MAX_IMAGE_BYTES / (1024 * 1024))} Mo).`,
      },
      { status: 400 }
    );
  }

  const VERCEL_BODY_SAFE = 4 * 1024 * 1024;
  if (file.size > VERCEL_BODY_SAFE) {
    return NextResponse.json(
      {
        error:
          "Fichier trop grand pour l’upload classique. Réessayez (l’app utilise l’upload direct). Max 100 Mo.",
        code: "USE_CLIENT_UPLOAD",
        access: blobAccess(),
      },
      { status: 413 }
    );
  }

  try {
    const { url } = await uploadImage(file, session.id);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Service upload error:", error);
    const message =
      error instanceof Error ? error.message : "Échec de l'upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    access: blobAccess(),
    maxBytes: SERVICE_MAX_IMAGE_BYTES,
    blobConfigured: isBlobConfigured(),
  });
}
