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
import type Stripe from "stripe";
import {
  DEFAULT_PROCESSING_DAYS,
  isServicePaymentTerminal,
  processingDueAtFrom,
} from "@/lib/service-payment-status";

export {
  DEFAULT_PROCESSING_DAYS,
  SERVICE_PROCESSING_DAYS,
  isServiceOrderSettled,
  isServicePaymentOpen,
  isServicePaymentTerminal,
  normalizeProcessingDays,
  processingDueAtFrom,
  servicePaymentDeadlineFrom,
  servicePaymentStatusI18nKey,
} from "@/lib/service-payment-status";

export function platformFeeBps() {
  const raw = process.env.PLATFORM_FEE_BPS;
  const parsed = raw ? Number(raw) : 1000;
  return Number.isFinite(parsed) ? Math.floor(parsed) : 1000;
}

/** Stripe card fee baked into the client total (default 3.3%). */
export function stripeFeeBps() {
  const raw = process.env.STRIPE_FEE_BPS;
  const parsed = raw ? Number(raw) : 330;
  return Number.isFinite(parsed) ? Math.floor(parsed) : 330;
}

/** Provider sets a tariff; client pays tariff + Rfacto 10% + Stripe 3.3%. */
export function quoteServiceFromTariff(tariffCents: number) {
  const platformFeeCents = Math.floor((tariffCents * platformFeeBps()) / 10000);
  const stripeFeeCents = Math.floor((tariffCents * stripeFeeBps()) / 10000);
  return {
    providerPayoutCents: tariffCents,
    platformFeeCents,
    stripeFeeCents,
    amountCents: tariffCents + platformFeeCents + stripeFeeCents,
  };
}

export function splitServiceAmount(amountCents: number) {
  return quoteServiceFromTariff(amountCents);
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
  if (
    existing.status === "PAID" ||
    existing.status === "DELIVERED" ||
    existing.status === "FULFILLED"
  ) {
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

  const now = new Date();
  const processingDays = existing.processingDays || DEFAULT_PROCESSING_DAYS;
  const updated = await prisma.servicePaymentRequest.update({
    where: { id: paymentId },
    data: {
      status: "PAID",
      paidAt: now,
      payMethod: existing.payMethod ?? "CARD",
      processingDueAt:
        existing.processingDueAt ?? processingDueAtFrom(now, processingDays),
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
      title: existing.escrowUntilConfirm
        ? "Paiement reçu — fonds bloqués"
        : "Paiement reçu",
      body: existing.escrowUntilConfirm
        ? `« ${existing.title} » · ${amount}. Le reversement aura lieu après confirmation de livraison.`
        : `« ${existing.title} » · ${amount}`,
      href: `/service-payments/${paymentId}`,
    });
    await notifyUser({
      userId: existing.clientId,
      type: "SERVICE_PAYMENT",
      title: "Paiement confirmé",
      body: existing.escrowUntilConfirm
        ? `« ${existing.title} » · ${amount}. Fonds sécurisés jusqu’à confirmation de livraison.`
        : `« ${existing.title} » · ${amount}`,
      href: `/service-payments/${paymentId}`,
    });
  } catch (err) {
    console.error("notify service paid", paymentId, err);
  }

  try {
    const people = await prisma.user.findMany({
      where: { id: { in: [existing.clientId, existing.providerId] } },
      select: { id: true, email: true, displayName: true },
    });
    const client = people.find((u) => u.id === existing.clientId);
    const provider = people.find((u) => u.id === existing.providerId);
    if (client?.email && provider?.email) {
      const { formatMoneyFromCents } = await import("@/lib/currency");
      const { emailServicePaymentInvoice } = await import("@/lib/email");
      const currency = updated.currency.toUpperCase();
      const stripeFeeCents = Math.max(
        0,
        updated.amountCents - updated.providerPayoutCents - updated.platformFeeCents
      );
      await emailServicePaymentInvoice({
        clientEmail: client.email,
        providerEmail: provider.email,
        clientName: client.displayName,
        providerName: provider.displayName,
        title: existing.title,
        amountLabel: formatMoneyFromCents(updated.amountCents, currency),
        tariffLabel: formatMoneyFromCents(updated.providerPayoutCents, currency),
        platformFeeLabel: formatMoneyFromCents(
          updated.platformFeeCents,
          currency
        ),
        stripeFeeLabel:
          updated.payMethod === "CARD" || !updated.payMethod
            ? formatMoneyFromCents(stripeFeeCents, currency)
            : "—",
        processingDays: updated.processingDays || DEFAULT_PROCESSING_DAYS,
        paymentId,
        payMethod: updated.payMethod,
        escrow: updated.escrowUntilConfirm,
      });
    }
  } catch (err) {
    console.error("email service invoice", paymentId, err);
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
    payment.status === "DELIVERED" ||
    payment.status === "FULFILLED" ||
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

async function ensureStripeCustomer(userId: string, email: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (user?.stripeCustomerId) return user.stripeCustomerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
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
  if (isServicePaymentTerminal(input.payment.status)) {
    throw new Error("Cette demande n'est plus payable.");
  }

  const currencyCode =
    (normalizeCurrency(input.payment.currency.toUpperCase()) as MoneyCurrency | null) ??
    "CAD";
  const stripeCurrency = toStripeCurrency(currencyCode);
  const stripe = getStripe();
  const appUrl = getAppUrl();

  if (input.payment.stripeCheckoutSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(
        input.payment.stripeCheckoutSessionId
      );
      if (existing.payment_status === "paid") {
        await markServicePaymentPaid(input.payment.id, {
          sessionId: existing.id,
          paymentIntentId:
            typeof existing.payment_intent === "string"
              ? existing.payment_intent
              : existing.payment_intent?.id ?? undefined,
        });
        throw new Error("Déjà payé.");
      }
      if (existing.status === "open" && existing.url) {
        return {
          checkoutUrl: existing.url,
          url: existing.url,
          sessionId: existing.id,
        };
      }
    } catch (err) {
      if (err instanceof Error && err.message === "Déjà payé.") throw err;
    }
  }

  const connectReady =
    providerCanReceiveCard(input.provider) &&
    Boolean(input.provider.stripeConnectAccountId);

  const paymentIntentData: {
    metadata: Record<string, string>;
    receipt_email?: string;
  } = {
    metadata: {
      type: "service_payment",
      servicePaymentId: input.payment.id,
      providerId: input.payment.providerId,
      clientId: input.payment.clientId,
      payoutMode: connectReady ? "escrow_then_transfer" : "platform_hold",
    },
  };

  let customerId: string | undefined;
  if (input.clientEmail) {
    try {
      customerId = await ensureStripeCustomer(
        input.payment.clientId,
        input.clientEmail
      );
    } catch (err) {
      console.error("[service-payments] stripe customer", err);
    }
  }

  const tariffCents = input.payment.providerPayoutCents;
  const platformFeeCents = input.payment.platformFeeCents;
  const stripeFeeCents = Math.max(
    0,
    input.payment.amountCents - tariffCents - platformFeeCents
  );
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    tariffCents > 0
      ? [
          {
            quantity: 1,
            price_data: {
              currency: stripeCurrency,
              unit_amount: tariffCents,
              product_data: {
                name: input.payment.title.slice(0, 120),
                description: (
                  input.payment.description || "Prestation Rfacto"
                ).slice(0, 500),
              },
            },
          },
        ]
      : [
          {
            quantity: 1,
            price_data: {
              currency: stripeCurrency,
              unit_amount: input.payment.amountCents,
              product_data: {
                name: input.payment.title.slice(0, 120),
                description: (
                  input.payment.description || "Service Rfacto"
                ).slice(0, 500),
              },
            },
          },
        ];
  if (tariffCents > 0 && platformFeeCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: stripeCurrency,
        unit_amount: platformFeeCents,
        product_data: { name: "Frais plateforme Rfacto (10 %)" },
      },
    });
  }
  if (tariffCents > 0 && stripeFeeCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: stripeCurrency,
        unit_amount: stripeFeeCents,
        product_data: { name: "Frais de traitement carte" },
      },
    });
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    ...(customerId
      ? { customer: customerId }
      : input.clientEmail
        ? { customer_email: input.clientEmail }
        : {}),
    line_items: lineItems,
    payment_intent_data: paymentIntentData,
    metadata: {
      type: "service_payment",
      servicePaymentId: input.payment.id,
      providerId: input.payment.providerId,
      clientId: input.payment.clientId,
    },
    success_url: `${appUrl}/service-payments/${input.payment.id}?payment=success`,
    cancel_url: `${appUrl}/service-payments/${input.payment.id}?payment=cancel`,
  };

  if (customerId) {
    sessionParams.invoice_creation = {
      enabled: true,
      invoice_data: {
        description: `Rfacto — ${input.payment.title.slice(0, 80)}`,
        footer:
          "Fonds bloqués jusqu’à confirmation de livraison. RapidFacto / Rfacto — intermédiaire de paiement.",
        metadata: {
          type: "service_payment",
          servicePaymentId: input.payment.id,
        },
      },
    };
  } else if (input.clientEmail) {
    paymentIntentData.receipt_email = input.clientEmail;
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (err) {
    console.error("[service-payments] checkout with invoice failed, retry", err);
    delete sessionParams.invoice_creation;
    if (input.clientEmail) {
      paymentIntentData.receipt_email = input.clientEmail;
      sessionParams.payment_intent_data = paymentIntentData;
    }
    session = await stripe.checkout.sessions.create(sessionParams);
  }

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

export async function markServiceDelivered(paymentId: string) {
  const payment = await prisma.servicePaymentRequest.findUnique({
    where: { id: paymentId },
  });
  if (!payment) throw new Error("Demande introuvable");
  if (payment.status === "DELIVERED" || payment.status === "FULFILLED") {
    return payment;
  }
  if (payment.status !== "PAID") {
    throw new Error("Le service n'est pas encore payé.");
  }
  return prisma.servicePaymentRequest.update({
    where: { id: paymentId },
    data: {
      status: "DELIVERED",
      deliveredAt: payment.deliveredAt ?? new Date(),
    },
  });
}

/** Client confirms delivery → transfer provider payout (card escrow) and close. */
export async function fulfillServicePayment(paymentId: string) {
  const payment = await prisma.servicePaymentRequest.findUnique({
    where: { id: paymentId },
    include: {
      provider: {
        select: {
          id: true,
          stripeConnectAccountId: true,
          stripeConnectChargesEnabled: true,
          stripeConnectPayoutsEnabled: true,
          kycStatus: true,
        },
      },
    },
  });
  if (!payment) throw new Error("Demande introuvable");
  if (payment.status === "FULFILLED") return payment;
  if (payment.status !== "DELIVERED" && payment.status !== "PAID") {
    throw new Error("Cette commande n'est pas encore livrable.");
  }
  if (payment.status === "PAID") {
    throw new Error(
      "Le prestataire doit d'abord marquer le service comme livré."
    );
  }

  const now = new Date();
  const connectReady =
    providerCanReceiveCard(payment.provider) &&
    Boolean(payment.provider.stripeConnectAccountId);
  let transferId = payment.stripeTransferId;

  const canTransfer =
    payment.payMethod === "CARD" &&
    payment.escrowUntilConfirm &&
    !transferId &&
    connectReady &&
    isStripeConfigured() &&
    payment.providerPayoutCents > 0;

  if (canTransfer && payment.provider.stripeConnectAccountId) {
    const stripe = getStripe();
    let sourceTransaction: string | undefined;
    if (payment.stripePaymentIntentId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(
          payment.stripePaymentIntentId
        );
        sourceTransaction =
          typeof pi.latest_charge === "string"
            ? pi.latest_charge
            : pi.latest_charge?.id ?? undefined;
      } catch (err) {
        console.error("[service-payments] retrieve PI for transfer", paymentId, err);
      }
    }
    const transfer = await stripe.transfers.create({
      amount: payment.providerPayoutCents,
      currency: payment.currency.toLowerCase(),
      destination: payment.provider.stripeConnectAccountId,
      transfer_group: payment.id,
      ...(sourceTransaction ? { source_transaction: sourceTransaction } : {}),
      metadata: {
        type: "service_payment_release",
        servicePaymentId: payment.id,
        providerId: payment.providerId,
        clientId: payment.clientId,
      },
    });
    transferId = transfer.id;
  }

  const updated = await prisma.servicePaymentRequest.update({
    where: { id: paymentId },
    data: {
      status: "FULFILLED",
      clientConfirmedAt: payment.clientConfirmedAt ?? now,
      releasedAt: now,
      ...(transferId ? { stripeTransferId: transferId } : {}),
    },
  });

  try {
    const people = await prisma.user.findMany({
      where: { id: { in: [payment.clientId, payment.providerId] } },
      select: { id: true, email: true, displayName: true },
    });
    const client = people.find((u) => u.id === payment.clientId);
    const provider = people.find((u) => u.id === payment.providerId);
    if (client?.email && provider?.email) {
      const { formatMoneyFromCents } = await import("@/lib/currency");
      const { emailServicePaymentReleased } = await import("@/lib/email");
      await emailServicePaymentReleased({
        clientEmail: client.email,
        providerEmail: provider.email,
        clientName: client.displayName,
        providerName: provider.displayName,
        title: payment.title,
        payoutLabel: formatMoneyFromCents(
          payment.providerPayoutCents,
          payment.currency.toUpperCase()
        ),
        paymentId,
        transferred: Boolean(transferId),
      });
    }
  } catch (err) {
    console.error("email service released", paymentId, err);
  }

  return updated;
}
