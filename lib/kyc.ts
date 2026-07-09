import { getAppUrl } from "@/lib/app-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function createIdentitySession(userId: string, email: string) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe n'est pas configuré");
  }
  const stripe = getStripe();
  const appUrl = getAppUrl();

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    provided_details: { email },
    metadata: { userId },
    options: {
      document: {
        require_matching_selfie: true,
        require_live_capture: true,
      },
    },
    return_url: `${appUrl}/profile?kyc=return`,
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: "PENDING",
      kycSessionId: session.id,
    },
  });

  return session;
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
