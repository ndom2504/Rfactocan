import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getWalletPayoutDestination,
  saveWalletPayoutDestination,
  selectPayoutFields,
  walletPayoutDestinationSchema,
} from "@/lib/wallet";
import { getHeraldAccruedBalanceCents } from "@/lib/herald-commissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const dest = await getWalletPayoutDestination(session.id);
  if (!dest) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const [balanceCents, recentWithdrawals] = await Promise.all([
    getHeraldAccruedBalanceCents(session.id).catch(() => 0),
    prisma.walletWithdrawal.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        channel: true,
        provider: true,
        destinationHint: true,
        createdAt: true,
        processedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    destination: dest,
    wallet: {
      heraldAccruedCents: balanceCents,
      recentWithdrawals,
    },
  });
}

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = walletPayoutDestinationSchema.parse(await request.json());
    const updated = await saveWalletPayoutDestination(session.id, body);
    return NextResponse.json({
      destination: selectPayoutFields(updated),
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Enregistrement impossible";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
