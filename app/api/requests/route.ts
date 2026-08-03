import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  normalizeOrderNeedType,
  normalizeParcelOrderSide,
  type OrderNeedTypeId,
} from "@/lib/order-need";
import { prisma } from "@/lib/prisma";
import {
  getServiceType,
  isServiceCategoryId,
} from "@/lib/services-catalog";
import { isShopCategoryId } from "@/lib/shops-catalog";
import {
  normalizeTransportMode,
  normalizeTransportType,
} from "@/lib/transport";

const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const baseSchema = z.object({
  needType: z
    .enum(["PARCEL", "SERVICE", "PRODUCT"])
    .optional()
    .default("PARCEL"),
  /** Colis: envoyer | recevoir (or send | receive). */
  orderSide: z.string().optional(),
  orderIntent: z.string().optional(),
  fromCountry: z.string().min(2).optional(),
  fromCity: z.string().min(2).optional(),
  toCountry: z.string().min(2).optional(),
  toCity: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  weightKg: z.coerce.number().min(0).max(100).optional(),
  description: z.string().min(5).max(2000),
  photos: z.array(z.string()).max(5).optional(),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  declaredValue: z.coerce.number().nonnegative().optional(),
  desiredDate: z.string().optional(),
  transportMode: z.preprocess(
    emptyToUndefined,
    z.enum(["AIR", "SEA", "RAIL", "ROAD"]).optional()
  ),
  transportType: z.preprocess(emptyToUndefined, z.string().optional()),
  serviceCategory: z.string().optional(),
  serviceType: z.string().optional(),
  productCategory: z.string().optional(),
});

function serializeRequest(
  r: {
    photosJson: string;
  } & Record<string, unknown>
) {
  return {
    ...r,
    photos: JSON.parse(r.photosJson || "[]") as string[],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const needType = searchParams.get("needType");
  const session = await getSessionUser();

  const requests = await prisma.parcelRequest.findMany({
    where: {
      status: "OPEN",
      ...(mine && session ? { userId: session.id } : {}),
      ...(needType && ["PARCEL", "SERVICE", "PRODUCT"].includes(needType)
        ? { needType: needType as OrderNeedTypeId }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          ratingAvg: true,
          ratingCount: true,
          verifiedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    requests: requests.map(serializeRequest),
  });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = baseSchema.parse(await request.json());
    const needType = normalizeOrderNeedType(body.needType);
    const sideRaw = body.orderSide ?? body.orderIntent;
    const orderSide = normalizeParcelOrderSide(sideRaw);

    if (needType === "PARCEL") {
      const fromCountry = body.fromCountry?.trim();
      const fromCity = body.fromCity?.trim();
      const toCountry = body.toCountry?.trim();
      const toCity = body.toCity?.trim();
      const weightKg = body.weightKg ?? 0;
      if (!fromCountry || !fromCity || !toCountry || !toCity) {
        return NextResponse.json(
          { error: "Indiquez l'itinéraire (départ et arrivée)." },
          { status: 400 }
        );
      }
      if (!(weightKg > 0)) {
        return NextResponse.json(
          { error: "Indiquez le poids du colis (kg)." },
          { status: 400 }
        );
      }

      const transportMode = body.transportMode
        ? normalizeTransportMode(body.transportMode)
        : null;
      const transportType = transportMode
        ? normalizeTransportType(transportMode, body.transportType)
        : null;

      const parcel = await prisma.parcelRequest.create({
        data: {
          userId: session.id,
          needType: "PARCEL",
          orderSide: orderSide ?? "send",
          fromCountry,
          fromCity,
          toCountry,
          toCity,
          weightKg,
          description: body.description,
          photosJson: JSON.stringify(body.photos ?? []),
          urgency: body.urgency,
          declaredValue: body.declaredValue,
          desiredDate: body.desiredDate ? new Date(body.desiredDate) : null,
          transportMode: transportMode ?? undefined,
          transportType,
        },
      });
      return NextResponse.json(
        { request: serializeRequest(parcel) },
        { status: 201 }
      );
    }

    if (needType === "SERVICE") {
      const country = (
        body.country ||
        body.toCountry ||
        body.fromCountry ||
        ""
      ).trim();
      const city = (body.city || body.toCity || body.fromCity || "").trim();
      const serviceCategory = (body.serviceCategory || "").trim();
      const serviceType = (body.serviceType || "").trim();

      if (!country || !city) {
        return NextResponse.json(
          { error: "Indiquez le pays et la ville du service." },
          { status: 400 }
        );
      }
      if (!serviceCategory || !isServiceCategoryId(serviceCategory)) {
        return NextResponse.json(
          { error: "Catégorie de service invalide." },
          { status: 400 }
        );
      }
      if (serviceCategory === "colis") {
        return NextResponse.json(
          {
            error:
              "Pour un colis, choisissez le type « Colis » dans le formulaire.",
          },
          { status: 400 }
        );
      }
      if (!serviceType || !getServiceType(serviceCategory, serviceType)) {
        return NextResponse.json(
          { error: "Type de service invalide." },
          { status: 400 }
        );
      }

      const created = await prisma.parcelRequest.create({
        data: {
          userId: session.id,
          needType: "SERVICE",
          serviceCategory,
          serviceType,
          fromCountry: country,
          fromCity: city,
          toCountry: country,
          toCity: city,
          weightKg: 0,
          description: body.description,
          photosJson: JSON.stringify(body.photos ?? []),
          urgency: body.urgency,
          declaredValue: body.declaredValue,
          desiredDate: body.desiredDate ? new Date(body.desiredDate) : null,
        },
      });
      return NextResponse.json(
        { request: serializeRequest(created) },
        { status: 201 }
      );
    }

    // PRODUCT
    const country = (
      body.country ||
      body.toCountry ||
      body.fromCountry ||
      ""
    ).trim();
    const city = (body.city || body.toCity || body.fromCity || "").trim();
    const productCategory = (body.productCategory || "").trim();

    if (!country || !city) {
      return NextResponse.json(
        { error: "Indiquez le lieu de livraison (pays, ville)." },
        { status: 400 }
      );
    }
    if (!productCategory || !isShopCategoryId(productCategory)) {
      return NextResponse.json(
        { error: "Catégorie de produit invalide." },
        { status: 400 }
      );
    }

    const created = await prisma.parcelRequest.create({
      data: {
        userId: session.id,
        needType: "PRODUCT",
        productCategory,
        fromCountry: country,
        fromCity: city,
        toCountry: country,
        toCity: city,
        weightKg: 0,
        description: body.description,
        photosJson: JSON.stringify(body.photos ?? []),
        urgency: body.urgency,
        declaredValue: body.declaredValue,
        desiredDate: body.desiredDate ? new Date(body.desiredDate) : null,
      },
    });
    return NextResponse.json(
      { request: serializeRequest(created) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
