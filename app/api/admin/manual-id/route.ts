import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamStoredIdDoc } from "@/lib/manual-id-doc";

export const runtime = "nodejs";

/** Admin-only: view a user's manually uploaded ID document. */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { manualIdDocUrl: true },
  });
  if (!user?.manualIdDocUrl) {
    return NextResponse.json({ error: "Aucune pièce déposée" }, { status: 404 });
  }

  return streamStoredIdDoc(user.manualIdDocUrl);
}
