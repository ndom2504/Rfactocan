import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateAgentCode,
  inviteUrlForCode,
} from "@/lib/ambassador";
import { getSessionUser } from "@/lib/auth";
import { emailAmbassadorInvite } from "@/lib/email";
import { expireBookingPayment, deletePendingBookingOffer } from "@/lib/payments/expiry";
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
    meetProfilesTotal,
    meetProfilesActive,
    meetBusiness,
    meetRomance,
    meetContactsPending,
    meetContactsAccepted,
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
    prisma.meetProfile.count().catch(() => 0),
    prisma.meetProfile.count({ where: { active: true } }).catch(() => 0),
    prisma.meetProfile
      .count({ where: { kind: "BUSINESS", active: true } })
      .catch(() => 0),
    prisma.meetProfile
      .count({ where: { kind: "ROMANCE", active: true } })
      .catch(() => 0),
    prisma.meetContact.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.meetContact.count({ where: { status: "ACCEPTED" } }).catch(() => 0),
  ]);

  const openReports = await prisma.report.findMany({
    where: { resolved: false },
    include: {
      reporter: { select: { id: true, displayName: true, email: true } },
      targetUser: { select: { id: true, displayName: true, email: true } },
      communityPost: {
        select: { id: true, title: true, body: true, status: true },
      },
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
        { manualIdDocStatus: "SUBMITTED" },
        // Stripe/admin KYC already done — no need to review a leftover upload
        { kycStatus: { not: "VERIFIED" } },
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

  const pendingWalletWithdrawals = await prisma.walletWithdrawal.findMany({
    where: { status: { in: ["REQUESTED", "APPROVED"] } },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          country: true,
          phone: true,
        },
      },
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

  let servicePaidCount = 0;
  let serviceFeeCents = 0;
  let serviceVolumeCents = 0;
  let recentServices: Array<{
    id: string;
    title: string;
    status: string;
    amountCents: number;
    platformFeeCents: number;
    currency: string;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    client: { displayName: string };
    provider: { displayName: string };
  }> = [];
  try {
    const [svcAgg, svcRows] = await Promise.all([
      prisma.servicePaymentRequest.aggregate({
        where: { status: "PAID" },
        _sum: { platformFeeCents: true, amountCents: true },
        _count: true,
      }),
      prisma.servicePaymentRequest.findMany({
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: {
          id: true,
          title: true,
          status: true,
          amountCents: true,
          platformFeeCents: true,
          currency: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,
          client: { select: { displayName: true } },
          provider: { select: { displayName: true } },
        },
      }),
    ]);
    servicePaidCount = svcAgg._count;
    serviceFeeCents = svcAgg._sum.platformFeeCents ?? 0;
    serviceVolumeCents = svcAgg._sum.amountCents ?? 0;
    recentServices = svcRows;
  } catch (e) {
    console.error("[admin] service payments KPI", e);
  }

  let shopPaidCount = 0;
  let shopFeeCents = 0;
  let shopVolumeCents = 0;
  let recentShops: Array<{
    id: string;
    status: string;
    amountCents: number;
    platformFeeCents: number;
    currency: string;
    createdAt: Date;
    buyer: { displayName: string };
    shop: { name: string };
    product: { name: string };
  }> = [];
  try {
    const [shopAgg, shopRows] = await Promise.all([
      prisma.shopOrder.aggregate({
        where: { status: { in: ["PAID", "FULFILLED"] } },
        _sum: { platformFeeCents: true, amountCents: true },
        _count: true,
      }),
      prisma.shopOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          amountCents: true,
          platformFeeCents: true,
          currency: true,
          createdAt: true,
          buyer: { select: { displayName: true } },
          shop: { select: { name: true } },
          product: { select: { name: true } },
        },
      }),
    ]);
    shopPaidCount = shopAgg._count;
    shopFeeCents = shopAgg._sum.platformFeeCents ?? 0;
    shopVolumeCents = shopAgg._sum.amountCents ?? 0;
    recentShops = shopRows;
  } catch (e) {
    console.error("[admin] shop orders KPI", e);
  }

  const activityPayments = [
    ...recentPayments.map((p) => ({
      id: p.id,
      kind: "booking" as const,
      status: p.status,
      amountCents: p.amountCadCents,
      platformFeeCents: p.platformFeeCents,
      currency: p.currency,
      createdAt: p.createdAt,
      title: `${p.booking.trip.fromCity} → ${p.booking.trip.toCity}`,
      payerName: p.booking.sender.displayName,
      payeeName: p.booking.trip.user.displayName,
    })),
    ...recentServices.map((p) => ({
      id: p.id,
      kind: "service" as const,
      status: p.status,
      amountCents: p.amountCents,
      platformFeeCents: p.platformFeeCents,
      currency: p.currency,
      createdAt: p.paidAt ?? p.updatedAt ?? p.createdAt,
      title: p.title,
      payerName: p.client.displayName,
      payeeName: p.provider.displayName,
    })),
    ...recentShops.map((p) => ({
      id: p.id,
      kind: "shop" as const,
      status: p.status,
      amountCents: p.amountCents,
      platformFeeCents: p.platformFeeCents,
      currency: p.currency,
      createdAt: p.createdAt,
      title: p.product.name,
      payerName: p.buyer.displayName,
      payeeName: p.shop.name,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 40);

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
      paymentsCaptured:
        paymentsCaptured + servicePaidCount + shopPaidCount,
      kycVerified,
      platformFeesCadCents:
        (feeAgg._sum.platformFeeCents ?? 0) + serviceFeeCents + shopFeeCents,
      volumeCadCents:
        (feeAgg._sum.amountCadCents ?? 0) +
        serviceVolumeCents +
        shopVolumeCents,
      bookingsCaptured: paymentsCaptured,
      servicePaymentsPaid: servicePaidCount,
      serviceFeesCadCents: serviceFeeCents,
      serviceVolumeCadCents: serviceVolumeCents,
      shopFeesCadCents: shopFeeCents,
      pendingOffers: pendingOffers.length,
      services: servicesTotal,
      servicesOpen,
      servicesClosed,
      serviceProviders,
      servicesByCategory,
      shopsOpen,
      shopOrdersPaid,
      meetProfilesTotal,
      meetProfilesActive,
      meetBusiness,
      meetRomance,
      meetContactsPending,
      meetContactsAccepted,
    },
    openReports,
    openDisputes,
    users: allUsers,
    pendingManualIds,
    pendingAmbassadorRequests,
    pendingWalletWithdrawals,
    usersMatching,
    usersFilter: {
      letter,
      q,
      from: fromDate ? fromRaw : null,
      to: toDate ? toRaw : null,
    },
    payments: activityPayments,
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
    "payout_herald_commissions",
    "complete_wallet_withdrawal",
  ]),
  userId: z.string().optional(),
  withdrawalId: z.string().optional(),
  note: z.string().max(500).optional(),
  /** Force payout under the minimum threshold */
  force: z.boolean().optional(),
  /** SENT | FAILED | CANCELLED for wallet withdrawals */
  mark: z.enum(["SENT", "FAILED", "CANCELLED"]).optional(),
});

const bookingPatchSchema = z.object({
  action: z.enum(["cancel_booking", "delete_booking"]),
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

    if (raw.action === "cancel_booking" || raw.action === "delete_booking") {
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
              "Seules les offres proposées ou en attente de paiement peuvent être traitées.",
          },
          { status: 400 }
        );
      }

      if (body.action === "delete_booking") {
        const result = await deletePendingBookingOffer(
          body.bookingId,
          session.id
        );
        if (!result || ("error" in result && result.error === "NOT_PENDING")) {
          return NextResponse.json(
            { error: "Cette offre ne peut pas être supprimée." },
            { status: 400 }
          );
        }
        return NextResponse.json({ ok: true, deletedId: body.bookingId });
      }

      const booking = await expireBookingPayment(
        body.bookingId,
        body.reason,
        session.id
      );
      return NextResponse.json({ booking });
    }

    const body = userPatchSchema.parse(raw);

    if (body.action === "complete_wallet_withdrawal") {
      if (!body.withdrawalId || !body.mark) {
        return NextResponse.json(
          { error: "withdrawalId et mark requis." },
          { status: 400 }
        );
      }
      const { adminCompleteWalletWithdrawal } = await import("@/lib/wallet");
      const result = await adminCompleteWalletWithdrawal(
        body.withdrawalId,
        session.id,
        { mark: body.mark, adminNote: body.note }
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, status: result.status });
    }

    if (!body.userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }
    const userId = body.userId;

    if (body.action === "promote_ambassador") {
      const existing = await prisma.user.findUnique({
        where: { id: userId },
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
        where: { id: userId },
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
        where: { id: userId },
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
        where: { id: userId },
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
        where: { id: userId },
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
              "Cet utilisateur n'est pas Héraut Réseau actif (nommez-le d'abord).",
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

    if (body.action === "payout_herald_commissions") {
      const { payoutHeraldAccrued } = await import("@/lib/herald-commissions");
      const result = await payoutHeraldAccrued(userId, {
        force: body.force ?? true,
        note: body.note?.trim() || "Admin payout",
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, amountCents: result.amountCents },
          { status: 400 }
        );
      }
      if ("skipped" in result && result.skipped) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: result.reason,
          amountCents: result.amountCents,
        });
      }
      return NextResponse.json({
        ok: true,
        amountCents: result.amountCents,
        payoutId: result.payoutId,
        stripeTransferId: result.stripeTransferId,
        commissionCount: result.commissionCount,
      });
    }

    if (body.action === "reject_manual_id") {
      const user = await prisma.user.update({
        where: { id: userId },
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
      where: { id: userId },
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
