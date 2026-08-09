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
    },
  });

  if (!me?.isAmbassador || !me.agentCode) {
    return NextResponse.json(
      { error: "Accès Héraut Réseau requis" },
      { status: 403 }
    );
  }

  // KPIs visibles dès que Héraut + code agent (KYC requis seulement pour retirer)

  const [kpis, recentCommissions] = await Promise.all([
    getAmbassadorKpis(session.id),
    prisma.heraldCommission.findMany({
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
    }),
  ]);

  return NextResponse.json({ kpis, recentCommissions });
}
