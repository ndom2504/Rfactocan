import { NextResponse } from "next/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/auth";
import {
  isAllowedServiceImageType,
  SERVICE_ALLOWED_IMAGES,
  SERVICE_MAX_IMAGE_BYTES,
} from "@/lib/service-upload";
import { blobAccess, isBlobConfigured } from "@/lib/storage";

export const runtime = "nodejs";

/** Client token for direct Blob upload (Android / large service photos). */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!isBlobConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stockage cloud non configuré. Activez Vercel Blob (BLOB_READ_WRITE_TOKEN) en Production.",
        code: "BLOB_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as {
      filename?: string;
      contentType?: string;
      size?: number;
    };
    const contentType = (body.contentType || "application/octet-stream")
      .toLowerCase()
      .split(";")[0]
      ?.trim() ?? "";

    if (!isAllowedServiceImageType(contentType)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé (jpeg, png, webp, gif)." },
        { status: 400 }
      );
    }

    const size = Number(body.size) || 0;
    if (size > SERVICE_MAX_IMAGE_BYTES) {
      return NextResponse.json(
        {
          error: `Fichier trop volumineux (max ${Math.floor(SERVICE_MAX_IMAGE_BYTES / (1024 * 1024))} Mo).`,
        },
        { status: 400 }
      );
    }

    const rawName = (body.filename || "photo").replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = rawName.includes(".")
      ? rawName.slice(rawName.lastIndexOf("."))
      : contentType === "image/png"
        ? ".png"
        : contentType === "image/webp"
          ? ".webp"
          : contentType === "image/gif"
            ? ".gif"
            : ".jpg";
    const safeUser = session.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const pathname = `uploads/${safeUser}-${Date.now()}${ext}`;

    const rwToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!rwToken) {
      return NextResponse.json(
        {
          error: "BLOB_READ_WRITE_TOKEN manquant (Production).",
          code: "BLOB_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const token = await generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: [...SERVICE_ALLOWED_IMAGES],
      maximumSizeInBytes: SERVICE_MAX_IMAGE_BYTES,
      addRandomSuffix: true,
      validUntil: Date.now() + 60 * 60 * 1000,
      token: rwToken,
    });

    return NextResponse.json({
      token,
      pathname,
      access: blobAccess(),
      maxBytes: SERVICE_MAX_IMAGE_BYTES,
    });
  } catch (error) {
    console.error("service upload-token error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Impossible d’émettre le jeton.",
      },
      { status: 500 }
    );
  }
}
