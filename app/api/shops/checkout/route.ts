import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createShopCheckout } from "@/lib/shop-payments";

const schema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20).optional().default(1),
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const result = await createShopCheckout({
      productId: body.productId,
      buyerId: session.id,
      buyerEmail: session.email,
      quantity: body.quantity,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Paiement impossible";
    console.error("Shop checkout error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
