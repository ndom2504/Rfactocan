import { getAppUrl } from "@/lib/app-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const KYC_ERROR_HINTS: Record<string, string> = {
  device_not_supported:
    "Caméra inaccessible ou permission refusée. Autorisez la caméra pour verify.stripe.com dans Chrome (Paramètres → Confidentialité → Caméra), ou utilisez Edge / votre téléphone.",
  consent_declined:
    "Vous avez refusé le consentement Stripe. Relancez la vérification et acceptez.",
  document_expired: "Le document est expiré. Utilisez une pièce valide.",
  document_type_not_allowed:
    "Type de document non accepté. Utilisez passeport, permis ou carte d'identité.",
  document_unverified_other:
    "Document illisible ou photo trop floue. Reprenez avec un bon éclairage, sans reflets.",
  selfie_unverified_other:
    "Selfie non reconnu. Reprenez face à la caméra, bon éclairage, sans lunettes solaires.",
  under_supported_age: "Âge insuffisant pour la vérification.",
  country_not_supported: "Pays du document non pris en charge par Stripe Identity.",
};

export function kycErrorMessage(code?: string | null, reason?: string | null) {
  if (code && KYC_ERROR_HINTS[code]) return KYC_ERROR_HINTS[code];
  if (reason) return reason;
  return null;
}

export async function createIdentitySession(userId: string, email: string) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe n'est pas configuré");
  }
  const stripe = getStripe();
  const appUrl = getAppUrl();

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Reuse an open session so the user can retry after a failed attempt.
    if (user?.kycSessionId) {
      const existing = await stripe.identity.verificationSessions.retrieve(
        user.kycSessionId
      );
      if (existing.status === "verified") {
        await syncIdentitySessionStatus(existing.id, "verified");
        return existing;
      }
      if (existing.status === "requires_input" && existing.url) {
        await prisma.user.update({
          where: { id: userId },
          data: { kycStatus: "REQUIRES_INPUT" },
        });
        return existing;
      }
    }

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

/** Pull latest status + last_error from Stripe for the current user session. */
export async function refreshUserKycFromStripe(userId: string) {
  if (!isStripeConfigured()) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.kycSessionId) return null;

  const stripe = getStripe();
  const session = await stripe.identity.verificationSessions.retrieve(
    user.kycSessionId
  );

  await syncIdentitySessionStatus(session.id, session.status);

  const lastError = session.last_error as
    | { code?: string; reason?: string }
    | null
    | undefined;

  return {
    status: session.status,
    lastErrorCode: lastError?.code ?? null,
    lastErrorReason: lastError?.reason ?? null,
    hint: kycErrorMessage(lastError?.code, lastError?.reason),
  };
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

  if (status === "processing") {
    return prisma.user.update({
      where: { id: user.id },
      data: { kycStatus: "PENDING" },
    });
  }

  return user;
}
