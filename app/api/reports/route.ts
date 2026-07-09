import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  targetUserId: z.string().min(1),
  reason: z.string().min(5).max(200),
  details: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    if (body.targetUserId === session.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous signaler vous-même." },
        { status: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.id,
        targetUserId: body.targetUserId,
        reason: body.reason,
        details: body.details,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = z
    .object({ reportId: z.string(), resolved: z.boolean() })
    .parse(await request.json());

  const report = await prisma.report.update({
    where: { id: body.reportId },
    data: { resolved: body.resolved },
  });

  return NextResponse.json({ report });
}
