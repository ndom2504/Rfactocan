import type { PaymentStatus } from "@prisma/client";
import { getAppUrl } from "@/lib/app-url";
import {
  convertAmount,
  normalizeCurrency,
  resolveCheckoutCurrency,
  resolvePayerCurrency,
  toStripeAmountUnits,
  toStripeCurrency,
  type MoneyCurrency,
} from "@/lib/currency";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export type CreateAuthorizationInput = {
  bookingId: string;
  weightKg: number;
  pricePerKgCad: number;
  tripCurrency?: string | null;
  senderEmail: string;
  senderId: string;
  travelerConnectAccountId: string;
  fromCountry: string;
  toCountry: string;
  preferredCurrency?: string | null;
};

export type PaymentProvider = {
  createAuthorization: (
    input: CreateAuthorizationInput
  ) => Promise<{ checkoutUrl: string; paymentId: string }>;
  captureAndTransfer: (bookingId: string) => Promise<void>;
  cancelAuthorization: (bookingId: string) => Promise<void>;
};

async function resolveFeeBps(
  fromCountry: string,
  toCountry: string
): Promise<number> {
  const corridor = await prisma.corridorConfig.findUnique({
    where: {
      fromCountry_toCountry: { fromCountry, toCountry },
    },
  });
  if (corridor?.active) return corridor.feeBps;
  const raw = process.env.PLATFORM_FEE_BPS;
  const parsed = raw ? Number(raw) : 1000;
  return Number.isFinite(parsed) ? Math.floor(parsed) : 1000;
}

export function quotePaymentAmount(input: {
  weightKg: number;
  pricePerKg: number;
  tripCurrency?: string | null;
  preferredCurrency?: string | null;
  fromCountry: string;
  toCountry: string;
  corridorCurrency?: string | null;
}): { amountCents: number; currency: MoneyCurrency } {
  const sourceCurrency =
    normalizeCurrency(input.tripCurrency) ||
    resolveCheckoutCurrency(
      input.fromCountry,
      input.toCountry,
      input.corridorCurrency
    );
  const currency = resolvePayerCurrency({
    preferredCurrency: input.preferredCurrency,
    tripCurrency: input.tripCurrency,
    fromCountry: input.fromCountry,
    toCountry: input.toCountry,
    corridorCurrency: input.corridorCurrency,
  });
  const baseMajor = Math.max(0, input.weightKg * input.pricePerKg);
  const converted = convertAmount(baseMajor, sourceCurrency, currency);
  const amountCents = toStripeAmountUnits(converted, currency);
  return { amountCents, currency };
}

export const stripePaymentProvider: PaymentProvider = {
  async createAuthorization(input) {
    if (!isStripeConfigured()) {
      throw new Error("Stripe n'est pas configuré");
    }

    const corridor = await prisma.corridorConfig.findUnique({
      where: {
        fromCountry_toCountry: {
          fromCountry: input.fromCountry,
          toCountry: input.toCountry,
        },
      },
    });
    const feeBps = await resolveFeeBps(input.fromCountry, input.toCountry);
    const { amountCents, currency } = quotePaymentAmount({
      weightKg: input.weightKg,
      pricePerKg: input.pricePerKgCad,
      tripCurrency: input.tripCurrency,
      preferredCurrency: input.preferredCurrency,
      fromCountry: input.fromCountry,
      toCountry: input.toCountry,
      corridorCurrency: corridor?.currency,
    });
    const platformFeeCents = Math.floor((amountCents * feeBps) / 10000);
    const travelerPayoutCents = amountCents - platformFeeCents;
    const stripeCurrency = toStripeCurrency(currency);

    const stripe = getStripe();
    const appUrl = getAppUrl();

    let customerId: string | undefined;
    const sender = await prisma.user.findUnique({
      where: { id: input.senderId },
    });
    if (sender?.stripeCustomerId) {
      customerId = sender.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: input.senderEmail,
        metadata: { userId: input.senderId },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: input.senderId },
        data: { stripeCustomerId: customer.id },
      });
    }

    const payment = await prisma.payment.upsert({
      where: { bookingId: input.bookingId },
      create: {
        bookingId: input.bookingId,
        amountCadCents: amountCents,
        platformFeeCents,
        travelerPayoutCents,
        currency: stripeCurrency,
        provider: "stripe",
        status: "REQUIRES_PAYMENT",
      },
      update: {
        amountCadCents: amountCents,
        platformFeeCents,
        travelerPayoutCents,
        currency: stripeCurrency,
        status: "REQUIRES_PAYMENT",
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: input.bookingId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: stripeCurrency,
            unit_amount: amountCents,
            product_data: {
              name: "Rfacto — transport de colis (séquestre)",
              description: `Réservation ${input.bookingId} — fonds bloqués jusqu'à livraison`,
            },
          },
        },
      ],
      payment_intent_data: {
        capture_method: "manual",
        transfer_group: input.bookingId,
        metadata: {
          bookingId: input.bookingId,
          paymentId: payment.id,
          travelerConnectAccountId: input.travelerConnectAccountId,
          platformFeeCents: String(platformFeeCents),
          travelerPayoutCents: String(travelerPayoutCents),
          currency: stripeCurrency,
        },
      },
      metadata: {
        bookingId: input.bookingId,
        paymentId: payment.id,
        currency: stripeCurrency,
      },
      success_url: `${appUrl}/bookings/${input.bookingId}?payment=success`,
      cancel_url: `${appUrl}/bookings/${input.bookingId}?payment=cancel`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
      },
    });

    if (!session.url) {
      throw new Error("Stripe Checkout URL manquante");
    }

    return { checkoutUrl: session.url, paymentId: payment.id };
  },

  async captureAndTransfer(bookingId) {
    if (!isStripeConfigured()) {
      throw new Error("Stripe n'est pas configuré");
    }

    const payment = await prisma.payment.findUnique({
      where: { bookingId },
      include: {
        booking: {
          include: {
            trip: { include: { user: true } },
          },
        },
      },
    });

    if (!payment?.stripePaymentIntentId) {
      throw new Error("Paiement introuvable pour cette réservation");
    }
    if (payment.status === "CAPTURED") return;
    if (payment.status !== "AUTHORIZED") {
      throw new Error(`Paiement non autorisé (statut: ${payment.status})`);
    }

    const traveler = payment.booking.trip.user;
    if (!traveler.stripeConnectAccountId) {
      throw new Error("Le voyageur n'a pas de compte Connect");
    }

    const stripe = getStripe();
    await stripe.paymentIntents.capture(payment.stripePaymentIntentId);

    const transfer = await stripe.transfers.create({
      amount: payment.travelerPayoutCents,
      currency: payment.currency,
      destination: traveler.stripeConnectAccountId,
      transfer_group: bookingId,
      metadata: {
        bookingId,
        paymentId: payment.id,
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "CAPTURED",
        stripeTransferId: transfer.id,
      },
    });
  },

  async cancelAuthorization(bookingId) {
    if (!isStripeConfigured()) return;

    const payment = await prisma.payment.findUnique({
      where: { bookingId },
    });
    if (!payment?.stripePaymentIntentId) {
      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "CANCELLED" },
        });
      }
      return;
    }

    if (payment.status === "CAPTURED" || payment.status === "REFUNDED") {
      return;
    }

    const stripe = getStripe();
    try {
      await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
    } catch {
      /* already canceled or succeeded */
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "CANCELLED" satisfies PaymentStatus },
    });
  },
};

export function getPaymentProvider(): PaymentProvider {
  return stripePaymentProvider;
}

export { computePaymentAmounts } from "@/lib/stripe";
