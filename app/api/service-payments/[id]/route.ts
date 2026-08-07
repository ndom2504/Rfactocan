import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

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
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          kycStatus: true,
          stripeConnectChargesEnabled: true,
          stripeConnectPayoutsEnabled: true,
        },
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
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            kycStatus: true,
            stripeConnectChargesEnabled: true,
            stripeConnectPayoutsEnabled: true,
          },
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
    return NextResponse.json({
      payment: updated,
      role:
        session.id === updated.providerId
          ? "provider"
          : session.id === updated.clientId
            ? "client"
            : "admin",
    });
  }

  return NextResponse.json({
    payment,
    role:
      session.id === payment.providerId
        ? "provider"
        : session.id === payment.clientId
          ? "client"
          : "admin",
  });
}
