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
    servicesTotal,
    servicesOpen,
    servicesClosed,
    serviceProviders,
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
      isAmbassador: true,
      agentCode: true,
      _count: { select: { referrals: true } },
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
    },
    openReports,
    openDisputes,
    users: allUsers,
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
    "promote_ambassador",
    "revoke_ambassador",
    "email_ambassador_invite",
  ]),
  userId: z.string(),
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
        data: { isAmbassador: true, agentCode },
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
        inviteUrl: inviteUrlForCode(user.agentCode!),
        referralCount: user._count.referrals,
      });
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
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
