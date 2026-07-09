import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId: session.id, readAt: null },
      }),
    ]);
    return NextResponse.json({ notifications: items, unread });
  } catch (error) {
    console.error("Notifications GET — run prisma/neon-notifications.sql?", error);
    return NextResponse.json({ notifications: [], unread: 0, pendingMigration: true });
  }
}

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = patchSchema.parse(await request.json().catch(() => ({})));
  const now = new Date();

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: session.id, readAt: null },
      data: { readAt: now },
    });
  } else if (body.ids?.length) {
    await prisma.notification.updateMany({
      where: { userId: session.id, id: { in: body.ids }, readAt: null },
      data: { readAt: now },
    });
  }

  return NextResponse.json({ ok: true });
}
