import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { assertBothVerified, assertThreadParticipant } from "@/lib/dm";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  majorToCents,
  servicePaymentDeadlineFrom,
  splitServiceAmount,
} from "@/lib/service-payments";
import { resolveServiceReceiverHint } from "@/lib/service-interac";
import { formatMoneyFromCents } from "@/lib/currency";
import { normalizeCurrency } from "@/lib/currency";

const createSchema = z.object({
  clientId: z.string().min(1),
  threadId: z.string().min(1).optional(),
  listingId: z.string().min(1).optional(),
  title: z.string().min(3).max(160),
  description: z.string().max(2000).optional().default(""),
  amount: z.coerce.number().positive().max(1_000_000),
  currency: z.string().min(3).max(3).optional(),
  receiverHint: z.string().max(120).optional().nullable(),
});

/** POST — provider creates a service payment request (invoice). */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());
    if (body.clientId === session.id) {
      return NextResponse.json(
        { error: "Impossible de vous facturer vous-même." },
        { status: 400 }
      );
    }

    const verified = await assertBothVerified(session.id, body.clientId);
    if (!verified.ok) {
      return NextResponse.json(
        { error: verified.error, code: "code" in verified ? verified.code : undefined },
        { status: verified.status }
      );
    }

    if (body.threadId) {
      const thread = await assertThreadParticipant(body.threadId, session.id);
      if (!thread) {
        return NextResponse.json(
          { error: "Conversation introuvable." },
          { status: 404 }
        );
      }
      const other =
        thread.userLowId === session.id ? thread.userHighId : thread.userLowId;
      if (other !== body.clientId) {
        return NextResponse.json(
          { error: "Le client ne fait pas partie de cette conversation." },
          { status: 400 }
        );
      }
    }

    let listing = null as Awaited<
      ReturnType<typeof prisma.serviceListing.findUnique>
    >;
    if (body.listingId) {
      listing = await prisma.serviceListing.findUnique({
        where: { id: body.listingId },
      });
      // Ignore stale / foreign listing ids (e.g. lastContextId is a payment id).
      if (!listing || listing.userId !== session.id) {
        listing = null;
      }
    }

    const currency =
      normalizeCurrency(body.currency ?? listing?.currency ?? "CAD") ?? "CAD";
    const amountCents = majorToCents(body.amount);
    if (amountCents < 100) {
      return NextResponse.json(
        { error: "Montant minimum : 1,00 dans la devise choisie." },
        { status: 400 }
      );
    }
    const { platformFeeCents, providerPayoutCents } =
      splitServiceAmount(amountCents);

    let receiverHint = body.receiverHint?.trim() || null;
    try {
      const providerProfile = await prisma.user.findUnique({
        where: { id: session.id },
        select: {
          payoutChannel: true,
          payoutProvider: true,
          payoutIdentifier: true,
        },
      });
      if (providerProfile) {
        receiverHint = resolveServiceReceiverHint(
          body.receiverHint,
          providerProfile
        );
      }
    } catch (e) {
      console.error("[service-payments] payout lookup", e);
    }

    const payment = await prisma.servicePaymentRequest.create({
      data: {
        providerId: session.id,
        clientId: body.clientId,
        listingId: listing?.id ?? null,
        threadId: body.threadId ?? null,
        title: body.title.trim(),
        description: (body.description || "").trim(),
        amountCents,
        currency: currency.toLowerCase(),
        platformFeeCents,
        providerPayoutCents,
        status: "AWAITING_PAYMENT",
        receiverHint,
        expiresAt: servicePaymentDeadlineFrom(48),
      },
    });

    const amountLabel = formatMoneyFromCents(amountCents, currency);
    const systemBody = `Demande de paiement : ${payment.title} · ${amountLabel}\nPayer : /service-payments/${payment.id}`;

    if (body.threadId) {
      await prisma.directMessage.create({
        data: {
          threadId: body.threadId,
          senderId: session.id,
          body: systemBody,
          contextType: "SERVICE",
          contextId: payment.id,
        },
      });
      await prisma.directThread.update({
        where: { id: body.threadId },
        data: { lastMessageAt: new Date() },
      });
    }

    await notifyUser({
      userId: body.clientId,
      type: "SERVICE_PAYMENT",
      title: "Demande de paiement service",
      body: `${session.displayName} · ${payment.title} · ${amountLabel}`,
      href: `/service-payments/${payment.id}`,
    });

    return NextResponse.json({ payment }, { status: 201 });
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

/** GET — list my service payments (as client or provider). */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");
  const role = searchParams.get("role"); // client | provider | all

  const payments = await prisma.servicePaymentRequest.findMany({
    where: {
      ...(threadId ? { threadId } : {}),
      ...(role === "client"
        ? { clientId: session.id }
        : role === "provider"
          ? { providerId: session.id }
          : {
              OR: [{ clientId: session.id }, { providerId: session.id }],
            }),
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      provider: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
      client: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
      listing: {
        select: { id: true, title: true, category: true },
      },
    },
  });

  return NextResponse.json({ payments });
}
