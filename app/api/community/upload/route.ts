import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { uploadCommunityFile } from "@/lib/storage";

const MAX_IMAGE = 2 * 1024 * 1024;
const MAX_DOC = 5 * 1024 * 1024;
const ALLOWED_IMAGES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_DOCS = new Set(["application/pdf"]);

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

  const isImage = ALLOWED_IMAGES.has(file.type);
  const isDoc = ALLOWED_DOCS.has(file.type);
  if (!isImage && !isDoc) {
    return NextResponse.json(
      {
        error:
          "Fichier non autorisé. Images (jpeg, png, webp) ou PDF uniquement — cadre affaires / opportunités / communauté.",
      },
      { status: 400 }
    );
  }

  const max = isImage ? MAX_IMAGE : MAX_DOC;
  if (file.size > max) {
    return NextResponse.json(
      {
        error: isImage
          ? "Image trop volumineuse (max 2 Mo)."
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
      contentType: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error("Community upload error:", error);
    const message =
      error instanceof Error ? error.message : "Échec de l'upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
