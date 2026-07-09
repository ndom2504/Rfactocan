import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createConnectOnboardingLink, syncConnectAccount } from "@/lib/connect";
import { isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe n'est pas configuré sur ce serveur." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (user.kycStatus !== "VERIFIED") {
    return NextResponse.json(
      {
        error:
          "Vérifiez d'abord votre identité (KYC) avant d'activer les paiements.",
      },
      { status: 400 }
    );
  }

  try {
    const url = await createConnectOnboardingLink(user.id, user.email);
    return NextResponse.json({ url });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de créer le lien Connect." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  if (user.stripeConnectAccountId && isStripeConfigured()) {
    try {
      await syncConnectAccount(user.stripeConnectAccountId);
    } catch (error) {
      console.error(error);
    }
  }

  const refreshed = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      kycStatus: true,
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
    },
  });

  return NextResponse.json({ user: refreshed });
}
