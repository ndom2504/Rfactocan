import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadIdDocument } from "@/lib/storage";
import { streamStoredIdDoc } from "@/lib/manual-id-doc";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

/** Upload a manual ID document for admin review (Stripe Identity fallback). */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { kycStatus: true },
  });
  if (!me) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (me.kycStatus === "VERIFIED") {
    return NextResponse.json(
      { error: "Identité déjà vérifiée." },
      { status: 400 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const noteRaw = form.get("note");
  const note =
    typeof noteRaw === "string" ? noteRaw.trim().slice(0, 500) : undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Type non autorisé (jpeg, png, webp ou PDF)." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 5 Mo)." },
      { status: 400 }
    );
  }

  try {
    const uploaded = await uploadIdDocument(file, session.id);
    const storedUrl =
      "blobUrl" in uploaded && uploaded.blobUrl
        ? uploaded.blobUrl
        : uploaded.url;

    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        manualIdDocUrl: storedUrl,
        manualIdDocStatus: "SUBMITTED",
        manualIdDocUploadedAt: new Date(),
        manualIdDocNote: note || null,
        kycStatus: me.kycStatus === "NONE" ? "PENDING" : me.kycStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      manualIdDocStatus: user.manualIdDocStatus,
      manualIdDocUploadedAt: user.manualIdDocUploadedAt,
      kycStatus: user.kycStatus,
    });
  } catch (error) {
    console.error("Manual ID upload error:", error);
    const message =
      error instanceof Error ? error.message : "Échec de l'envoi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Owner can preview their submitted document. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      manualIdDocUrl: true,
      manualIdDocStatus: true,
    },
  });
  if (!user?.manualIdDocUrl) {
    return NextResponse.json({ error: "Aucune pièce déposée" }, { status: 404 });
  }

  return streamStoredIdDoc(user.manualIdDocUrl);
}
