import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl } from "@/lib/app-url";
import { formatMoneyFromCents, normalizeCurrency } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { majorToCents } from "@/lib/service-payments";
import type { ProductOffer } from "@prisma/client";

export { majorToCents };

export const PRODUCT_OFFER_CONTEXT = "OFFER";
export const PRODUCT_OFFER_NOTIFICATION_TYPE = "PRODUCT_OFFER";
export const PRODUCT_OFFER_MIN_CENTS = 100;

export type ProductOfferStatusValue =
  | "PENDING"
  | "COUNTERED"
  | "ACCEPTED"
  | "REFUSED"
  | "CANCELLED";

/** Offer is still being negotiated. */
export function isProductOfferOpen(status: string) {
  return status === "PENDING" || status === "COUNTERED";
}

/** Currency code for display (CAD, USD, …). */
export function offerCurrencyCode(offer: Pick<ProductOffer, "currency">) {
  return normalizeCurrency(offer.currency) ?? "CAD";
}

export function formatOfferAmount(
  cents: number,
  offer: Pick<ProductOffer, "currency">
) {
  return formatMoneyFromCents(cents, offerCurrencyCode(offer));
}

/** Price both sides would agree on right now (counter-offer if any, else asking price). */
export function agreedPriceCents(
  offer: Pick<ProductOffer, "status" | "priceCents" | "proposedPriceCents">
) {
  if (offer.status === "COUNTERED" && offer.proposedPriceCents != null) {
    return offer.proposedPriceCents;
  }
  return offer.priceCents;
}

export function offerPath(offerId: string) {
  return `/product-offers/${offerId}`;
}

export function offerUrl(offerId: string) {
  return `${getAppUrl()}${offerPath(offerId)}`;
}

export function offerRole(
  offer: Pick<ProductOffer, "sellerId" | "buyerId">,
  userId: string
): "seller" | "buyer" | null {
  if (offer.sellerId === userId) return "seller";
  if (offer.buyerId === userId) return "buyer";
  return null;
}

export function otherPartyId(
  offer: Pick<ProductOffer, "sellerId" | "buyerId">,
  userId: string
) {
  return offer.sellerId === userId ? offer.buyerId : offer.sellerId;
}

/**
 * Who can accept?
 * - PENDING: buyer only.
 * - COUNTERED: the party who did NOT make the last proposal.
 */
export function canAcceptOffer(
  offer: Pick<ProductOffer, "status" | "buyerId" | "proposedById">,
  userId: string
) {
  if (offer.status === "PENDING") return offer.buyerId === userId;
  if (offer.status === "COUNTERED") {
    return offer.proposedById != null && offer.proposedById !== userId;
  }
  return false;
}

/** Either party may refuse while the offer is open. */
export function canRefuseOffer(
  offer: Pick<ProductOffer, "status" | "sellerId" | "buyerId">,
  userId: string
) {
  return isProductOfferOpen(offer.status) && offerRole(offer, userId) !== null;
}

/** Either party may counter while open, except the author of the pending counter. */
export function canProposeOffer(
  offer: Pick<
    ProductOffer,
    "status" | "sellerId" | "buyerId" | "proposedById"
  >,
  userId: string
) {
  if (offerRole(offer, userId) === null) return false;
  if (offer.status === "PENDING") return true;
  if (offer.status === "COUNTERED") return offer.proposedById !== userId;
  return false;
}

type Person = { id: string; displayName: string; avatarUrl: string | null };

export function serializeOffer(
  offer: ProductOffer,
  extra?: {
    viewerId?: string;
    seller?: Person | null;
    buyer?: Person | null;
    proposals?: Array<{
      id: string;
      authorId: string;
      priceCents: number;
      note: string;
      createdAt: Date;
    }>;
  }
) {
  const agreed = agreedPriceCents(offer);
  const viewerId = extra?.viewerId;
  return {
    id: offer.id,
    threadId: offer.threadId,
    sellerId: offer.sellerId,
    buyerId: offer.buyerId,
    photoUrl: offer.photoUrl,
    name: offer.name,
    description: offer.description,
    priceCents: offer.priceCents,
    currency: offer.currency,
    status: offer.status,
    proposedPriceCents: offer.proposedPriceCents,
    proposedById: offer.proposedById,
    proposedNote: offer.proposedNote,
    paymentId: offer.paymentId,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    agreedPriceCents: agreed,
    priceLabel: formatOfferAmount(offer.priceCents, offer),
    proposedPriceLabel:
      offer.proposedPriceCents != null
        ? formatOfferAmount(offer.proposedPriceCents, offer)
        : null,
    agreedPriceLabel: formatOfferAmount(agreed, offer),
    ...(viewerId
      ? {
          role: offerRole(offer, viewerId),
          canAccept: canAcceptOffer(offer, viewerId),
          canRefuse: canRefuseOffer(offer, viewerId),
          canPropose: canProposeOffer(offer, viewerId),
        }
      : {}),
    ...(extra?.seller !== undefined ? { seller: extra.seller } : {}),
    ...(extra?.buyer !== undefined ? { buyer: extra.buyer } : {}),
    ...(extra?.proposals
      ? {
          proposals: extra.proposals.map((p) => ({
            ...p,
            priceLabel: formatOfferAmount(p.priceCents, offer),
          })),
        }
      : {}),
  };
}

export async function loadOfferPeople(
  offer: Pick<ProductOffer, "sellerId" | "buyerId">
) {
  try {
    const users = await prisma.user.findMany({
      where: { id: { in: [offer.sellerId, offer.buyerId] } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    return {
      seller: users.find((u) => u.id === offer.sellerId) ?? null,
      buyer: users.find((u) => u.id === offer.buyerId) ?? null,
    };
  } catch (e) {
    console.error("[product-offers] load people", e);
    return { seller: null, buyer: null };
  }
}

/** Insert a DM tied to an offer (contextType OFFER) and bump the thread. Never throws. */
export async function postOfferMessage(input: {
  threadId: string | null | undefined;
  senderId: string;
  offerId: string;
  body: string;
}) {
  if (!input.threadId) return;
  try {
    await prisma.directMessage.create({
      data: {
        threadId: input.threadId,
        senderId: input.senderId,
        body: input.body,
        contextType: PRODUCT_OFFER_CONTEXT,
        contextId: input.offerId,
      },
    });
    await prisma.directThread.update({
      where: { id: input.threadId },
      data: { lastMessageAt: new Date() },
    });
  } catch (e) {
    console.error("[product-offers] dm insert", e);
  }
}

export const proposeSchema = z.object({
  price: z.coerce.number().positive().max(1_000_000),
  note: z.string().max(500).optional().default(""),
});

/** Shared error mapping for product-offer routes. */
export function productOfferErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const msg = error instanceof Error ? error.message : String(error);
  console.error("[product-offers]", error);
  if (/does not exist|P2021|ProductOffer/i.test(msg)) {
    return NextResponse.json(
      {
        error:
          "Table des offres produit absente. Exécutez prisma/neon-product-offers.sql sur Neon.",
      },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}
