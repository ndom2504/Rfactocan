import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  createIdentitySession,
  healVerifiedIdentity,
  refreshUserKycFromStripe,
} from "@/lib/kyc";
import {
  identityDocumentsAccepted,
  KYC_ENFORCEMENT_SUSPENDED,
  userSatisfiesKyc,
} from "@/lib/kyc-policy";
import { isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe n'est pas configuré. Ajoutez STRIPE_SECRET_KEY sur Vercel.",
      },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (userSatisfiesKyc(user)) {
    await healVerifiedIdentity(user.id);
    return NextResponse.json({
      alreadyVerified: true,
      kycStatus: "VERIFIED",
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
    console.error("KYC start error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de démarrer la vérification d'identité.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let stripeSync: Awaited<ReturnType<typeof refreshUserKycFromStripe>> = null;
  try {
    if (isStripeConfigured()) {
      stripeSync = await refreshUserKycFromStripe(session.id);
    }
  } catch (error) {
    console.error("KYC refresh error:", error);
  }

  await healVerifiedIdentity(session.id);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      kycStatus: true,
      kycVerifiedAt: true,
      verifiedAt: true,
      manualIdDocStatus: true,
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
    },
  });
  return NextResponse.json({
    user: user
      ? {
          ...user,
          identityVerified:
            KYC_ENFORCEMENT_SUSPENDED || identityDocumentsAccepted(user),
        }
      : user,
    kycHint: stripeSync?.hint ?? null,
    kycLastErrorCode: stripeSync?.lastErrorCode ?? null,
  });
}
