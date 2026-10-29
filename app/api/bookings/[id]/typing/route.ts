import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { persistBookingTyping } from "@/lib/dm-typing";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  typing: z.boolean(),
});

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { senderId: true, trip: { select: { userId: true } } },
  });
  if (!booking) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }
  const ok =
    session.role === "ADMIN" ||
    booking.senderId === session.id ||
    booking.trip.userId === session.id;
  if (!ok) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  persistBookingTyping(id, session.id, parsed.data.typing);
  return NextResponse.json({ ok: true });
}
