import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAmbassadorKpis } from "@/lib/ambassador-stats";
import { prisma } from "@/lib/prisma";

/** KPI + solde commissions Héraut Réseau (ledger 10 % des frais plateforme). */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      isAmbassador: true,
      kycStatus: true,
      agentCode: true,
      _count: { select: { referrals: true } },
    },
  });

  if (!me?.isAmbassador || !me.agentCode) {
    return NextResponse.json(
      { error: "Accès Héraut Réseau requis" },
      { status: 403 }
    );
  }

  // KPIs visibles dès que Héraut + code agent (KYC requis seulement pour retirer)
  let kpis;
  try {
    kpis = await getAmbassadorKpis(session.id);
  } catch (e) {
    console.error("getAmbassadorKpis failed:", e);
    kpis = {
      referralCount: me._count.referrals,
      referralsKycVerified: 0,
      networkPaymentsCount: 0,
      networkVolumeCents: 0,
      networkPlatformFeeCents: 0,
      accruedRewardCents: 0,
      paidRewardCents: 0,
      estimatedRewardCents: 0,
      rewardBps: 1000,
      currency: "CAD",
    };
  }

  // Fallback count via relation if query path diverged
  if (
    typeof kpis.referralCount === "number" &&
    kpis.referralCount === 0 &&
    me._count.referrals > 0
  ) {
    kpis = { ...kpis, referralCount: me._count.referrals };
  }

  const recentCommissions = await prisma.heraldCommission
    .findMany({
      where: { heraldId: session.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        platformFeeCents: true,
        rewardBps: true,
        rewardCents: true,
        currency: true,
        status: true,
        createdAt: true,
        paidAt: true,
        referral: { select: { id: true, displayName: true } },
      },
    })
    .catch((e) => {
      console.error("Herald recent commissions failed:", e);
      return [];
    });

  return NextResponse.json({ kpis, recentCommissions });
}
