import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const [
    users,
    trips,
    requests,
    bookings,
    reports,
    delivered,
    paymentsCaptured,
    feeAgg,
    kycVerified,
    openDisputesCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.trip.count(),
    prisma.parcelRequest.count(),
    prisma.booking.groupBy({ by: ["status"], _count: true }),
    prisma.report.count({ where: { resolved: false } }),
    prisma.booking.count({ where: { status: "DELIVERED" } }),
    prisma.payment.count({ where: { status: "CAPTURED" } }),
    prisma.payment.aggregate({
      where: { status: "CAPTURED" },
      _sum: { platformFeeCents: true, amountCadCents: true },
    }),
    prisma.user.count({ where: { kycStatus: "VERIFIED" } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
  ]);

  const openReports = await prisma.report.findMany({
    where: { resolved: false },
    include: {
      reporter: { select: { id: true, displayName: true, email: true } },
      targetUser: { select: { id: true, displayName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const openDisputes = await prisma.dispute.findMany({
    where: { status: { in: ["OPEN", "IN_REVIEW"] } },
    include: {
      openedBy: { select: { id: true, displayName: true, email: true } },
      againstUser: { select: { id: true, displayName: true, email: true } },
      booking: {
        select: {
          id: true,
          status: true,
          request: { select: { fromCity: true, toCity: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
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
      kycStatus: true,
      stripeConnectChargesEnabled: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
    },
  });

  const recentPayments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      booking: {
        select: {
          id: true,
          status: true,
          sender: { select: { displayName: true, email: true } },
          trip: {
            select: {
              fromCity: true,
              toCity: true,
              user: { select: { displayName: true, email: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    stats: {
      users,
      trips,
      requests,
      delivered,
      openReports: reports,
      openDisputes: openDisputesCount,
      bookingsByStatus: bookings,
      paymentsCaptured,
      kycVerified,
      platformFeesCadCents: feeAgg._sum.platformFeeCents ?? 0,
      volumeCadCents: feeAgg._sum.amountCadCents ?? 0,
    },
    openReports,
    openDisputes,
    users: allUsers,
    payments: recentPayments,
  });
}

const patchSchema = z.object({
  userId: z.string(),
  action: z.enum([
    "verify",
    "unverify",
    "suspend",
    "activate",
    "make_admin",
    "mark_kyc_verified",
  ]),
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
        ? {
            verifiedAt: new Date(),
            status: "ACTIVE" as const,
            kycStatus: "VERIFIED" as const,
            kycVerifiedAt: new Date(),
          }
        : body.action === "mark_kyc_verified"
          ? {
              kycStatus: "VERIFIED" as const,
              kycVerifiedAt: new Date(),
              verifiedAt: new Date(),
            }
          : body.action === "unverify"
            ? {
                verifiedAt: null,
                kycStatus: "NONE" as const,
                kycVerifiedAt: null,
              }
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
