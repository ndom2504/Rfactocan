import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAmbassadorKpis } from "@/lib/ambassador-stats";
import { prisma } from "@/lib/prisma";

/** KPI Héraut Réseau (filleuls + volume réseau + estimation gains). */
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

  if (!me?.isAmbassador || me.kycStatus !== "VERIFIED" || !me.agentCode) {
    return NextResponse.json({ error: "Accès Héraut Réseau requis" }, { status: 403 });
  }

  const kpis = await getAmbassadorKpis(session.id);
  return NextResponse.json({ kpis });
}
