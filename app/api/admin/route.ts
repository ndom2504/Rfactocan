import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const [users, trips, requests, bookings, reports, revenueProxy] =
    await Promise.all([
      prisma.user.count(),
      prisma.trip.count(),
      prisma.parcelRequest.count(),
      prisma.booking.groupBy({ by: ["status"], _count: true }),
      prisma.report.count({ where: { resolved: false } }),
      prisma.booking.count({ where: { status: "DELIVERED" } }),
    ]);

  const pendingUsers = await prisma.user.findMany({
    where: { verifiedAt: null, status: { not: "SUSPENDED" } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
      createdAt: true,
      ratingAvg: true,
    },
  });

  const openReports = await prisma.report.findMany({
    where: { resolved: false },
    include: {
      reporter: { select: { id: true, displayName: true, email: true } },
      targetUser: { select: { id: true, displayName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const allUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
      verifiedAt: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    stats: {
      users,
      trips,
      requests,
      delivered: revenueProxy,
      openReports: reports,
      bookingsByStatus: bookings,
    },
    pendingUsers,
    openReports,
    users: allUsers,
  });
}

const patchSchema = z.object({
  userId: z.string(),
  action: z.enum(["verify", "unverify", "suspend", "activate", "make_admin"]),
});

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const data =
      body.action === "verify"
        ? { verifiedAt: new Date(), status: "ACTIVE" as const }
        : body.action === "unverify"
          ? { verifiedAt: null }
          : body.action === "suspend"
            ? { status: "SUSPENDED" as const }
            : body.action === "activate"
              ? { status: "ACTIVE" as const }
              : { role: "ADMIN" as const };

    const user = await prisma.user.update({
      where: { id: body.userId },
      data,
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
