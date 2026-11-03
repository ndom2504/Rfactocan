import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  COMMUNITY_MAX_VIDEO_BYTES,
  isAllowedCommunityContentType,
  maxBytesForCommunityContentType,
} from "@/lib/community";
import { createR2PresignedPut, isR2Configured } from "@/lib/r2";

export const runtime = "nodejs";

const schema = z.object({
  contentType: z.string().min(3).max(120),
  size: z.number().int().positive().max(COMMUNITY_MAX_VIDEO_BYTES),
  fileName: z.string().max(180).optional(),
});

function extensionFor(contentType: string, fileName?: string) {
  const fromName = fileName?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const type = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (type === "image/jpeg") return "jpg";
  if (type === "video/quicktime") return "mov";
  return type.split("/")[1] || "bin";
}

/**
 * Presigned PUT to Cloudflare R2 for large uploads (videos / files > ~4 MB).
 * Used when Vercel Blob quota is exhausted.
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Stockage R2 non configuré." },
      { status: 503 }
    );
  }

  try {
    const body = schema.parse(await request.json());
    const type = body.contentType.toLowerCase().split(";")[0]?.trim() ?? "";
    if (!isAllowedCommunityContentType(type, body.fileName)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé." },
        { status: 400 }
      );
    }
    const max = maxBytesForCommunityContentType(type);
    if (body.size > max) {
      return NextResponse.json(
        {
          error: `Fichier trop volumineux (max ${Math.floor(max / (1024 * 1024))} Mo).`,
        },
        { status: 400 }
      );
    }

    const ext = extensionFor(type, body.fileName);
    const safeUser = session.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const pathname = `community/${safeUser}-${Date.now()}.${ext}`;
    const signed = await createR2PresignedPut(pathname, type);

    return NextResponse.json({
      uploadUrl: signed.uploadUrl,
      url: signed.publicUrl,
      headers: signed.headers,
      name: (body.fileName || `file.${ext}`).slice(0, 180),
      contentType: type,
      size: body.size,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Requête invalide" },
        { status: 400 }
      );
    }
    console.error("[presign]", error);
    return NextResponse.json({ error: "Échec du pré-signage" }, { status: 500 });
  }
}
