import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createIdentitySession } from "@/lib/kyc";
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
  if (user.kycStatus === "VERIFIED") {
    return NextResponse.json({
      alreadyVerified: true,
      kycStatus: user.kycStatus,
    });
  }

  try {
    const verification = await createIdentitySession(user.id, user.email);
    return NextResponse.json({
      url: verification.url,
      clientSecret: verification.client_secret,
      kycStatus: "PENDING",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de démarrer la vérification d'identité." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      kycStatus: true,
      kycVerifiedAt: true,
      verifiedAt: true,
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
    },
  });
  return NextResponse.json({ user });
}
