import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  createServiceCardCheckout,
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
      if (payment.status === "PAID") {
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
      if (synced.status === "PAID") {
        return NextResponse.json(
          { error: "Déjà payé.", payment: synced },
          { status: 400 }
        );
      }
      if (payment.status === "PAID") {
        return NextResponse.json(
          { error: "Déjà payé." },
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
      const updated = await prisma.servicePaymentRequest.update({
        where: { id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          providerConfirmedAt: new Date(),
          clientMarkedPaidAt: payment.clientMarkedPaidAt ?? new Date(),
        },
      });
      try {
        const { accrueForServicePayment } = await import(
          "@/lib/herald-commissions"
        );
        await accrueForServicePayment(id);
      } catch (err) {
        console.error("Herald commission service confirm", id, err);
      }
      await notifyUser({
        userId: payment.clientId,
        type: "SERVICE_PAYMENT",
        title: "Paiement confirmé",
        body: `${payment.provider.displayName} a confirmé la réception pour « ${payment.title} ».`,
        href: `/service-payments/${payment.id}`,
      });
      return NextResponse.json({ payment: updated });
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
