import { NextResponse } from "next/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/auth";
import {
  COMMUNITY_ALLOWED_DOCS,
  COMMUNITY_ALLOWED_IMAGES,
  COMMUNITY_ALLOWED_VIDEOS,
  COMMUNITY_MAX_VIDEO_BYTES,
  isAllowedCommunityContentType,
  maxBytesForCommunityContentType,
} from "@/lib/community";
import { blobAccess, isBlobConfigured } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Issue a short-lived Vercel Blob client token so mobile apps can PUT
 * large videos directly to Blob (bypass serverless body limit).
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }
  if (!isBlobConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stockage cloud non configuré sur le serveur. Activez Vercel Blob (BLOB_READ_WRITE_TOKEN) en Production, puis redéployez. Les vidéos > 4 Mo en ont besoin.",
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
    const contentType = (
      body.contentType || "application/octet-stream"
    )
      .toLowerCase()
      .split(";")[0]
      ?.trim() ?? "";

    if (!isAllowedCommunityContentType(contentType)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé." },
        { status: 400 }
      );
    }

    const max = maxBytesForCommunityContentType(contentType);
    const size = Number(body.size) || 0;
    if (size > max) {
      return NextResponse.json(
        {
          error: contentType.startsWith("video/")
            ? `Vidéo trop volumineuse (max ${Math.floor(max / (1024 * 1024))} Mo).`
            : `Fichier trop volumineux (max ${Math.floor(max / (1024 * 1024))} Mo).`,
        },
        { status: 400 }
      );
    }

    const rawName = (body.filename || "file").replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
    const ext = rawName.includes(".")
      ? rawName.slice(rawName.lastIndexOf("."))
      : contentType === "video/mp4"
        ? ".mp4"
        : contentType === "video/webm"
          ? ".webm"
          : contentType === "video/quicktime"
            ? ".mov"
            : "";
    const safeUser = session.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const pathname = `community/${safeUser}-${Date.now()}${ext}`;

    const allowed = [
      ...COMMUNITY_ALLOWED_IMAGES,
      ...COMMUNITY_ALLOWED_VIDEOS,
      ...COMMUNITY_ALLOWED_DOCS,
    ];

    const rwToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!rwToken) {
      return NextResponse.json(
        {
          error:
            "BLOB_READ_WRITE_TOKEN manquant (Production). Lier le store Vercel Blob au projet puis Redeploy.",
          code: "BLOB_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const token = await generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: allowed,
      maximumSizeInBytes: Math.min(max, COMMUNITY_MAX_VIDEO_BYTES),
      addRandomSuffix: true,
      validUntil: Date.now() + 60 * 60 * 1000,
      token: rwToken,
    });

    return NextResponse.json({
      token,
      pathname,
      access: blobAccess(),
      maxBytes: max,
    });
  } catch (error) {
    console.error("upload-token error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Impossible d’émettre le jeton.",
      },
      { status: 500 }
    );
  }
}
