import { getAppUrl } from "@/lib/app-url";
import { travelerCanReceivePayments } from "@/lib/connect";
import {
  toStripeCurrency,
  type MoneyCurrency,
  normalizeCurrency,
} from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { effectiveProductPriceCents } from "@/lib/shops-catalog";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

function platformFeeBps() {
  const raw = process.env.PLATFORM_FEE_BPS;
  const parsed = raw ? Number(raw) : 1000;
  return Number.isFinite(parsed) ? Math.floor(parsed) : 1000;
}

export async function createShopCheckout(input: {
  productId: string;
  buyerId: string;
  buyerEmail: string;
  quantity?: number;
}) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe n'est pas configuré");
  }

  const quantity = Math.max(1, Math.min(input.quantity ?? 1, 20));

  const product = await prisma.shopProduct.findUnique({
    where: { id: input.productId },
    include: {
      shop: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              kycStatus: true,
              stripeConnectAccountId: true,
              stripeConnectChargesEnabled: true,
              stripeConnectPayoutsEnabled: true,
            },
          },
        },
      },
    },
  });

  if (!product || !product.active) {
    throw new Error("Produit introuvable ou indisponible");
  }
  if (product.shop.status !== "OPEN") {
    throw new Error("Cette boutique n'est pas ouverte");
  }
  if (product.shop.userId === input.buyerId) {
    throw new Error("Vous ne pouvez pas acheter votre propre produit");
  }
  if (product.stockQty != null && product.stockQty < quantity) {
    throw new Error(
      product.stockQty <= 0
        ? "Produit en rupture de stock."
        : `Stock insuffisant (disponible : ${product.stockQty}).`
    );
  }

  const seller = product.shop.user;
  if (!travelerCanReceivePayments(seller) || !seller.stripeConnectAccountId) {
    throw new Error(
      "Le vendeur n'a pas encore activé les paiements (KYC + Stripe Connect)."
    );
  }

  const unitPriceCents = effectiveProductPriceCents(product);
  const amountCents = unitPriceCents * quantity;
  if (amountCents <= 0) {
    throw new Error("Montant invalide");
  }

  const feeBps = platformFeeBps();
  const platformFeeCents = Math.floor((amountCents * feeBps) / 10000);
  const sellerPayoutCents = amountCents - platformFeeCents;

  const currencyCode =
    (normalizeCurrency(product.shop.currency) as MoneyCurrency | null) ?? "CAD";
  const stripeCurrency = toStripeCurrency(currencyCode);

  const order = await prisma.shopOrder.create({
    data: {
      shopId: product.shopId,
      buyerId: input.buyerId,
      productId: product.id,
      quantity,
      unitPriceCents,
      amountCents,
      platformFeeCents,
      sellerPayoutCents,
      currency: stripeCurrency,
      status: "AWAITING_PAYMENT",
    },
  });

  const stripe = getStripe();
  const appUrl = getAppUrl();

  let customerId: string | undefined;
  const buyer = await prisma.user.findUnique({
    where: { id: input.buyerId },
    select: { stripeCustomerId: true },
  });
  if (buyer?.stripeCustomerId) {
    customerId = buyer.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: input.buyerEmail,
      metadata: { userId: input.buyerId },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: input.buyerId },
      data: { stripeCustomerId: customer.id },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: order.id,
    line_items: [
      {
        quantity,
        price_data: {
          currency: stripeCurrency,
          unit_amount: unitPriceCents,
          product_data: {
            name: product.title,
            description: `${product.shop.name} — Rfacto Boutique`,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: seller.stripeConnectAccountId,
      },
      metadata: {
        type: "shop_order",
        shopOrderId: order.id,
        shopId: product.shopId,
        productId: product.id,
        buyerId: input.buyerId,
        sellerId: seller.id,
      },
    },
    metadata: {
      type: "shop_order",
      shopOrderId: order.id,
      shopId: product.shopId,
      productId: product.id,
      buyerId: input.buyerId,
    },
    success_url: `${appUrl}/shops/orders/${order.id}?paid=1`,
    cancel_url: `${appUrl}/shops/product/${product.id}?payment=cancel`,
  });

  await prisma.shopOrder.update({
    where: { id: order.id },
    data: {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
    },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout URL manquante");
  }

  return { checkoutUrl: session.url, orderId: order.id };
}

export async function markShopOrderPaid(opts: {
  orderId?: string | null;
  sessionId?: string | null;
  paymentIntentId?: string | null;
}) {
  const where = opts.orderId
    ? { id: opts.orderId }
    : opts.sessionId
      ? { stripeCheckoutSessionId: opts.sessionId }
      : opts.paymentIntentId
        ? { stripePaymentIntentId: opts.paymentIntentId }
        : null;
  if (!where) return null;

  const order = await prisma.shopOrder.findFirst({
    where,
    include: { product: { select: { id: true, stockQty: true } } },
  });
  if (!order) return null;
  if (order.status === "PAID" || order.status === "FULFILLED") {
    try {
      const { accrueForShopOrder } = await import("@/lib/herald-commissions");
      await accrueForShopOrder(order.id);
    } catch (err) {
      console.error("Herald commission shop (already paid)", order.id, err);
    }
    return order;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.shopOrder.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        ...(opts.paymentIntentId
          ? { stripePaymentIntentId: opts.paymentIntentId }
          : {}),
        ...(opts.sessionId ? { stripeCheckoutSessionId: opts.sessionId } : {}),
      },
    });

    if (order.product.stockQty != null) {
      await tx.shopProduct.update({
        where: { id: order.productId },
        data: {
          stockQty: {
            decrement: Math.min(order.quantity, order.product.stockQty),
          },
        },
      });
    }

    return next;
  });

  try {
    const { accrueForShopOrder } = await import("@/lib/herald-commissions");
    await accrueForShopOrder(updated.id);
  } catch (err) {
    console.error("Herald commission shop paid", updated.id, err);
  }

  return updated;
}
