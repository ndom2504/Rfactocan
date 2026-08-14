import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  createServiceCardCheckout,
  fulfillServicePayment,
  isServicePaymentTerminal,
  markServiceDelivered,
  markServicePaymentPaid,
  syncServicePaymentFromStripe,
} from "@/lib/service-payments";
import { resolveServiceReceiverHint } from "@/lib/service-interac";

type Ctx = { params: Promise<{ id: string }> };

const actionSchema = z.object({
  action: z.enum([
    "pay_card",
    "pay_interac",
    "pay_mobile",
    "client_mark_paid",
    "provider_confirm",
    "mark_delivered",
    "confirm_delivery",
    "cancel",
  ]),
  payProvider: z.string().max(40).optional().nullable(),
  receiverHint: z.string().max(120).optional().nullable(),
});

/**
 * POST actions on a service payment:
 * - client chooses method (card / interac / mobile) from profile prefs
 * - off-platform mark paid + provider confirm
 * - cancel
 */
export async function POST(request: Request, ctx: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const body = actionSchema.parse(await request.json());

    const payment = await prisma.servicePaymentRequest.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            displayName: true,
            email: true,
            kycStatus: true,
            stripeConnectAccountId: true,
            stripeConnectChargesEnabled: true,
            stripeConnectPayoutsEnabled: true,
          },
        },
        client: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }

    const isClient = payment.clientId === session.id;
    const isProvider = payment.providerId === session.id;

    let payoutProvider: string | null = null;
    let payoutIdentifier: string | null = null;
    try {
      const payout = await prisma.user.findUnique({
        where: { id: payment.providerId },
        select: { payoutProvider: true, payoutIdentifier: true },
      });
      payoutProvider = payout?.payoutProvider ?? null;
      payoutIdentifier = payout?.payoutIdentifier ?? null;
    } catch (e) {
      console.error("[service-payments/pay] payout lookup", e);
    }
    const providerWithPayout = {
      ...payment.provider,
      payoutProvider,
      payoutIdentifier,
    };

    if (!isClient && !isProvider && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (
      payment.expiresAt &&
      payment.expiresAt.getTime() <= Date.now() &&
      payment.status === "AWAITING_PAYMENT"
    ) {
      await prisma.servicePaymentRequest.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Cette demande de paiement a expiré." },
        { status: 400 }
      );
    }

    if (body.action === "cancel") {
      if (
        payment.status === "PAID" ||
        payment.status === "DELIVERED" ||
        payment.status === "FULFILLED"
      ) {
        return NextResponse.json(
          { error: "Paiement déjà encaissé." },
          { status: 400 }
        );
      }
      const updated = await prisma.servicePaymentRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ payment: updated });
    }

    if (body.action === "pay_card") {
      if (!isClient) {
        return NextResponse.json(
          { error: "Seul le client peut payer." },
          { status: 403 }
        );
      }
      const synced = await syncServicePaymentFromStripe(payment);
      if (synced.status === "PAID" || payment.status === "PAID") {
        return NextResponse.json({
          payment: synced.status === "PAID" ? synced : payment,
          alreadyPaid: true,
        });
      }
      if (
        isServicePaymentTerminal(synced.status) ||
        isServicePaymentTerminal(payment.status)
      ) {
        return NextResponse.json(
          { error: "Cette demande n'est plus payable." },
          { status: 400 }
        );
      }
      try {
        const checkout = await createServiceCardCheckout({
          payment,
          clientEmail: payment.client.email,
          provider: providerWithPayout,
        });
        return NextResponse.json(checkout);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Paiement carte impossible.";
        if (/déjà payé/i.test(message)) {
          return NextResponse.json({ alreadyPaid: true });
        }
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (body.action === "pay_interac" || body.action === "pay_mobile") {
      if (!isClient) {
        return NextResponse.json(
          { error: "Seul le client peut choisir le mode de paiement." },
          { status: 403 }
        );
      }
      if (payment.status !== "AWAITING_PAYMENT" && payment.status !== "AWAITING_CONFIRMATION") {
        return NextResponse.json(
          { error: "Cette demande n'attend plus de paiement." },
          { status: 400 }
        );
      }
      const method = body.action === "pay_interac" ? "INTERAC" : "MOBILE";
      const receiverHint = resolveServiceReceiverHint(
        body.receiverHint ?? payment.receiverHint,
        providerWithPayout
      );
      if (method === "INTERAC" && !receiverHint) {
        return NextResponse.json(
          {
            error:
              "Le prestataire n'a pas encore configuré son e-mail Interac dans Profil → Portefeuille.",
            code: "PROVIDER_INTERAC_MISSING",
          },
          { status: 400 }
        );
      }
      const updated = await prisma.servicePaymentRequest.update({
        where: { id },
        data: {
          payMethod: method,
          payProvider:
            body.payProvider?.trim() ||
            (method === "INTERAC" ? "interac" : "mobile_money"),
          ...(receiverHint ? { receiverHint } : {}),
          status: "AWAITING_PAYMENT",
        },
      });
      return NextResponse.json({ payment: updated });
    }

    if (body.action === "client_mark_paid") {
      if (!isClient) {
        return NextResponse.json(
          { error: "Seul le client peut signaler le paiement." },
          { status: 403 }
        );
      }
      if (
        payment.payMethod !== "INTERAC" &&
        payment.payMethod !== "MOBILE"
      ) {
        return NextResponse.json(
          {
            error:
              "Choisissez d'abord Interac ou Mobile Money, ou payez par carte.",
          },
          { status: 400 }
        );
      }
      const updated = await prisma.servicePaymentRequest.update({
        where: { id },
        data: {
          status: "AWAITING_CONFIRMATION",
          clientMarkedPaidAt: new Date(),
        },
      });
      await notifyUser({
        userId: payment.providerId,
        type: "SERVICE_PAYMENT",
        title: "Paiement signalé",
        body: `${payment.client.displayName} indique avoir payé « ${payment.title} ». Confirmez la réception.`,
        href: `/service-payments/${payment.id}`,
      });
      return NextResponse.json({ payment: updated });
    }

    if (body.action === "provider_confirm") {
      if (!isProvider) {
        return NextResponse.json(
          { error: "Seul le prestataire peut confirmer." },
          { status: 403 }
        );
      }
      if (
        payment.status !== "AWAITING_CONFIRMATION" &&
        payment.status !== "AWAITING_PAYMENT"
      ) {
        return NextResponse.json(
          { error: "Rien à confirmer pour cette demande." },
          { status: 400 }
        );
      }
      if (payment.payMethod === "CARD") {
        return NextResponse.json(
          {
            error:
              "Les paiements carte sont confirmés automatiquement via Stripe.",
          },
          { status: 400 }
        );
      }
      const updated = await markServicePaymentPaid(id);
      return NextResponse.json({ payment: updated });
    }

    if (body.action === "mark_delivered") {
      if (!isProvider) {
        return NextResponse.json(
          { error: "Seul le prestataire peut marquer la livraison." },
          { status: 403 }
        );
      }
      try {
        const updated = await markServiceDelivered(id);
        await notifyUser({
          userId: payment.clientId,
          type: "SERVICE_PAYMENT",
          title: "Service livré",
          body: `${payment.provider.displayName} a marqué « ${payment.title} » comme livré. Confirmez pour débloquer le reversement.`,
          href: `/service-payments/${payment.id}`,
        });
        return NextResponse.json({ payment: updated });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Impossible de marquer comme livré.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (body.action === "confirm_delivery") {
      if (!isClient) {
        return NextResponse.json(
          { error: "Seul le client peut confirmer la livraison." },
          { status: 403 }
        );
      }
      try {
        const updated = await fulfillServicePayment(id);
        await notifyUser({
          userId: payment.providerId,
          type: "SERVICE_PAYMENT",
          title: "Livraison confirmée",
          body:
            updated.stripeTransferId
              ? `« ${payment.title} » confirmé. Le reversement a été envoyé.`
              : `« ${payment.title} » confirmé. Commande clôturée.`,
          href: `/service-payments/${payment.id}`,
        });
        return NextResponse.json({ payment: updated });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Confirmation impossible.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
