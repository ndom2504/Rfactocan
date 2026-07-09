import { getAppUrl } from "@/lib/app-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function createIdentitySession(userId: string, email: string) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe n'est pas configuré");
  }
  const stripe = getStripe();
  const appUrl = getAppUrl();

  try {
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      provided_details: { email },
      metadata: { userId },
      options: {
        document: {
          allowed_types: ["passport", "driving_license", "id_card"],
          require_matching_selfie: true,
        },
      },
      return_url: `${appUrl}/profile?kyc=return`,
    });

    if (!session.url) {
      throw new Error(
        "Stripe Identity n'a pas renvoyé d'URL. Activez Identity dans le Dashboard Stripe (Produits → Identity), puis réessayez."
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: "PENDING",
        kycSessionId: session.id,
      },
    });

    return session;
  } catch (error: unknown) {
    const stripeErr = error as {
      message?: string;
      raw?: { message?: string; code?: string };
      type?: string;
    };
    const message =
      stripeErr.raw?.message ||
      stripeErr.message ||
      "Erreur Stripe Identity inconnue";

    // Common live-mode blockers
    if (
      /identity/i.test(message) &&
      (/not enabled|not been activated|cannot create|permission/i.test(message) ||
        stripeErr.raw?.code === "identity_verification_unavailable")
    ) {
      throw new Error(
        "Stripe Identity n'est pas activé sur ce compte. Dashboard Stripe → Produits → Identity → Activer (mode live)."
      );
    }

    throw new Error(message);
  }
}

export async function syncIdentitySessionStatus(
  sessionId: string,
  status: string
) {
  const user = await prisma.user.findFirst({
    where: { kycSessionId: sessionId },
  });
  if (!user) return null;

  if (status === "verified") {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: "VERIFIED",
        kycVerifiedAt: new Date(),
        verifiedAt: new Date(),
      },
    });
  }

  if (status === "requires_input") {
    return prisma.user.update({
      where: { id: user.id },
      data: { kycStatus: "REQUIRES_INPUT" },
    });
  }

  if (status === "canceled") {
    return prisma.user.update({
      where: { id: user.id },
      data: { kycStatus: "FAILED" },
    });
  }

  return user;
}
