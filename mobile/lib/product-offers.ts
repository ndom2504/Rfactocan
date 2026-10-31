export type ProductOffer = {
  id: string;
  threadId?: string | null;
  sellerId?: string | null;
  buyerId?: string | null;
  photoUrl?: string | null;
  name?: string | null;
  description?: string | null;
  priceCents?: number | null;
  currency?: string | null;
  status?: string | null;
  proposedPriceCents?: number | null;
  proposedById?: string | null;
  proposedNote?: string | null;
  paymentId?: string | null;
};

export function isProductOfferOpen(status?: string | null) {
  return status === "PENDING" || status === "COUNTERED";
}

export function productOfferIdFromBody(body: string) {
  return body.match(/\/product-offers\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;
}

export function stripProductOfferLinks(body: string) {
  return body
    .replace(/https?:\/\/\S*\/product-offers\/[a-zA-Z0-9_-]+/gi, "")
    .replace(/\/product-offers\/[a-zA-Z0-9_-]+/g, "")
    .trim();
}

export function offerIdFromMessage(message: {
  body?: string | null;
  contextType?: string | null;
  contextId?: string | null;
}) {
  const raw = message.body || "";
  const fromBody = productOfferIdFromBody(raw);
  if (fromBody) return fromBody;
  if (
    message.contextType === "OFFER" &&
    message.contextId &&
    /offre produit|product offer/i.test(raw)
  ) {
    return message.contextId;
  }
  return null;
}

export function agreedOfferCents(offer: ProductOffer) {
  if (
    offer.status === "COUNTERED" &&
    offer.proposedPriceCents != null &&
    Number.isFinite(offer.proposedPriceCents)
  ) {
    return offer.proposedPriceCents;
  }
  return offer.priceCents ?? 0;
}

export function canAcceptOffer(offer: ProductOffer, userId?: string | null) {
  if (!userId || !isProductOfferOpen(offer.status)) return false;
  if (offer.status === "PENDING") return offer.buyerId === userId;
  return offer.proposedById != null && offer.proposedById !== userId;
}

export function canRefuseOffer(offer: ProductOffer, userId?: string | null) {
  if (!userId || !isProductOfferOpen(offer.status)) return false;
  return offer.sellerId === userId || offer.buyerId === userId;
}

export function canProposeOffer(offer: ProductOffer, userId?: string | null) {
  if (!userId || !isProductOfferOpen(offer.status)) return false;
  if (offer.sellerId !== userId && offer.buyerId !== userId) return false;
  if (offer.status === "COUNTERED" && offer.proposedById === userId) return false;
  return true;
}
