import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadBroadcastFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Type non autorisé (jpeg, png, webp, gif ou PDF)." },
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
    const uploaded = await uploadBroadcastFile(file, "admin-broadcast");
    return NextResponse.json({
      url: uploaded.url,
      name: file.name,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec de l'upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
