import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateAgentCode,
  inviteUrlForCode,
} from "@/lib/ambassador";
import { getSessionUser } from "@/lib/auth";
import { emailAmbassadorInvite } from "@/lib/email";
import { expireBookingPayment } from "@/lib/payments/expiry";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const letterRaw = (searchParams.get("letter") ?? "").trim().toUpperCase();
  const letter =
    letterRaw.length === 1 && /[A-Z]/.test(letterRaw) ? letterRaw : null;
  const q = (searchParams.get("q") ?? "").trim();
  const fromRaw = (searchParams.get("from") ?? "").trim();
  const toRaw = (searchParams.get("to") ?? "").trim();

  function parseDayStart(raw: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const d = new Date(`${raw}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  function parseDayEnd(raw: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const d = new Date(`${raw}T23:59:59.999Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const fromDate = parseDayStart(fromRaw);
  const toDate = parseDayEnd(toRaw);

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
    servicesTotal,
    servicesOpen,
    servicesClosed,
    serviceProviders,
    shopsOpen,
    shopOrdersPaid,
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
    prisma.serviceListing.count(),
    prisma.serviceListing.count({ where: { status: "OPEN" } }),
    prisma.serviceListing.count({ where: { status: "CLOSED" } }),
    prisma.serviceListing
      .findMany({
        distinct: ["userId"],
        select: { userId: true },
      })
      .then((rows) => rows.length),
    prisma.shop.count({ where: { status: "OPEN" } }),
    prisma.shopOrder.count({
      where: { status: { in: ["PAID", "FULFILLED"] } },
    }),
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

  const userWhere = {
    AND: [
      ...(letter
        ? [
            {
              displayName: {
                startsWith: letter,
                mode: "insensitive" as const,
              },
            },
          ]
        : []),
      ...(q
        ? [
            {
              OR: [
                {
                  displayName: { contains: q, mode: "insensitive" as const },
                },
                { email: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
      ...(fromDate || toDate
        ? [
            {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            },
          ]
        : []),
    ],
  };

  const allUsersRaw = await prisma.user.findMany({
    where: userWhere,
    orderBy: [{ displayName: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
      verifiedAt: true,
      kycStatus: true,
      manualIdDocUrl: true,
      manualIdDocStatus: true,
      manualIdDocUploadedAt: true,
      manualIdDocNote: true,
      stripeConnectChargesEnabled: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
      isAmbassador: true,
      agentCode: true,
      ambassadorRequestStatus: true,
      ambassadorWhatsapp: true,
      ambassadorRequestedAt: true,
      _count: { select: { referrals: true } },
    },
  });

  const allUsers = allUsersRaw.map(({ manualIdDocUrl, ...u }) => ({
    ...u,
    hasManualIdDoc: Boolean(manualIdDocUrl),
  }));

  const pendingManualIdsRaw = await prisma.user.findMany({
    where: {
      AND: [
        { manualIdDocUrl: { not: null } },
        {
          OR: [
            { manualIdDocStatus: "SUBMITTED" },
            { manualIdDocStatus: "REJECTED" },
            { kycStatus: "REQUIRES_INPUT" },
            { kycStatus: "PENDING" },
            { kycStatus: "FAILED" },
          ],
        },
      ],
    },
    orderBy: { manualIdDocUploadedAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
      kycStatus: true,
      manualIdDocUrl: true,
      manualIdDocStatus: true,
      manualIdDocUploadedAt: true,
      manualIdDocNote: true,
      isAmbassador: true,
      agentCode: true,
      ambassadorRequestStatus: true,
      ambassadorWhatsapp: true,
      createdAt: true,
    },
  });

  const pendingManualIds = pendingManualIdsRaw.map(
    ({ manualIdDocUrl, ...u }) => ({
      ...u,
      hasManualIdDoc: Boolean(manualIdDocUrl),
    })
  );

  const pendingAmbassadorRequests = await prisma.user.findMany({
    where: {
      ambassadorRequestStatus: "PENDING",
      isAmbassador: false,
    },
    orderBy: { ambassadorRequestedAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
      kycStatus: true,
      ambassadorWhatsapp: true,
      ambassadorRequestedAt: true,
      ambassadorRequestStatus: true,
      createdAt: true,
    },
  });

  const usersMatching = await prisma.user.count({ where: userWhere });

  const recentPayments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      booking: {
        select: {
          id: true,
          status: true,
          paymentExpiresAt: true,
          cancelledReason: true,
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

  const pendingOffers = await prisma.booking.findMany({
    where: { status: { in: ["PROPOSED", "AWAITING_PAYMENT"] } },
    orderBy: { updatedAt: "desc" },
    take: 40,
    include: {
      payment: true,
      sender: { select: { id: true, displayName: true, email: true } },
      request: {
        select: {
          id: true,
          status: true,
          fromCity: true,
          toCity: true,
          weightKg: true,
        },
      },
      trip: {
        select: {
          id: true,
          fromCity: true,
          toCity: true,
          user: { select: { id: true, displayName: true, email: true } },
        },
      },
    },
  });

  const servicesByCategoryRaw = await prisma.serviceListing.groupBy({
    by: ["category"],
    where: { status: "OPEN" },
    _count: { _all: true },
  });
  const servicesByCategory = servicesByCategoryRaw
    .map((row) => ({
      category: row.category,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

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
      pendingOffers: pendingOffers.length,
      services: servicesTotal,
      servicesOpen,
      servicesClosed,
      serviceProviders,
      servicesByCategory,
      shopsOpen,
      shopOrdersPaid,
    },
    openReports,
    openDisputes,
    users: allUsers,
    pendingManualIds,
    pendingAmbassadorRequests,
    usersMatching,
    usersFilter: {
      letter,
      q,
      from: fromDate ? fromRaw : null,
      to: toDate ? toRaw : null,
    },
    payments: recentPayments,
    pendingOffers,
  });
}

const userPatchSchema = z.object({
  action: z.enum([
    "verify",
    "unverify",
    "suspend",
    "activate",
    "make_admin",
    "mark_kyc_verified",
    "reject_manual_id",
    "promote_ambassador",
    "revoke_ambassador",
    "email_ambassador_invite",
    "reject_ambassador_request",
  ]),
  userId: z.string(),
  note: z.string().max(500).optional(),
});

const bookingPatchSchema = z.object({
  action: z.literal("cancel_booking"),
  bookingId: z.string(),
  reason: z.enum(["ADMIN_CHARTER"]).default("ADMIN_CHARTER"),
});

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  try {
    const raw = await request.json();

    if (raw.action === "cancel_booking") {
      const body = bookingPatchSchema.parse(raw);
      const existing = await prisma.booking.findUnique({
        where: { id: body.bookingId },
        select: { id: true, status: true },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Réservation introuvable" },
          { status: 404 }
        );
      }
      if (!["PROPOSED", "AWAITING_PAYMENT"].includes(existing.status)) {
        return NextResponse.json(
          {
            error:
              "Seules les offres proposées ou en attente de paiement peuvent être annulées.",
          },
          { status: 400 }
        );
      }
      const booking = await expireBookingPayment(
        body.bookingId,
        body.reason,
        session.id
      );
      return NextResponse.json({ booking });
    }

    const body = userPatchSchema.parse(raw);

    if (body.action === "promote_ambassador") {
      const existing = await prisma.user.findUnique({
        where: { id: body.userId },
        select: {
          id: true,
          agentCode: true,
          isAmbassador: true,
          _count: { select: { referrals: true } },
        },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Utilisateur introuvable" },
          { status: 404 }
        );
      }
      const agentCode = existing.agentCode ?? (await generateAgentCode());
      const user = await prisma.user.update({
        where: { id: body.userId },
        data: {
          isAmbassador: true,
          agentCode,
          ambassadorRequestStatus: "NONE",
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          isAmbassador: true,
          agentCode: true,
          ambassadorWhatsapp: true,
          ambassadorRequestStatus: true,
          _count: { select: { referrals: true } },
        },
      });
      return NextResponse.json({
        user,
        agentCode: user.agentCode,
        inviteUrl: inviteUrlForCode(user.agentCode!),
        referralCount: user._count.referrals,
      });
    }

    if (body.action === "reject_ambassador_request") {
      const user = await prisma.user.update({
        where: { id: body.userId },
        data: {
          ambassadorRequestStatus: "REJECTED",
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          ambassadorRequestStatus: true,
          ambassadorWhatsapp: true,
        },
      });
      return NextResponse.json({ user });
    }

    if (body.action === "revoke_ambassador") {
      const user = await prisma.user.update({
        where: { id: body.userId },
        data: { isAmbassador: false },
        select: {
          id: true,
          displayName: true,
          email: true,
          isAmbassador: true,
          agentCode: true,
          _count: { select: { referrals: true } },
        },
      });
      return NextResponse.json({
        user,
        agentCode: user.agentCode,
        inviteUrl: user.agentCode ? inviteUrlForCode(user.agentCode) : null,
        referralCount: user._count.referrals,
      });
    }

    if (body.action === "email_ambassador_invite") {
      const user = await prisma.user.findUnique({
        where: { id: body.userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          isAmbassador: true,
          agentCode: true,
        },
      });
      if (!user) {
        return NextResponse.json(
          { error: "Utilisateur introuvable" },
          { status: 404 }
        );
      }
      if (!user.isAmbassador || !user.agentCode) {
        return NextResponse.json(
          {
            error:
              "Cet utilisateur n'est pas ambassadeur actif (nommez-le d'abord).",
          },
          { status: 400 }
        );
      }
      const inviteUrl = inviteUrlForCode(user.agentCode);
      const sent = await emailAmbassadorInvite({
        email: user.email,
        displayName: user.displayName,
        agentCode: user.agentCode,
        inviteUrl,
      });
      if (!sent.ok) {
        if ("skipped" in sent && sent.skipped) {
          return NextResponse.json(
            { error: sent.reason || "Email non configuré (RESEND_API_KEY)." },
            { status: 503 }
          );
        }
        return NextResponse.json(
          {
            error:
              ("error" in sent ? sent.error : null) ||
              "Échec de l'envoi de l'email.",
            code: "code" in sent ? sent.code : undefined,
          },
          { status: 502 }
        );
      }
      return NextResponse.json({
        ok: true,
        emailId: sent.id,
        email: user.email,
        agentCode: user.agentCode,
        inviteUrl,
      });
    }

    if (body.action === "reject_manual_id") {
      const user = await prisma.user.update({
        where: { id: body.userId },
        data: {
          manualIdDocStatus: "REJECTED",
          manualIdDocNote: body.note?.trim() || "Pièce refusée par l'admin",
          kycStatus: "REQUIRES_INPUT",
        },
      });
      return NextResponse.json({ user });
    }

    const data =
      body.action === "verify"
        ? {
            verifiedAt: new Date(),
            status: "ACTIVE" as const,
            kycStatus: "VERIFIED" as const,
            kycVerifiedAt: new Date(),
            manualIdDocStatus: "APPROVED" as const,
          }
        : body.action === "mark_kyc_verified"
          ? {
              kycStatus: "VERIFIED" as const,
              kycVerifiedAt: new Date(),
              verifiedAt: new Date(),
              manualIdDocStatus: "APPROVED" as const,
            }
          : body.action === "unverify"
            ? {
                verifiedAt: null,
                kycStatus: "NONE" as const,
                kycVerifiedAt: null,
                manualIdDocStatus: "NONE" as const,
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
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
