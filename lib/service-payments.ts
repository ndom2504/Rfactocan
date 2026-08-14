import { getAppUrl } from "@/lib/app-url";
import { travelerCanReceivePayments } from "@/lib/connect";
import {
  normalizeCurrency,
  toStripeCurrency,
  type MoneyCurrency,
} from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import type { ServicePaymentRequest, User } from "@prisma/client";

export function platformFeeBps() {
  const raw = process.env.PLATFORM_FEE_BPS;
  const parsed = raw ? Number(raw) : 1000;
  return Number.isFinite(parsed) ? Math.floor(parsed) : 1000;
}

export function splitServiceAmount(amountCents: number) {
  const feeBps = platformFeeBps();
  const platformFeeCents = Math.floor((amountCents * feeBps) / 10000);
  const providerPayoutCents = amountCents - platformFeeCents;
  return { platformFeeCents, providerPayoutCents, feeBps };
}

export function servicePaymentDeadlineFrom(hours = 48) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function majorToCents(amount: number) {
  return Math.round(amount * 100);
}

export function centsToMajor(cents: number) {
  return cents / 100;
}

export type ProviderPayoutUser = Pick<
  User,
  | "id"
  | "kycStatus"
  | "stripeConnectAccountId"
  | "stripeConnectChargesEnabled"
  | "stripeConnectPayoutsEnabled"
>;

export function providerCanReceiveCard(user: ProviderPayoutUser) {
  return travelerCanReceivePayments(user);
}

export async function markServicePaymentPaid(
  paymentId: string,
  opts?: { paymentIntentId?: string; sessionId?: string }
) {
  const existing = await prisma.servicePaymentRequest.findUnique({
    where: { id: paymentId },
  });
  if (!existing) return null;
  if (existing.status === "PAID") {
    try {
      const { accrueForServicePayment } = await import(
        "@/lib/herald-commissions"
      );
      await accrueForServicePayment(paymentId);
    } catch (err) {
      console.error("Herald commission service (already paid)", paymentId, err);
    }
    return existing;
  }

  const updated = await prisma.servicePaymentRequest.update({
    where: { id: paymentId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      payMethod: existing.payMethod ?? "CARD",
      ...(opts?.paymentIntentId
        ? { stripePaymentIntentId: opts.paymentIntentId }
        : {}),
      ...(opts?.sessionId
        ? { stripeCheckoutSessionId: opts.sessionId }
        : {}),
      providerConfirmedAt: new Date(),
    },
  });

  try {
    const { accrueForServicePayment } = await import(
      "@/lib/herald-commissions"
    );
    await accrueForServicePayment(paymentId);
  } catch (err) {
    console.error("Herald commission service paid", paymentId, err);
  }

  try {
    const { notifyUser } = await import("@/lib/notifications");
    const { formatMoneyFromCents } = await import("@/lib/currency");
    const amount = formatMoneyFromCents(
      updated.amountCents,
      updated.currency.toUpperCase()
    );
    await notifyUser({
      userId: existing.providerId,
      type: "SERVICE_PAYMENT",
      title: "Paiement reçu",
      body: `« ${existing.title} » · ${amount}. Ouvrez la demande pour voir où les fonds sont déposés.`,
      href: `/service-payments/${paymentId}`,
    });
  } catch (err) {
    console.error("notify provider service paid", paymentId, err);
  }

  return updated;
}

export type ServicePayoutKind =
  | "stripe_connect"
  | "platform_hold"
  | "interac"
  | "mobile";

export type ServicePayoutInfo = {
  kind: ServicePayoutKind;
  destination: string | null;
  netCents: number;
  feeCents: number;
};

export function resolveServicePayoutInfo(input: {
  payMethod?: string | null;
  receiverHint?: string | null;
  amountCents: number;
  platformFeeCents: number;
  providerPayoutCents: number;
  connectReady: boolean;
  interacEmail?: string | null;
  mobileHint?: string | null;
}): ServicePayoutInfo {
  const method = input.payMethod ?? null;
  if (method === "INTERAC") {
    return {
      kind: "interac",
      destination:
        input.receiverHint?.trim() || input.interacEmail?.trim() || null,
      netCents: input.amountCents,
      feeCents: 0,
    };
  }
  if (method === "MOBILE") {
    return {
      kind: "mobile",
      destination:
        input.receiverHint?.trim() || input.mobileHint?.trim() || null,
      netCents: input.amountCents,
      feeCents: 0,
    };
  }
  return {
    kind: input.connectReady ? "stripe_connect" : "platform_hold",
    destination: null,
    netCents: input.providerPayoutCents,
    feeCents: input.platformFeeCents,
  };
}

/** If Checkout already succeeded, mark PAID even when the webhook is delayed. */
export async function syncServicePaymentFromStripe(
  payment: Pick<
    ServicePaymentRequest,
    "id" | "status" | "stripeCheckoutSessionId"
  >
) {
  if (
    payment.status === "PAID" ||
    payment.status === "CANCELLED" ||
    payment.status === "EXPIRED"
  ) {
    return payment;
  }
  if (!payment.stripeCheckoutSessionId || !isStripeConfigured()) {
    return payment;
  }
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(
      payment.stripeCheckoutSessionId
    );
    if (session.payment_status !== "paid") {
      return payment;
    }
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    const updated = await markServicePaymentPaid(payment.id, {
      sessionId: session.id,
      paymentIntentId: piId ?? undefined,
    });
    return updated ?? payment;
  } catch (err) {
    console.error("[service-payments] stripe sync", payment.id, err);
    return payment;
  }
}

export async function syncPendingServicePaymentsFromStripe<
  T extends Pick<
    ServicePaymentRequest,
    "id" | "status" | "stripeCheckoutSessionId"
  >,
>(payments: T[]): Promise<T[]> {
  const pending = payments.filter(
    (p) => p.status === "AWAITING_PAYMENT" && p.stripeCheckoutSessionId
  );
  if (pending.length === 0) return payments;
  const updates = await Promise.all(
    pending.slice(0, 12).map((p) => syncServicePaymentFromStripe(p))
  );
  const byId = new Map(updates.map((u) => [u.id, u]));
  return payments.map((p) => {
    const next = byId.get(p.id);
    if (!next || next.status === p.status) return p;
    return { ...p, status: next.status };
  });
}

export async function createServiceCardCheckout(input: {
  payment: ServicePaymentRequest;
  clientEmail: string;
  provider: ProviderPayoutUser;
}) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe n'est pas configuré");
  }
  if (input.payment.amountCents <= 0) {
    throw new Error("Montant invalide");
  }

  const currencyCode =
    (normalizeCurrency(input.payment.currency.toUpperCase()) as MoneyCurrency | null) ??
    "CAD";
  const stripeCurrency = toStripeCurrency(currencyCode);
  const stripe = getStripe();
  const appUrl = getAppUrl();
  const connectReady =
    providerCanReceiveCard(input.provider) &&
    Boolean(input.provider.stripeConnectAccountId);

  const paymentIntentData: {
    metadata: Record<string, string>;
    application_fee_amount?: number;
    transfer_data?: { destination: string };
  } = {
    metadata: {
      type: "service_payment",
      servicePaymentId: input.payment.id,
      providerId: input.payment.providerId,
      clientId: input.payment.clientId,
      payoutMode: connectReady ? "connect" : "platform_hold",
    },
  };
  if (connectReady && input.provider.stripeConnectAccountId) {
    paymentIntentData.application_fee_amount = input.payment.platformFeeCents;
    paymentIntentData.transfer_data = {
      destination: input.provider.stripeConnectAccountId,
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.clientEmail || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: stripeCurrency,
          unit_amount: input.payment.amountCents,
          product_data: {
            name: input.payment.title.slice(0, 120),
            description: (input.payment.description || "Service Rfacto").slice(
              0,
              500
            ),
          },
        },
      },
    ],
    payment_intent_data: paymentIntentData,
    metadata: {
      type: "service_payment",
      servicePaymentId: input.payment.id,
      providerId: input.payment.providerId,
      clientId: input.payment.clientId,
    },
    success_url: `${appUrl}/service-payments/${input.payment.id}?payment=success`,
    cancel_url: `${appUrl}/service-payments/${input.payment.id}?payment=cancel`,
  });

  await prisma.servicePaymentRequest.update({
    where: { id: input.payment.id },
    data: {
      payMethod: "CARD",
      stripeCheckoutSessionId: session.id,
      status: "AWAITING_PAYMENT",
    },
  });

  if (!session.url) {
    throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
  }

  return { checkoutUrl: session.url, url: session.url, sessionId: session.id };
}
