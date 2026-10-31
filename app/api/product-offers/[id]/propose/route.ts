import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  PRODUCT_OFFER_MIN_CENTS,
  PRODUCT_OFFER_NOTIFICATION_TYPE,
  canProposeOffer,
  formatOfferAmount,
  isProductOfferOpen,
  majorToCents,
  offerPath,
  offerRole,
  offerUrl,
  otherPartyId,
  postOfferMessage,
  productOfferErrorResponse,
  proposeSchema,
  serializeOffer,
} from "@/lib/product-offers";

type Ctx = { params: Promise<{ id: string }> };

/** POST {price, note?} — counter-offer by buyer or seller; sets status COUNTERED. */
export async function POST(request: Request, ctx: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const body = proposeSchema.parse(await request.json());

    const offer = await prisma.productOffer.findUnique({ where: { id } });
    if (!offer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }
    if (offerRole(offer, session.id) === null) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    if (!isProductOfferOpen(offer.status)) {
      return NextResponse.json(
        { error: "Cette offre n'est plus ouverte." },
        { status: 409 }
      );
    }
    if (!canProposeOffer(offer, session.id)) {
      return NextResponse.json(
        { error: "En attente de la réponse de l'autre partie." },
        { status: 409 }
      );
    }

    const priceCents = majorToCents(body.price);
    if (priceCents < PRODUCT_OFFER_MIN_CENTS) {
      return NextResponse.json(
        { error: "Montant minimum : 1,00 dans la devise choisie." },
        { status: 400 }
      );
    }
    const note = (body.note || "").trim();

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.productOffer.updateMany({
        where: {
          id: offer.id,
          status: offer.status,
          updatedAt: offer.updatedAt,
        },
        data: {
          status: "COUNTERED",
          proposedPriceCents: priceCents,
          proposedById: session.id,
          proposedNote: note,
        },
      });
      if (claimed.count === 0) return null;
      await tx.productOfferProposal.create({
        data: {
          offerId: offer.id,
          authorId: session.id,
          priceCents,
          note,
        },
      });
      return tx.productOffer.findUniqueOrThrow({ where: { id: offer.id } });
    });

    if (!result) {
      return NextResponse.json(
        { error: "Cette offre a changé, veuillez actualiser." },
        { status: 409 }
      );
    }

    const amountLabel = formatOfferAmount(priceCents, result);
    await postOfferMessage({
      threadId: offer.threadId,
      senderId: session.id,
      offerId: offer.id,
      body: `Contre-offre : ${offer.name} · ${amountLabel}${note ? `\n${note}` : ""}\n${offerUrl(offer.id)}`,
    });

    await notifyUser({
      userId: otherPartyId(offer, session.id),
      type: PRODUCT_OFFER_NOTIFICATION_TYPE,
      title: "Contre-offre produit",
      body: `${session.displayName} · ${offer.name} · ${amountLabel}`,
      href: offerPath(offer.id),
    });

    return NextResponse.json({
      offer: serializeOffer(result, { viewerId: session.id }),
    });
  } catch (error) {
    return productOfferErrorResponse(error);
  }
}
