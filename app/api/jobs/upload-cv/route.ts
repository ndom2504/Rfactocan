import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { uploadJobFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** CV upload for job seek profiles (PDF or image, max 5 Mo). */
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
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Type non autorisé (PDF, jpeg, png ou webp)." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "CV trop volumineux (max 5 Mo)." },
      { status: 400 }
    );
  }

  try {
    const { url } = await uploadJobFile(file, session.id);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("CV upload error:", error);
    const message =
      error instanceof Error ? error.message : "Échec de l'upload du CV.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
