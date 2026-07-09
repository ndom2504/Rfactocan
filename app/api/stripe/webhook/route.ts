import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { syncConnectAccount } from "@/lib/connect";
import { emailPaymentAuthorized } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { syncIdentitySessionStatus } from "@/lib/kyc";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { recordBookingEvent, statusEventLabel } from "@/lib/tracking";

export const runtime = "nodejs";

async function alreadyProcessed(eventId: string) {
  const existing = await prisma.stripeEvent.findUnique({
    where: { eventId },
  });
  return Boolean(existing);
}

async function markProcessed(eventId: string, type: string) {
  await prisma.stripeEvent.create({
    data: { eventId, type },
  });
}

async function handlePaymentIntent(
  pi: Stripe.PaymentIntent,
  nextStatus: "AUTHORIZED" | "CANCELLED" | "FAILED" | "CAPTURED"
) {
  const bookingId = pi.metadata?.bookingId;
  if (!bookingId) return;

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [{ stripePaymentIntentId: pi.id }, { bookingId }],
    },
  });
  if (!payment) return;

  if (nextStatus === "AUTHORIZED") {
    if (payment.status === "AUTHORIZED" || payment.status === "CAPTURED") {
      return;
    }
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        request: true,
        sender: true,
        trip: { include: { user: true } },
        payment: true,
      },
    });
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "AUTHORIZED",
          stripePaymentIntentId: pi.id,
        },
      });
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "ACCEPTED" },
      });
      if (booking) {
        await tx.parcelRequest.update({
          where: { id: booking.requestId },
          data: { status: "MATCHED" },
        });
        await recordBookingEvent(tx, {
          bookingId,
          type: "STATUS",
          status: "ACCEPTED",
          label: statusEventLabel("ACCEPTED"),
          meta: { source: "stripe_webhook" },
        });
      }
    });

    if (booking) {
      const amountLabel = new Intl.NumberFormat("fr-CA", {
        style: "currency",
        currency: (payment.currency || "cad").toUpperCase(),
      }).format(payment.amountCadCents / 100);
      const route = `${booking.request.fromCity} → ${booking.request.toCity}`;
      void emailPaymentAuthorized({
        senderEmail: booking.sender.email,
        travelerEmail: booking.trip.user.email,
        senderName: booking.sender.displayName,
        travelerName: booking.trip.user.displayName,
        route,
        bookingId,
        amountLabel,
      });
      void notifyUser({
        userId: booking.senderId,
        type: "payment_authorized",
        title: "Paiement confirmé",
        body: `${amountLabel} · ${route}`,
        href: `/bookings/${bookingId}`,
      });
      void notifyUser({
        userId: booking.trip.userId,
        type: "payment_authorized",
        title: "Paiement reçu (séquestre)",
        body: `${amountLabel} · ${route}`,
        href: `/bookings/${bookingId}`,
      });
    }
    return;
  }

  if (nextStatus === "CANCELLED" || nextStatus === "FAILED") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: nextStatus },
    });
  }

  if (nextStatus === "CAPTURED") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "CAPTURED" },
    });
  }
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret manquant" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature error", error);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (await alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "identity.verification_session.verified": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        await syncIdentitySessionStatus(session.id, "verified");
        break;
      }
      case "identity.verification_session.requires_input": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        await syncIdentitySessionStatus(session.id, "requires_input");
        break;
      }
      case "identity.verification_session.canceled": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        await syncIdentitySessionStatus(session.id, "canceled");
        break;
      }
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.status === "requires_capture") {
          await handlePaymentIntent(pi, "AUTHORIZED");
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntent(pi, "CAPTURED");
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntent(pi, "CANCELLED");
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntent(pi, "FAILED");
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId =
          session.metadata?.bookingId || session.client_reference_id || undefined;
        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;
        if (bookingId && piId) {
          await prisma.payment.updateMany({
            where: { bookingId },
            data: { stripePaymentIntentId: piId },
          });
          const pi = await stripe.paymentIntents.retrieve(piId);
          if (pi.status === "requires_capture") {
            await handlePaymentIntent(
              { ...pi, metadata: { ...pi.metadata, bookingId } },
              "AUTHORIZED"
            );
          }
        }
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await syncConnectAccount(account.id);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (piId) {
          await prisma.payment.updateMany({
            where: { stripePaymentIntentId: piId },
            data: { status: "REFUNDED" },
          });
        }
        break;
      }
      default:
        break;
    }

    await markProcessed(event.id, event.type);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
