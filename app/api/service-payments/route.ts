import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  assertBothVerified,
  assertThreadParticipant,
  getOrCreateDirectThread,
  otherUserId,
  userIsServiceProviderInThread,
} from "@/lib/dm";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/app-url";
import {
  majorToCents,
  quoteServiceFromTariff,
  servicePaymentDeadlineFrom,
  syncPendingServicePaymentsFromStripe,
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

    let threadId =
      typeof body.threadId === "string" ? body.threadId.trim() : "";
    let threadContextType: string | null = "SERVICE";
    let threadContextId: string | null = listing?.id ?? null;
    if (threadId) {
      const thread = await assertThreadParticipant(threadId, session.id);
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
      threadContextType = thread.lastContextType;
      threadContextId = listing?.id ?? thread.lastContextId;
    } else {
      const thread = await getOrCreateDirectThread({
        meId: session.id,
        peerId: body.clientId,
        contextType: "SERVICE",
        contextId: listing?.id ?? null,
      });
      threadId = thread.id;
      threadContextType = thread.lastContextType;
      threadContextId = listing?.id ?? thread.lastContextId;
    }

    const allowed = await userIsServiceProviderInThread({
      meId: session.id,
      peerId: body.clientId,
      threadId,
      lastContextType: threadContextType,
      lastContextId: threadContextId,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Seul le prestataire peut demander un paiement." },
        { status: 403 }
      );
    }

    const currency =
      normalizeCurrency(body.currency ?? listing?.currency ?? "CAD") ?? "CAD";
    const tariffCents = majorToCents(body.amount);
    if (tariffCents < 100) {
      return NextResponse.json(
        { error: "Montant minimum : 1,00 dans la devise choisie." },
        { status: 400 }
      );
    }
    const { amountCents, platformFeeCents, providerPayoutCents } =
      quoteServiceFromTariff(tariffCents);

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
        threadId,
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
    const payPath = `/service-payments/${payment.id}`;
    const payUrl = `${getAppUrl()}${payPath}`;
    const systemBody = `Demande de paiement : ${payment.title} · ${amountLabel}\n${payUrl}`;

    try {
      await prisma.directMessage.create({
        data: {
          threadId,
          senderId: session.id,
          body: systemBody,
          contextType: "SERVICE",
          contextId: payment.id,
        },
      });
      await prisma.directThread.update({
        where: { id: threadId },
        data: {
          lastMessageAt: new Date(),
          lastContextType: "SERVICE",
          ...(listing?.id ? { lastContextId: listing.id } : {}),
        },
      });
    } catch (e) {
      console.error("[service-payments] dm insert", e);
    }

    try {
      await notifyUser({
        userId: body.clientId,
        type: "SERVICE_PAYMENT",
        title: "Demande de paiement service",
        body: `${session.displayName} · ${payment.title} · ${amountLabel}`,
        href: payPath,
      });
    } catch (e) {
      console.error("[service-payments] notify", e);
    }

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error(error);
    if (/does not exist|P2021|ServicePaymentRequest/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Table des paiements services absente. Exécutez prisma/neon-service-payments.sql sur Neon.",
        },
        { status: 503 }
      );
    }
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
  const threadId = searchParams.get("threadId")?.trim() || "";
  const role = searchParams.get("role"); // client | provider | all

  let threadPeerId: string | null = null;
  if (threadId) {
    const thread = await assertThreadParticipant(threadId, session.id);
    if (!thread) {
      return NextResponse.json(
        { error: "Conversation introuvable." },
        { status: 404 }
      );
    }
    threadPeerId = otherUserId(thread, session.id);
  }

  const where = threadId
    ? {
        OR: [
          { threadId },
          {
            AND: [{ providerId: session.id }, { clientId: threadPeerId! }],
          },
          {
            AND: [{ providerId: threadPeerId! }, { clientId: session.id }],
          },
        ],
      }
    : role === "client"
      ? { clientId: session.id }
      : role === "provider"
        ? { providerId: session.id }
        : {
            OR: [{ clientId: session.id }, { providerId: session.id }],
          };

  try {
    const rows = await prisma.servicePaymentRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    const syncedRows = await syncPendingServicePaymentsFromStripe(rows);

    const userIds = [
      ...new Set(syncedRows.flatMap((r) => [r.providerId, r.clientId])),
    ];
    let people: Record<
      string,
      { id: string; displayName: string; avatarUrl: string | null }
    > = {};
    if (userIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, displayName: true, avatarUrl: true },
        });
        people = Object.fromEntries(users.map((u) => [u.id, u]));
      } catch (e) {
        console.error("[service-payments] list users", e);
      }
    }

    const payments = syncedRows.map((r) => ({
      ...r,
      provider: people[r.providerId] ?? {
        id: r.providerId,
        displayName: "",
        avatarUrl: null,
      },
      client: people[r.clientId] ?? {
        id: r.clientId,
        displayName: "",
        avatarUrl: null,
      },
    }));

    return NextResponse.json({ payments });
  } catch (e) {
    console.error("[service-payments] list", e);
    // Table / enum missing in Neon → do not break chat or inbox.
    return NextResponse.json({ payments: [] });
  }
}
