import { prisma } from "@/lib/prisma";

/** Share of platform fee attributed as indicative ambassador reward (basis points). */
export function ambassadorRewardBps() {
  const raw = Number(process.env.AMBASSADOR_REWARD_BPS ?? "2000");
  if (!Number.isFinite(raw) || raw < 0) return 2000;
  return Math.min(raw, 10000);
}

export type AmbassadorKpis = {
  referralCount: number;
  referralsKycVerified: number;
  networkPaymentsCount: number;
  networkVolumeCents: number;
  networkPlatformFeeCents: number;
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
    const agg = await prisma.payment.aggregate({
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
    });
    networkVolumeCents = agg._sum.amountCadCents ?? 0;
    networkPlatformFeeCents = agg._sum.platformFeeCents ?? 0;
    networkPaymentsCount = agg._count;
  }

  const rewardBps = ambassadorRewardBps();
  const estimatedRewardCents = Math.floor(
    (networkPlatformFeeCents * rewardBps) / 10000
  );

  return {
    referralCount,
    referralsKycVerified,
    networkPaymentsCount,
    networkVolumeCents,
    networkPlatformFeeCents,
    estimatedRewardCents,
    rewardBps,
    currency: "CAD",
  };
}
