import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isInteracPreferredCurrency,
  providerHasInteracConfigured,
  providerInteracEmail,
} from "@/lib/service-interac";

type Ctx = { params: Promise<{ id: string }> };

const providerSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
  kycStatus: true,
  stripeConnectChargesEnabled: true,
  stripeConnectPayoutsEnabled: true,
} as const;

async function withProviderPayout<T extends { providerId: string; provider: object }>(
  payment: T
) {
  let payoutProvider: string | null = null;
  let payoutIdentifier: string | null = null;
  try {
    const row = await prisma.user.findUnique({
      where: { id: payment.providerId },
      select: { payoutProvider: true, payoutIdentifier: true },
    });
    payoutProvider = row?.payoutProvider ?? null;
    payoutIdentifier = row?.payoutIdentifier ?? null;
  } catch (e) {
    console.error("[service-payments] payout lookup", e);
  }
  return {
    ...payment,
    provider: {
      ...payment.provider,
      payoutProvider,
      payoutIdentifier,
    },
  };
}

function paymentPayload(
  payment: {
    currency: string;
    receiverHint: string | null;
    provider: {
      stripeConnectChargesEnabled: boolean;
      stripeConnectPayoutsEnabled: boolean;
      payoutProvider: string | null;
      payoutIdentifier: string | null;
    };
  },
  role: string
) {
  const interacPreferred = isInteracPreferredCurrency(payment.currency);
  const interacReceiver =
    payment.receiverHint?.trim() ||
    providerInteracEmail(payment.provider) ||
    null;
  const providerPublic = { ...payment.provider };
  delete (providerPublic as { payoutIdentifier?: string | null }).payoutIdentifier;
  delete (providerPublic as { payoutProvider?: string | null }).payoutProvider;

  return {
    payment: {
      ...payment,
      provider: providerPublic,
    },
    role,
    interacPreferred,
    interacReceiver,
    providerInteracConfigured: providerHasInteracConfigured(payment.provider),
    providerCardEnabled:
      payment.provider.stripeConnectChargesEnabled &&
      payment.provider.stripeConnectPayoutsEnabled,
  };
}

export async function GET(_request: Request, ctx: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const payment = await prisma.servicePaymentRequest.findUnique({
    where: { id },
    include: {
      provider: {
        select: providerSelect,
      },
      client: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          preferredCurrency: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
          priceAmount: true,
          priceUnit: true,
          currency: true,
          category: true,
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (
    payment.clientId !== session.id &&
    payment.providerId !== session.id &&
    session.role !== "ADMIN"
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const expired =
    payment.expiresAt != null &&
    payment.expiresAt.getTime() <= Date.now() &&
    payment.status === "AWAITING_PAYMENT";

  if (expired) {
    const updated = await prisma.servicePaymentRequest.update({
      where: { id },
      data: { status: "EXPIRED" },
      include: {
        provider: {
          select: providerSelect,
        },
        client: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            preferredCurrency: true,
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            priceAmount: true,
            priceUnit: true,
            currency: true,
            category: true,
          },
        },
      },
    });
    const role =
      session.id === updated.providerId
        ? "provider"
        : session.id === updated.clientId
          ? "client"
          : "admin";
    return NextResponse.json(paymentPayload(await withProviderPayout(updated), role));
  }

  const role =
    session.id === payment.providerId
      ? "provider"
      : session.id === payment.clientId
        ? "client"
        : "admin";
  return NextResponse.json(paymentPayload(await withProviderPayout(payment), role));
}
