import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeClient;
}

export function getPlatformFeeBps() {
  const raw = process.env.PLATFORM_FEE_BPS;
  const parsed = raw ? Number(raw) : 1000;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5000) return 1000;
  return Math.floor(parsed);
}

export function computePaymentAmounts(weightKg: number, pricePerKgCad: number) {
  const amountCadCents = Math.max(
    100,
    Math.round(weightKg * pricePerKgCad * 100)
  );
  const feeBps = getPlatformFeeBps();
  const platformFeeCents = Math.floor((amountCadCents * feeBps) / 10000);
  const travelerPayoutCents = amountCadCents - platformFeeCents;
  return { amountCadCents, platformFeeCents, travelerPayoutCents, feeBps };
}

export function formatCadFromCents(cents: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}
