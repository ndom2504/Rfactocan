import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  PRODUCT_OFFER_NOTIFICATION_TYPE,
  canRefuseOffer,
  isProductOfferOpen,
  offerPath,
  offerRole,
  offerUrl,
  otherPartyId,
  postOfferMessage,
  productOfferErrorResponse,
  serializeOffer,
} from "@/lib/product-offers";

type Ctx = { params: Promise<{ id: string }> };

/** POST — buyer or seller refuses an open (PENDING / COUNTERED) offer. */
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
    if (!isProductOfferOpen(offer.status) || !canRefuseOffer(offer, session.id)) {
      return NextResponse.json(
        { error: "Cette offre n'est plus ouverte." },
        { status: 409 }
      );
    }

    const claimed = await prisma.productOffer.updateMany({
      where: { id: offer.id, status: { in: ["PENDING", "COUNTERED"] } },
      data: { status: "REFUSED" },
    });
    if (claimed.count === 0) {
      return NextResponse.json(
        { error: "Cette offre a déjà été traitée." },
        { status: 409 }
      );
    }
    const updated = await prisma.productOffer.findUniqueOrThrow({
      where: { id: offer.id },
    });

    await postOfferMessage({
      threadId: offer.threadId,
      senderId: session.id,
      offerId: offer.id,
      body: `Offre refusée : ${offer.name}\n${offerUrl(offer.id)}`,
    });

    await notifyUser({
      userId: otherPartyId(offer, session.id),
      type: PRODUCT_OFFER_NOTIFICATION_TYPE,
      title: "Offre produit refusée",
      body: `${session.displayName} · ${offer.name}`,
      href: offerPath(offer.id),
    });

    return NextResponse.json({
      offer: serializeOffer(updated, { viewerId: session.id }),
    });
  } catch (error) {
    return productOfferErrorResponse(error);
  }
}
