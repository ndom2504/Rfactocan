import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  isAllowedCommunityContentType,
  maxBytesForCommunityContentType,
  COMMUNITY_ALLOWED_IMAGES,
  COMMUNITY_ALLOWED_VIDEOS,
} from "@/lib/community";
import { uploadCommunityFile } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }

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
          "Fichier non autorisé. Images (jpeg, png, webp), vidéos (mp4, webm, mov) ou PDF — cadre affaires / opportunités / communauté.",
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
            ? "Vidéo trop volumineuse (max 25 Mo)."
            : "PDF trop volumineux (max 5 Mo).",
      },
      { status: 400 }
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
