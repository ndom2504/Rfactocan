import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { assertThreadParticipant, otherUserId } from "@/lib/dm";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { normalizeCurrency } from "@/lib/currency";
import {
  PRODUCT_OFFER_MIN_CENTS,
  PRODUCT_OFFER_NOTIFICATION_TYPE,
  formatOfferAmount,
  majorToCents,
  offerPath,
  offerUrl,
  postOfferMessage,
  productOfferErrorResponse,
  serializeOffer,
} from "@/lib/product-offers";

const createSchema = z.object({
  threadId: z.string().min(1),
  photoUrl: z.string().max(2000).optional().nullable(),
  name: z.string().trim().min(3).max(160),
  description: z.string().max(2000).optional().default(""),
  price: z.coerce.number().positive().max(1_000_000),
  currency: z.string().min(3).max(4).optional(),
});

/** POST — seller (any authenticated user) offers a product to the peer in a thread. */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());

    const thread = await assertThreadParticipant(body.threadId, session.id);
    if (!thread) {
      return NextResponse.json(
        { error: "Conversation introuvable." },
        { status: 404 }
      );
    }
    const buyerId = otherUserId(thread, session.id);
    if (!buyerId || buyerId === session.id) {
      return NextResponse.json(
        { error: "Destinataire invalide." },
        { status: 400 }
      );
    }

    const currency = normalizeCurrency(body.currency ?? "CAD") ?? "CAD";
    const priceCents = majorToCents(body.price);
    if (priceCents < PRODUCT_OFFER_MIN_CENTS) {
      return NextResponse.json(
        { error: "Montant minimum : 1,00 dans la devise choisie." },
        { status: 400 }
      );
    }

    const photoUrl = body.photoUrl?.trim() || null;

    const offer = await prisma.productOffer.create({
      data: {
        threadId: thread.id,
        sellerId: session.id,
        buyerId,
        photoUrl,
        name: body.name.trim(),
        description: (body.description || "").trim(),
        priceCents,
        currency: currency.toLowerCase(),
        status: "PENDING",
      },
    });

    const amountLabel = formatOfferAmount(priceCents, offer);
    await postOfferMessage({
      threadId: thread.id,
      senderId: session.id,
      offerId: offer.id,
      body: `Offre produit : ${offer.name} · ${amountLabel}\n${offerUrl(offer.id)}`,
    });

    await notifyUser({
      userId: buyerId,
      type: PRODUCT_OFFER_NOTIFICATION_TYPE,
      title: "Nouvelle offre produit",
      body: `${session.displayName} · ${offer.name} · ${amountLabel}`,
      href: offerPath(offer.id),
    });

    return NextResponse.json(
      { offer: serializeOffer(offer, { viewerId: session.id }) },
      { status: 201 }
    );
  } catch (error) {
    return productOfferErrorResponse(error);
  }
}

/** GET — list my offers (optionally filtered by thread). */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId")?.trim() || "";
  const role = searchParams.get("role"); // buyer | seller | all

  if (threadId) {
    const thread = await assertThreadParticipant(threadId, session.id);
    if (!thread) {
      return NextResponse.json(
        { error: "Conversation introuvable." },
        { status: 404 }
      );
    }
  }

  const mine =
    role === "buyer"
      ? { buyerId: session.id }
      : role === "seller"
        ? { sellerId: session.id }
        : { OR: [{ buyerId: session.id }, { sellerId: session.id }] };
  const where = threadId ? { AND: [mine, { threadId }] } : mine;

  try {
    const rows = await prisma.productOffer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return NextResponse.json({
      offers: rows.map((o) => serializeOffer(o, { viewerId: session.id })),
    });
  } catch (e) {
    console.error("[product-offers] list", e);
    // Table missing in Neon → do not break chat.
    return NextResponse.json({ offers: [] });
  }
}
