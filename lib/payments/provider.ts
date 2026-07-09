import type { PaymentStatus } from "@prisma/client";
import { getAppUrl } from "@/lib/app-url";
import {
  computePaymentAmounts,
  getStripe,
  isStripeConfigured,
} from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export type CreateAuthorizationInput = {
  bookingId: string;
  weightKg: number;
  pricePerKgCad: number;
  senderEmail: string;
  senderId: string;
  travelerConnectAccountId: string;
  fromCountry: string;
  toCountry: string;
};

export type PaymentProvider = {
  createAuthorization: (
    input: CreateAuthorizationInput
  ) => Promise<{ checkoutUrl: string; paymentId: string }>;
  captureAndTransfer: (bookingId: string) => Promise<void>;
  cancelAuthorization: (bookingId: string) => Promise<void>;
};

async function resolveFeeBps(fromCountry: string, toCountry: string) {
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

export const stripePaymentProvider: PaymentProvider = {
  async createAuthorization(input) {
    if (!isStripeConfigured()) {
      throw new Error("Stripe n'est pas configuré");
    }

    const feeBps = await resolveFeeBps(input.fromCountry, input.toCountry);
    const amountCadCents = Math.max(
      100,
      Math.round(input.weightKg * input.pricePerKgCad * 100)
    );
    const platformFeeCents = Math.floor((amountCadCents * feeBps) / 10000);
    const travelerPayoutCents = amountCadCents - platformFeeCents;

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
        amountCadCents,
        platformFeeCents,
        travelerPayoutCents,
        currency: "cad",
        provider: "stripe",
        status: "REQUIRES_PAYMENT",
      },
      update: {
        amountCadCents,
        platformFeeCents,
        travelerPayoutCents,
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
            currency: "cad",
            unit_amount: amountCadCents,
            product_data: {
              name: "Transport de colis Rfacto (séquestre)",
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
        },
      },
      metadata: {
        bookingId: input.bookingId,
        paymentId: payment.id,
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

export { computePaymentAmounts };
