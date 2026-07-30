import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markShopOrderPaid } from "@/lib/shop-payments";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  action: z.enum(["fulfill", "cancel", "sync_paid"]),
});

export async function GET(_request: Request, context: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;
  const order = await prisma.shopOrder.findUnique({
    where: { id },
    include: {
      product: true,
      shop: {
        select: {
          id: true,
          name: true,
          userId: true,
          currency: true,
        },
      },
      buyer: {
        select: { id: true, displayName: true, email: true },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const isBuyer = order.buyerId === session.id;
  const isSeller = order.shop.userId === session.id;
  if (!isBuyer && !isSeller && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  return NextResponse.json({ order, isBuyer, isSeller });
}

export async function PATCH(request: Request, context: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;
  const order = await prisma.shopOrder.findUnique({
    where: { id },
    include: { shop: { select: { userId: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  try {
    const body = patchSchema.parse(await request.json());

    if (body.action === "sync_paid") {
      if (order.buyerId !== session.id && order.shop.userId !== session.id) {
        return NextResponse.json({ error: "Interdit" }, { status: 403 });
      }
      const updated = await markShopOrderPaid({ orderId: id });
      return NextResponse.json({ order: updated ?? order });
    }

    if (body.action === "fulfill") {
      if (order.shop.userId !== session.id) {
        return NextResponse.json({ error: "Interdit" }, { status: 403 });
      }
      if (order.status !== "PAID") {
        return NextResponse.json(
          { error: "Seules les commandes payées peuvent être marquées remises." },
          { status: 400 }
        );
      }
      const updated = await prisma.shopOrder.update({
        where: { id },
        data: { status: "FULFILLED" },
      });
      return NextResponse.json({ order: updated });
    }

    if (body.action === "cancel") {
      if (order.shop.userId !== session.id && order.buyerId !== session.id) {
        return NextResponse.json({ error: "Interdit" }, { status: 403 });
      }
      if (order.status !== "AWAITING_PAYMENT") {
        return NextResponse.json(
          { error: "Cette commande ne peut plus être annulée." },
          { status: 400 }
        );
      }
      const updated = await prisma.shopOrder.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ order: updated });
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
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
