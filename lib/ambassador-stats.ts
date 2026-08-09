import { prisma } from "@/lib/prisma";
import {
  getHeraldAccruedBalanceCents,
  heraldRewardBps,
} from "@/lib/herald-commissions";

/** @deprecated use heraldRewardBps — default is now 10 % of platform fee. */
export function ambassadorRewardBps() {
  return heraldRewardBps();
}

export type AmbassadorKpis = {
  referralCount: number;
  referralsKycVerified: number;
  networkPaymentsCount: number;
  networkVolumeCents: number;
  networkPlatformFeeCents: number;
  /** Solde dû (ACCRUED) — ledger réel */
  accruedRewardCents: number;
  /** Déjà versé (PAID) */
  paidRewardCents: number;
  /**
   * Alias : total ledger (accrued + paid) pour affichage rétro-compatible.
   * Préférer accrued + paid séparément.
   */
  estimatedRewardCents: number;
  rewardBps: number;
  currency: string;
};

export async function getAmbassadorKpis(
  ambassadorId: string
): Promise<AmbassadorKpis> {
  const referrals = await prisma.user.findMany({
    where: { referredById: ambassadorId },
    select: { id: true, kycStatus: true },
  });
  const ids = referrals.map((r) => r.id);
  const referralCount = ids.length;
  const referralsKycVerified = referrals.filter(
    (r) => r.kycStatus === "VERIFIED"
  ).length;

  let networkVolumeCents = 0;
  let networkPlatformFeeCents = 0;
  let networkPaymentsCount = 0;

  if (ids.length > 0) {
    const [bookingAgg, serviceAgg, shopAgg] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: "CAPTURED",
          booking: {
            OR: [
              { senderId: { in: ids } },
              { trip: { userId: { in: ids } } },
            ],
          },
        },
        _sum: {
          amountCadCents: true,
          platformFeeCents: true,
        },
        _count: true,
      }),
      prisma.servicePaymentRequest.aggregate({
        where: {
          status: "PAID",
          OR: [{ clientId: { in: ids } }, { providerId: { in: ids } }],
        },
        _sum: {
          amountCents: true,
          platformFeeCents: true,
        },
        _count: true,
      }),
      prisma.shopOrder.aggregate({
        where: {
          status: { in: ["PAID", "FULFILLED"] },
          OR: [
            { buyerId: { in: ids } },
            { shop: { userId: { in: ids } } },
          ],
        },
        _sum: {
          amountCents: true,
          platformFeeCents: true,
        },
        _count: true,
      }),
    ]);

    networkVolumeCents =
      (bookingAgg._sum.amountCadCents ?? 0) +
      (serviceAgg._sum.amountCents ?? 0) +
      (shopAgg._sum.amountCents ?? 0);
    networkPlatformFeeCents =
      (bookingAgg._sum.platformFeeCents ?? 0) +
      (serviceAgg._sum.platformFeeCents ?? 0) +
      (shopAgg._sum.platformFeeCents ?? 0);
    networkPaymentsCount =
      bookingAgg._count + serviceAgg._count + shopAgg._count;
  }

  const [accruedRewardCents, paidAgg] = await Promise.all([
    getHeraldAccruedBalanceCents(ambassadorId),
    prisma.heraldCommission.aggregate({
      where: { heraldId: ambassadorId, status: "PAID" },
      _sum: { rewardCents: true },
    }),
  ]);
  const paidRewardCents = paidAgg._sum.rewardCents ?? 0;
  const rewardBps = heraldRewardBps();
  const estimatedRewardCents = accruedRewardCents + paidRewardCents;

  return {
    referralCount,
    referralsKycVerified,
    networkPaymentsCount,
    networkVolumeCents,
    networkPlatformFeeCents,
    accruedRewardCents,
    paidRewardCents,
    estimatedRewardCents,
    rewardBps,
    currency: "CAD",
  };
}
