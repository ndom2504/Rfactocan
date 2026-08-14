import type { HeraldCommissionSource } from "@prisma/client";
import { travelerCanReceivePayments } from "@/lib/connect";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * Share of platform fee credited to Network Heralds (basis points).
 * Default 1000 = **10 %** of platform fee
 * (ex. fee 10 $ → commission 1 $).
 */
export function heraldRewardBps() {
  const raw = Number(process.env.AMBASSADOR_REWARD_BPS ?? "1000");
  if (!Number.isFinite(raw) || raw < 0) return 1000;
  return Math.min(Math.floor(raw), 10000);
}

/** Minimum accrued balance to allow a Connect payout (default 25.00). */
export function heraldPayoutMinCents() {
  const raw = Number(process.env.HERALD_PAYOUT_MIN_CENTS ?? "2500");
  if (!Number.isFinite(raw) || raw < 0) return 2500;
  return Math.floor(raw);
}

export function computeHeraldRewardCents(
  platformFeeCents: number,
  rewardBps = heraldRewardBps()
) {
  if (platformFeeCents <= 0 || rewardBps <= 0) return 0;
  return Math.floor((platformFeeCents * rewardBps) / 10000);
}

type AccrueInput = {
  sourceType: HeraldCommissionSource;
  sourceId: string;
  /** Users party to the paid transaction (sender, traveler, client, provider, buyer, seller…). */
  participantUserIds: string[];
  platformFeeCents: number;
  currency?: string | null;
};

/**
 * Option A: one commission per distinct active Héraut among participants' referrers.
 * Same Héraut on both sides → single line. Reward = platformFee × rewardBps (default 10 %).
 */
export async function accrueHeraldCommissions(
  input: AccrueInput
): Promise<{ created: number }> {
  const platformFeeCents = Math.max(0, Math.floor(input.platformFeeCents));
  const rewardBps = heraldRewardBps();
  const rewardCents = computeHeraldRewardCents(platformFeeCents, rewardBps);
  if (rewardCents < 1) return { created: 0 };

  const participantIds = [
    ...new Set(input.participantUserIds.filter(Boolean)),
  ];
  if (participantIds.length === 0) return { created: 0 };

  const participants = await prisma.user.findMany({
    where: { id: { in: participantIds } },
    select: { id: true, referredById: true },
  });

  /** heraldId → one referral user id that generated the right */
  const heraldToReferral = new Map<string, string>();
  for (const p of participants) {
    if (!p.referredById) continue;
    if (!heraldToReferral.has(p.referredById)) {
      heraldToReferral.set(p.referredById, p.id);
    }
  }
  if (heraldToReferral.size === 0) return { created: 0 };

  const heraldIds = [...heraldToReferral.keys()];
  const activeHeralds = await prisma.user.findMany({
    where: {
      id: { in: heraldIds },
      isAmbassador: true,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (activeHeralds.length === 0) return { created: 0 };

  const currency = (input.currency ?? "cad").toLowerCase();
  let created = 0;

  for (const h of activeHeralds) {
    const referralUserId = heraldToReferral.get(h.id);
    if (!referralUserId) continue;
    try {
      await prisma.heraldCommission.create({
        data: {
          heraldId: h.id,
          referralUserId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          platformFeeCents,
          rewardBps,
          rewardCents,
          currency,
          status: "ACCRUED",
        },
      });
      created += 1;
    } catch (error) {
      // Unique (sourceType, sourceId, heraldId) — already accrued
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code !== "P2002") {
        console.error("Herald commission accrue failed", {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          heraldId: h.id,
          error,
        });
      }
    }
  }

  return { created };
}

export async function accrueForBookingPayment(bookingId: string) {
  const payment = await prisma.payment.findUnique({
    where: { bookingId },
    include: {
      booking: { select: { senderId: true, trip: { select: { userId: true } } } },
    },
  });
  if (!payment || payment.status !== "CAPTURED") return { created: 0 };
  return accrueHeraldCommissions({
    sourceType: "BOOKING",
    sourceId: bookingId,
    participantUserIds: [
      payment.booking.senderId,
      payment.booking.trip.userId,
    ],
    platformFeeCents: payment.platformFeeCents,
    currency: payment.currency,
  });
}

export async function accrueForServicePayment(paymentId: string) {
  const sp = await prisma.servicePaymentRequest.findUnique({
    where: { id: paymentId },
  });
  if (!sp || !["PAID", "DELIVERED", "FULFILLED"].includes(sp.status)) {
    return { created: 0 };
  }
  return accrueHeraldCommissions({
    sourceType: "SERVICE",
    sourceId: paymentId,
    participantUserIds: [sp.clientId, sp.providerId],
    platformFeeCents: sp.platformFeeCents,
    currency: sp.currency,
  });
}

export async function accrueForShopOrder(orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { shop: { select: { userId: true } } },
  });
  if (!order || (order.status !== "PAID" && order.status !== "FULFILLED")) {
    return { created: 0 };
  }
  return accrueHeraldCommissions({
    sourceType: "SHOP",
    sourceId: orderId,
    participantUserIds: [order.buyerId, order.shop.userId],
    platformFeeCents: order.platformFeeCents,
    currency: order.currency,
  });
}

export async function reverseHeraldCommissionsForSource(
  sourceType: HeraldCommissionSource,
  sourceId: string,
  note?: string
) {
  const result = await prisma.heraldCommission.updateMany({
    where: {
      sourceType,
      sourceId,
      status: { in: ["ACCRUED", "HELD"] },
    },
    data: {
      status: "REVERSED",
      reversedAt: new Date(),
      ...(note ? { note } : {}),
    },
  });
  return result.count;
}

export async function getHeraldAccruedBalanceCents(heraldId: string) {
  try {
    const agg = await prisma.heraldCommission.aggregate({
      where: { heraldId, status: "ACCRUED" },
      _sum: { rewardCents: true },
    });
    return agg._sum.rewardCents ?? 0;
  } catch (e) {
    console.error("getHeraldAccruedBalanceCents failed:", e);
    return 0;
  }
}

export type HeraldPayoutResult =
  | {
      ok: true;
      amountCents: number;
      payoutId: string;
      stripeTransferId: string | null;
      commissionCount: number;
      skipped?: false;
    }
  | {
      ok: true;
      skipped: true;
      reason: string;
      amountCents: number;
    }
  | { ok: false; error: string; amountCents?: number };

/**
 * Pays out all ACCRUED commissions to the Héraut's Stripe Connect account.
 * Prefer admin/cron; enforces min threshold unless force=true.
 */
export async function payoutHeraldAccrued(
  heraldId: string,
  opts?: { force?: boolean; note?: string }
): Promise<HeraldPayoutResult> {
  const herald = await prisma.user.findUnique({
    where: { id: heraldId },
    select: {
      id: true,
      isAmbassador: true,
      kycStatus: true,
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
      preferredCurrency: true,
    },
  });

  if (!herald?.isAmbassador) {
    return { ok: false, error: "Utilisateur non Héraut Réseau actif." };
  }
  if (herald.kycStatus !== "VERIFIED") {
    return { ok: false, error: "KYC du Héraut non validé." };
  }
  if (
    !travelerCanReceivePayments(herald) ||
    !herald.stripeConnectAccountId
  ) {
    return {
      ok: false,
      error: "Stripe Connect du Héraut non actif (paiements + virements).",
    };
  }
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe non configuré." };
  }

  const lines = await prisma.heraldCommission.findMany({
    where: { heraldId, status: "ACCRUED" },
    orderBy: { createdAt: "asc" },
  });
  const amountCents = lines.reduce((s, l) => s + l.rewardCents, 0);
  if (lines.length === 0 || amountCents < 1) {
    return {
      ok: true,
      skipped: true,
      reason: "Aucune commission accrue.",
      amountCents: 0,
    };
  }

  const minCents = heraldPayoutMinCents();
  if (!opts?.force && amountCents < minCents) {
    return {
      ok: true,
      skipped: true,
      reason: `Solde sous le seuil de payout (${minCents} cents).`,
      amountCents,
    };
  }

  const currency = (lines[0]?.currency ?? "cad").toLowerCase();
  const stripe = getStripe();

  let transferId: string | null = null;
  try {
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency,
      destination: herald.stripeConnectAccountId,
      metadata: {
        type: "herald_commission_payout",
        heraldId,
        commissionCount: String(lines.length),
      },
      description: `Rfacto — commissions Héraut Réseau (${lines.length} lignes)`,
    });
    transferId = transfer.id;
  } catch (error) {
    console.error("Herald payout transfer failed", heraldId, error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Échec du transfer Stripe vers le Héraut.",
      amountCents,
    };
  }

  const ids = lines.map((l) => l.id);
  const now = new Date();

  const payout = await prisma.$transaction(async (tx) => {
    const p = await tx.heraldPayout.create({
      data: {
        heraldId,
        amountCents,
        currency,
        stripeTransferId: transferId,
        status: "PAID",
        note: opts?.note ?? null,
      },
    });
    await tx.heraldCommission.updateMany({
      where: { id: { in: ids }, status: "ACCRUED" },
      data: {
        status: "PAID",
        paidAt: now,
        stripeTransferId: transferId,
        payoutId: p.id,
      },
    });
    return p;
  });

  return {
    ok: true,
    amountCents,
    payoutId: payout.id,
    stripeTransferId: transferId,
    commissionCount: lines.length,
  };
}
