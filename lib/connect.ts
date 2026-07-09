import { getAppUrl } from "@/lib/app-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function createOrGetConnectAccount(userId: string, email: string) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe n'est pas configuré");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Utilisateur introuvable");

  const stripe = getStripe();
  let accountId = user.stripeConnectAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "CA",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: { userId },
    });
    accountId = account.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeConnectAccountId: accountId },
    });
  }

  return accountId;
}

export async function createConnectOnboardingLink(userId: string, email: string) {
  const accountId = await createOrGetConnectAccount(userId, email);
  const stripe = getStripe();
  const appUrl = getAppUrl();

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/profile?connect=refresh`,
    return_url: `${appUrl}/profile?connect=return`,
    type: "account_onboarding",
  });

  return link.url;
}

export async function syncConnectAccount(accountId: string) {
  const user = await prisma.user.findFirst({
    where: { stripeConnectAccountId: accountId },
  });
  if (!user) return null;

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);

  return prisma.user.update({
    where: { id: user.id },
    data: {
      stripeConnectChargesEnabled: Boolean(account.charges_enabled),
      stripeConnectPayoutsEnabled: Boolean(account.payouts_enabled),
    },
  });
}

export function travelerCanReceivePayments(user: {
  kycStatus: string;
  stripeConnectAccountId: string | null;
  stripeConnectChargesEnabled: boolean;
}) {
  return (
    user.kycStatus === "VERIFIED" &&
    Boolean(user.stripeConnectAccountId) &&
    user.stripeConnectChargesEnabled
  );
}
