import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  loadOfferPeople,
  productOfferErrorResponse,
  serializeOffer,
} from "@/lib/product-offers";

type Ctx = { params: Promise<{ id: string }> };

/** GET — offer detail with proposal history (seller, buyer or admin). */
export async function GET(_request: Request, ctx: Ctx) {
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
    if (
      offer.sellerId !== session.id &&
      offer.buyerId !== session.id &&
      session.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const [proposals, people] = await Promise.all([
      prisma.productOfferProposal.findMany({
        where: { offerId: offer.id },
        orderBy: { createdAt: "asc" },
      }),
      loadOfferPeople(offer),
    ]);

    return NextResponse.json({
      offer: serializeOffer(offer, {
        viewerId: session.id,
        seller: people.seller,
        buyer: people.buyer,
        proposals,
      }),
    });
  } catch (e) {
    return productOfferErrorResponse(e);
  }
}
