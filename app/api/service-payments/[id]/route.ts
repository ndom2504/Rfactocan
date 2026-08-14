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
  payoutProvider: true,
  payoutIdentifier: true,
} as const;

function paymentPayload(
  payment: {
    currency: string;
    receiverHint: string | null;
    provider: {
      stripeConnectChargesEnabled: boolean;
      stripeConnectPayoutsEnabled: boolean;
      payoutProvider: string | null;
      payoutIdentifier: string | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  },
  role: string
) {
  const interacPreferred = isInteracPreferredCurrency(payment.currency);
  const interacReceiver =
    payment.receiverHint?.trim() ||
    providerInteracEmail(payment.provider) ||
    null;
  const { payoutIdentifier: _pi, payoutProvider: _pp, ...providerPublic } =
    payment.provider;

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
    return NextResponse.json(paymentPayload(updated, role));
  }

  const role =
    session.id === payment.providerId
      ? "provider"
      : session.id === payment.clientId
        ? "client"
        : "admin";
  return NextResponse.json(paymentPayload(payment, role));
}
