import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  findDeliveryCarriers,
  loadShopOrderForDeliveryAccess,
} from "@/lib/shop-order-delivery";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;
  const access = await loadShopOrderForDeliveryAccess(
    id,
    session.id,
    session.role
  );

  if (!access) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  if (access.forbidden || !access.order) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const order = access.order;
  const toCountry = order.deliveryToCountry;
  const toCity = order.deliveryToCity;
  if (!toCountry || !toCity) {
    return NextResponse.json(
      { error: "Destination de livraison non définie." },
      { status: 400 }
    );
  }

  const carriers = await findDeliveryCarriers({
    viewerId: session.id,
    fromCountry: order.shop.country,
    fromCity: order.shop.city,
    toCountry,
    toCity,
    weightKg: 1,
  });

  return NextResponse.json({
    from: { country: order.shop.country, city: order.shop.city },
    to: { country: toCountry, city: toCity },
    ...carriers,
  });
}
