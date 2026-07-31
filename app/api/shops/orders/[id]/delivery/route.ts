import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  toCountry: z.string().min(2).max(3),
  toCity: z.string().min(1).max(120),
  mode: z.enum(["MATCH_ONLY", "PARCEL_PAID"]),
  weightKg: z.number().positive().max(200).optional(),
});

export async function POST(request: Request, context: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = schema.parse(await request.json());
    const toCountry = body.toCountry.trim().toUpperCase();
    const toCity = body.toCity.trim();
    const weightKg = body.weightKg ?? 1;

    const order = await prisma.shopOrder.findUnique({
      where: { id },
      include: {
        product: true,
        shop: {
          select: {
            id: true,
            name: true,
            userId: true,
            city: true,
            country: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    if (order.buyerId !== session.id) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }
    if (order.status !== "PAID" && order.status !== "FULFILLED") {
      return NextResponse.json(
        { error: "La commande doit être payée avant d'organiser la livraison." },
        { status: 400 }
      );
    }
    if (order.deliveryMode !== "NONE" || order.parcelRequestId) {
      return NextResponse.json(
        { error: "La livraison est déjà organisée pour cette commande." },
        { status: 400 }
      );
    }

    const fromCountry = order.shop.country.trim().toUpperCase();
    const fromCity = order.shop.city.trim();
    const description = `Commande boutique « ${order.product.title} » (x${order.quantity}) — ${order.shop.name}`;
    const photos = order.product.photoUrl ? [order.product.photoUrl] : [];

    if (body.mode === "MATCH_ONLY") {
      const updated = await prisma.shopOrder.update({
        where: { id },
        data: {
          deliveryToCountry: toCountry,
          deliveryToCity: toCity,
          deliveryMode: "MATCH_ONLY",
        },
        include: {
          product: true,
          shop: {
            select: {
              id: true,
              name: true,
              userId: true,
              city: true,
              country: true,
            },
          },
          parcelRequest: true,
        },
      });
      return NextResponse.json({ order: updated });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const parcel = await tx.parcelRequest.create({
        data: {
          userId: session.id,
          fromCountry,
          fromCity,
          toCountry,
          toCity,
          weightKg,
          description,
          photosJson: JSON.stringify(photos),
          urgency: "NORMAL",
          declaredValue: order.amountCents / 100,
        },
      });

      return tx.shopOrder.update({
        where: { id },
        data: {
          deliveryToCountry: toCountry,
          deliveryToCity: toCity,
          deliveryMode: "PARCEL_PAID",
          parcelRequestId: parcel.id,
        },
        include: {
          product: true,
          shop: {
            select: {
              id: true,
              name: true,
              userId: true,
              city: true,
              country: true,
            },
          },
          parcelRequest: {
            select: {
              id: true,
              status: true,
              fromCountry: true,
              fromCity: true,
              toCountry: true,
              toCity: true,
              bookings: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { id: true, status: true },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ order: updated });
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
