import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAllowedPublicImageType } from "@/lib/image-mime";
import { uploadImage } from "@/lib/storage";

const MAX_SIZE = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!isAllowedPublicImageType(file.type, file.name)) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé (jpeg, png, webp, gif)." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 8 Mo)." },
      { status: 400 }
    );
  }

  try {
    const { url } = await uploadImage(file, session.id);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    const message =
      error instanceof Error ? error.message : "Échec de l'upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
