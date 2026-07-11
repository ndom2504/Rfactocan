import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensurePaymentNotExpired, isPaymentExpired } from "@/lib/payments/expiry";
import { getPaymentProvider } from "@/lib/payments/provider";
import { effectivePricePerKg } from "@/lib/negotiation";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe n'est pas configuré." },
      { status: 503 }
    );
  }

  const { id: bookingId } = await params;
  await ensurePaymentNotExpired(bookingId);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      request: true,
      trip: { include: { user: true } },
      sender: true,
      payment: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }
  if (booking.senderId !== session.id) {
    return NextResponse.json(
      { error: "Seul l'expéditeur peut payer." },
      { status: 403 }
    );
  }
  if (booking.status !== "AWAITING_PAYMENT") {
    return NextResponse.json(
      {
        error: isPaymentExpired(booking)
          ? "Le délai de paiement de 24h est dépassé. L'offre est à nouveau disponible."
          : "Cette réservation n'attend pas de paiement.",
      },
      { status: 400 }
    );
  }
  if (booking.request.status === "MATCHED") {
    return NextResponse.json(
      {
        error:
          "Cette demande a déjà été payée par une autre offre. Le lien de paiement n'est plus valide.",
      },
      { status: 409 }
    );
  }
  if (
    booking.paymentExpiresAt &&
    booking.paymentExpiresAt.getTime() <= Date.now()
  ) {
    await ensurePaymentNotExpired(bookingId);
    return NextResponse.json(
      {
        error:
          "Le délai de paiement de 24h est dépassé. Le lien n'est plus disponible.",
      },
      { status: 400 }
    );
  }

  if (booking.payment?.status === "AUTHORIZED") {
    return NextResponse.json(
      {
        error: "Le paiement est déjà sécurisé pour cette réservation.",
        alreadyPaid: true,
      },
      { status: 400 }
    );
  }
  if (booking.payment?.status === "CAPTURED") {
    return NextResponse.json(
      { error: "Ce paiement a déjà été capturé.", alreadyPaid: true },
      { status: 400 }
    );
  }

  const traveler = booking.trip.user;
  if (
    traveler.kycStatus !== "VERIFIED" ||
    !traveler.stripeConnectAccountId ||
    !traveler.stripeConnectChargesEnabled
  ) {
    return NextResponse.json(
      {
        error:
          "Le voyageur n'a pas encore configuré la réception de ses gains (identité / compte bancaire).",
      },
      { status: 400 }
    );
  }

  try {
    const payer = await prisma.user.findUnique({
      where: { id: session.id },
      select: { preferredCurrency: true, email: true },
    });
    const preferredCurrency = payer?.preferredCurrency || "CAD";

    const provider = getPaymentProvider();
    const result = await provider.createAuthorization({
      bookingId: booking.id,
      weightKg: booking.request.weightKg,
      pricePerKgCad: effectivePricePerKg(booking),
      tripCurrency: booking.trip.currency,
      senderEmail: payer?.email ?? booking.sender.email,
      senderId: booking.senderId,
      travelerConnectAccountId: traveler.stripeConnectAccountId,
      fromCountry: booking.request.fromCountry,
      toCountry: booking.request.toCountry,
      preferredCurrency,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de créer le paiement." },
      { status: 500 }
    );
  }
}

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id: bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      trip: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  const isParty =
    booking.senderId === session.id ||
    booking.trip.userId === session.id ||
    session.role === "ADMIN";
  if (!isParty) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  return NextResponse.json({ payment: booking.payment });
}
