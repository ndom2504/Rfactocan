import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { formatMoneyFromCents, normalizeCurrency } from "@/lib/currency";
import { assertThreadParticipant } from "@/lib/dm";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  PRODUCT_OFFER_MIN_CENTS,
  PRODUCT_OFFER_NOTIFICATION_TYPE,
  agreedPriceCents,
  canAcceptOffer,
  offerPath,
  offerRole,
  otherPartyId,
  postOfferMessage,
  productOfferErrorResponse,
  serializeOffer,
} from "@/lib/product-offers";
import {
  quoteServiceFromTariff,
  servicePaymentDeadlineFrom,
} from "@/lib/service-payments";
import { resolveServiceReceiverHint } from "@/lib/service-interac";

type Ctx = { params: Promise<{ id: string }> };

/** POST — accept the current price → creates an escrow ServicePaymentRequest. */
export async function POST(_request: Request, ctx: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const offer = await prisma.productOffer.findUnique({ where: { id } });
    if (!offer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }
    if (offerRole(offer, session.id) === null) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    if (offer.status !== "PENDING" && offer.status !== "COUNTERED") {
      return NextResponse.json(
        { error: "Cette offre n'est plus ouverte." },
        { status: 409 }
      );
    }
    if (!canAcceptOffer(offer, session.id)) {
      return NextResponse.json(
        {
          error:
            offer.status === "COUNTERED"
              ? "Vous ne pouvez pas accepter votre propre contre-offre."
              : "Seul l'acheteur peut accepter cette offre.",
        },
        { status: 403 }
      );
    }
    if (offer.threadId) {
      const thread = await assertThreadParticipant(offer.threadId, session.id);
      if (!thread) {
        return NextResponse.json(
          { error: "Conversation introuvable." },
          { status: 404 }
        );
      }
    }

    const currency = normalizeCurrency(offer.currency) ?? "CAD";
    const tariffCents = agreedPriceCents(offer);
    if (tariffCents < PRODUCT_OFFER_MIN_CENTS) {
      return NextResponse.json(
        { error: "Montant minimum : 1,00 dans la devise choisie." },
        { status: 400 }
      );
    }
    const { amountCents, platformFeeCents, providerPayoutCents } =
      quoteServiceFromTariff(tariffCents);

    let receiverHint: string | null = null;
    try {
      const sellerProfile = await prisma.user.findUnique({
        where: { id: offer.sellerId },
        select: {
          payoutChannel: true,
          payoutProvider: true,
          payoutIdentifier: true,
        },
      });
      if (sellerProfile) {
        receiverHint = resolveServiceReceiverHint(null, sellerProfile);
      }
    } catch (e) {
      console.error("[product-offers] payout lookup", e);
    }

    // Atomic: claim the offer (guards double accept) + create the payment request.
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.productOffer.updateMany({
        where: {
          id: offer.id,
          status: offer.status,
          updatedAt: offer.updatedAt,
        },
        data: { status: "ACCEPTED" },
      });
      if (claimed.count === 0) return null;

      const payment = await tx.servicePaymentRequest.create({
        data: {
          providerId: offer.sellerId,
          clientId: offer.buyerId,
          threadId: offer.threadId,
          title: offer.name,
          description: offer.description,
          amountCents,
          currency: currency.toLowerCase(),
          platformFeeCents,
          providerPayoutCents,
          escrowUntilConfirm: true,
          status: "AWAITING_PAYMENT",
          receiverHint,
          expiresAt: servicePaymentDeadlineFrom(48),
        },
      });
      const updated = await tx.productOffer.update({
        where: { id: offer.id },
        data: { paymentId: payment.id },
      });
      return { payment, offer: updated };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Cette offre a déjà été traitée." },
        { status: 409 }
      );
    }
    const { payment } = result;

    const amountLabel = formatMoneyFromCents(amountCents, currency);
    const payPath = `/service-payments/${payment.id}`;
    const payUrl = `${getAppUrl()}${payPath}`;

    if (offer.threadId) {
      try {
        await prisma.directMessage.create({
          data: {
            threadId: offer.threadId,
            senderId: offer.sellerId,
            body: `Demande de paiement : ${payment.title} · ${amountLabel}\n${payUrl}`,
            contextType: "SERVICE",
            contextId: payment.id,
          },
        });
        await prisma.directThread.update({
          where: { id: offer.threadId },
          data: { lastMessageAt: new Date() },
        });
      } catch (e) {
        console.error("[product-offers] payment dm insert", e);
      }
    }

    await postOfferMessage({
      threadId: offer.threadId,
      senderId: session.id,
      offerId: offer.id,
      body: `Offre acceptée : ${offer.name} · ${formatMoneyFromCents(tariffCents, currency)}`,
    });

    await notifyUser({
      userId: otherPartyId(offer, session.id),
      type: PRODUCT_OFFER_NOTIFICATION_TYPE,
      title: "Offre produit acceptée",
      body: `${session.displayName} · ${offer.name} · ${formatMoneyFromCents(tariffCents, currency)}`,
      href: offerPath(offer.id),
    });
    await notifyUser({
      userId: offer.buyerId,
      type: "SERVICE_PAYMENT",
      title: "Demande de paiement service",
      body: `${offer.name} · ${amountLabel}`,
      href: payPath,
    });

    return NextResponse.json({
      offer: serializeOffer(result.offer, { viewerId: session.id }),
      payment,
    });
  } catch (error) {
    return productOfferErrorResponse(error);
  }
}
