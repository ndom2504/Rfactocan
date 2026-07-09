import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  body: z.string().min(1).max(4000),
  attachmentUrl: z.string().url().optional().nullable(),
});

async function assertBookingAccess(bookingId: string, userId: string, isAdmin: boolean) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { trip: true },
  });
  if (!booking) return null;
  const ok =
    isAdmin || booking.senderId === userId || booking.trip.userId === userId;
  return ok ? booking : null;
}

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await params;
  const booking = await assertBookingAccess(
    id,
    session.id,
    session.role === "ADMIN"
  );
  if (!booking) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { bookingId: id },
    include: {
      sender: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const booking = await assertBookingAccess(
      id,
      session.id,
      session.role === "ADMIN"
    );
    if (!booking) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }
    if (["CANCELLED", "REFUSED"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Conversation fermée pour cette réservation." },
        { status: 400 }
      );
    }

    const body = schema.parse(await request.json());
    const message = await prisma.message.create({
      data: {
        bookingId: id,
        senderId: session.id,
        body: body.body,
        attachmentUrl: body.attachmentUrl ?? null,
      },
      include: {
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    await prisma.booking.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
