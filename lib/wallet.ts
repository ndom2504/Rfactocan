import { z } from "zod";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getHeraldAccruedBalanceCents,
  heraldPayoutMinCents,
  payoutHeraldAccrued,
} from "@/lib/herald-commissions";
import type { PayoutChannel, PayoutProvider } from "@/lib/user-intent";
import { travelerCanReceivePayments } from "@/lib/connect";

const PAYOUT_PROVIDERS = [
  "mobile_money",
  "orange_money",
  "moov_money",
  "mtn_momo",
  "airtel_money",
  "mpesa_vodacom",
  "interac",
] as const;

export const walletPayoutDestinationSchema = z.object({
  payoutChannel: z.enum(["bank", "mobile"]),
  payoutProvider: z.enum(PAYOUT_PROVIDERS).optional().nullable(),
  payoutIdentifier: z.string().max(120).optional().nullable(),
  payoutBankName: z.string().max(120).optional().nullable(),
  payoutBankHolder: z.string().max(120).optional().nullable(),
  payoutBankAccount: z.string().max(80).optional().nullable(),
  payoutBankIban: z.string().max(80).optional().nullable(),
});

export type WalletPayoutDestinationInput = z.infer<
  typeof walletPayoutDestinationSchema
>;

export type WalletPayoutDestination = {
  payoutChannel: PayoutChannel | null;
  payoutProvider: PayoutProvider | null;
  payoutIdentifier: string | null;
  payoutBankName: string | null;
  payoutBankHolder: string | null;
  payoutBankAccount: string | null;
  payoutBankIban: string | null;
  stripeConnectReady: boolean;
  canWithdrawMobile: boolean;
  canWithdrawBankManual: boolean;
  canWithdrawStripe: boolean;
};

export function selectPayoutFields(user: {
  payoutChannel?: string | null;
  payoutProvider?: string | null;
  payoutIdentifier?: string | null;
  payoutBankName?: string | null;
  payoutBankHolder?: string | null;
  payoutBankAccount?: string | null;
  payoutBankIban?: string | null;
  kycStatus: string;
  stripeConnectAccountId: string | null;
  stripeConnectChargesEnabled: boolean;
  stripeConnectPayoutsEnabled: boolean;
}): WalletPayoutDestination {
  const channel =
    user.payoutChannel === "bank" || user.payoutChannel === "mobile"
      ? user.payoutChannel
      : null;
  const stripeConnectReady = travelerCanReceivePayments(user);
  const mobileOk =
    channel === "mobile" && Boolean(user.payoutIdentifier?.trim());
  const bankManualOk =
    channel === "bank" &&
    Boolean(
      user.payoutBankAccount?.trim() ||
        user.payoutBankIban?.trim() ||
        user.payoutIdentifier?.trim()
    );

  return {
    payoutChannel: channel,
    payoutProvider: (user.payoutProvider as PayoutProvider) || null,
    payoutIdentifier: user.payoutIdentifier ?? null,
    payoutBankName: user.payoutBankName ?? null,
    payoutBankHolder: user.payoutBankHolder ?? null,
    payoutBankAccount: user.payoutBankAccount ?? null,
    payoutBankIban: user.payoutBankIban ?? null,
    stripeConnectReady,
    canWithdrawMobile: mobileOk,
    canWithdrawBankManual: bankManualOk,
    canWithdrawStripe: stripeConnectReady && channel === "bank",
  };
}

export async function getWalletPayoutDestination(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      payoutChannel: true,
      payoutProvider: true,
      payoutIdentifier: true,
      payoutBankName: true,
      payoutBankHolder: true,
      payoutBankAccount: true,
      payoutBankIban: true,
      kycStatus: true,
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
    },
  });
  if (!user) return null;
  return selectPayoutFields(user);
}

export async function saveWalletPayoutDestination(
  userId: string,
  input: WalletPayoutDestinationInput
) {
  const channel = input.payoutChannel;
  if (channel === "mobile") {
    const id = input.payoutIdentifier?.trim() ?? "";
    if (id.length < 6) {
      throw new Error(
        "Indiquez un numéro Mobile Money ou un identifiant de réception valide."
      );
    }
  }
  if (channel === "bank") {
    const hasBank =
      Boolean(input.payoutBankAccount?.trim()) ||
      Boolean(input.payoutBankIban?.trim()) ||
      Boolean(input.payoutIdentifier?.trim());
    // Bank via Stripe Connect alone is OK (identifier/account optional until Connect)
    if (!hasBank) {
      // allow empty bank details when user will use Stripe only
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      payoutChannel: channel,
      payoutProvider:
        channel === "mobile"
          ? input.payoutProvider?.trim() || "mobile_money"
          : input.payoutProvider?.trim() || null,
      payoutIdentifier: input.payoutIdentifier?.trim() || null,
      payoutBankName: input.payoutBankName?.trim() || null,
      payoutBankHolder: input.payoutBankHolder?.trim() || null,
      payoutBankAccount: input.payoutBankAccount?.trim() || null,
      payoutBankIban: input.payoutBankIban?.trim() || null,
    },
    select: {
      payoutChannel: true,
      payoutProvider: true,
      payoutIdentifier: true,
      payoutBankName: true,
      payoutBankHolder: true,
      payoutBankAccount: true,
      payoutBankIban: true,
      kycStatus: true,
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
    },
  });
}

function destinationSnapshot(user: {
  payoutChannel: string | null;
  payoutProvider: string | null;
  payoutIdentifier: string | null;
  payoutBankName: string | null;
  payoutBankHolder: string | null;
  payoutBankAccount: string | null;
  payoutBankIban: string | null;
}) {
  if (user.payoutChannel === "mobile") {
    const parts = [
      user.payoutProvider ?? "mobile_money",
      user.payoutIdentifier,
    ].filter(Boolean);
    return parts.join(" · ");
  }
  const bank = [
    user.payoutBankHolder,
    user.payoutBankName,
    user.payoutBankIban || user.payoutBankAccount || user.payoutIdentifier,
  ]
    .filter(Boolean)
    .join(" · ");
  return bank || "Banque (Stripe Connect)";
}

/**
 * Demande de retrait des commissions Héraut.
 * - bank + Connect OK → transfer Stripe auto
 * - mobile (Afrique) ou bank manuelle → WalletWithdrawal REQUESTED (admin envoie MoMo / virement)
 */
export async function requestHeraldWithdrawal(
  userId: string,
  opts?: { force?: boolean; note?: string }
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isAmbassador: true,
      kycStatus: true,
      payoutChannel: true,
      payoutProvider: true,
      payoutIdentifier: true,
      payoutBankName: true,
      payoutBankHolder: true,
      payoutBankAccount: true,
      payoutBankIban: true,
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
      preferredCurrency: true,
    },
  });
  if (!user) return { ok: false as const, error: "Utilisateur introuvable." };
  if (!user.isAmbassador) {
    return { ok: false as const, error: "Programme Héraut Réseau requis." };
  }
  if (user.kycStatus !== "VERIFIED") {
    return { ok: false as const, error: "KYC requis pour retirer vos gains." };
  }

  const dest = selectPayoutFields(user);
  const channel = dest.payoutChannel;
  if (!channel) {
    return {
      ok: false as const,
      error:
        "Liez un compte mobile money ou un compte bancaire dans Profil avant de retirer.",
    };
  }

  const pending = await prisma.walletWithdrawal.findFirst({
    where: {
      userId,
      status: { in: ["REQUESTED", "APPROVED"] },
      source: "HERALD_COMMISSIONS",
    },
  });
  if (pending) {
    return {
      ok: false as const,
      error:
        "Une demande de retrait est déjà en cours. Attendez le traitement avant d’en créer une autre.",
      withdrawalId: pending.id,
    };
  }

  const balance = await getHeraldAccruedBalanceCents(userId);
  const minCents = heraldPayoutMinCents();
  if (balance < 1) {
    return { ok: false as const, error: "Aucun solde à retirer." };
  }
  if (!opts?.force && balance < minCents) {
    return {
      ok: false as const,
      error: `Solde minimum pour retrait : ${(minCents / 100).toFixed(2)} (devise du portefeuille).`,
      amountCents: balance,
    };
  }

  // Stripe Connect path (bank, often Canada / gros volumes avec Stripe)
  if (
    channel === "bank" &&
    dest.canWithdrawStripe &&
    travelerCanReceivePayments(user)
  ) {
    const result = await payoutHeraldAccrued(userId, {
      force: true,
      note: opts?.note ?? "Retrait portefeuille Stripe",
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error, amountCents: result.amountCents };
    }
    if ("skipped" in result && result.skipped) {
      return { ok: false as const, error: result.reason, amountCents: result.amountCents };
    }
    const w = await prisma.walletWithdrawal.create({
      data: {
        userId,
        amountCents: result.amountCents,
        currency: "cad",
        status: "SENT",
        source: "HERALD_COMMISSIONS",
        channel: "stripe",
        provider: "stripe",
        destinationHint: destinationSnapshot(user),
        heraldPayoutId: result.payoutId,
        processedAt: new Date(),
        note: opts?.note ?? null,
      },
    });
    return {
      ok: true as const,
      mode: "stripe" as const,
      withdrawalId: w.id,
      amountCents: result.amountCents,
      stripeTransferId: result.stripeTransferId,
    };
  }

  // Mobile money (Afrique) ou banque manuelle (RIB / compte local)
  if (channel === "mobile" && !dest.canWithdrawMobile) {
    return {
      ok: false as const,
      error: "Renseignez votre numéro Mobile Money dans Profil.",
    };
  }
  if (channel === "bank" && !dest.canWithdrawBankManual && !dest.canWithdrawStripe) {
    return {
      ok: false as const,
      error:
        "Renseignez un RIB / numéro de compte, ou activez Stripe Connect pour les virements automatiques.",
    };
  }

  const currency = (user.preferredCurrency || "CAD").toLowerCase();
  const withdrawal = await prisma.walletWithdrawal.create({
    data: {
      userId,
      amountCents: balance,
      currency,
      status: "REQUESTED",
      source: "HERALD_COMMISSIONS",
      channel,
      provider:
        channel === "mobile"
          ? user.payoutProvider ?? "mobile_money"
          : "bank",
      destinationHint: destinationSnapshot(user),
      bankName: user.payoutBankName,
      bankHolder: user.payoutBankHolder,
      bankAccount: user.payoutBankAccount,
      bankIban: user.payoutBankIban,
      note: opts?.note ?? null,
    },
  });

  // Hold: mark commissions HELD while withdrawal pending
  await prisma.heraldCommission.updateMany({
    where: { heraldId: userId, status: "ACCRUED" },
    data: {
      status: "HELD",
      note: `withdrawal:${withdrawal.id}`,
    },
  });

  return {
    ok: true as const,
    mode: "manual" as const,
    withdrawalId: withdrawal.id,
    amountCents: balance,
    channel,
    destinationHint: withdrawal.destinationHint,
  };
}

export async function adminCompleteWalletWithdrawal(
  withdrawalId: string,
  adminId: string,
  opts: { mark: "SENT" | "FAILED" | "CANCELLED"; adminNote?: string }
) {
  const w = await prisma.walletWithdrawal.findUnique({
    where: { id: withdrawalId },
  });
  if (!w) return { ok: false as const, error: "Retrait introuvable." };
  if (!["REQUESTED", "APPROVED"].includes(w.status)) {
    return { ok: false as const, error: `Statut non modifiable (${w.status}).` };
  }

  if (opts.mark === "SENT") {
    await prisma.$transaction(async (tx) => {
      await tx.walletWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: "SENT",
          processedById: adminId,
          processedAt: new Date(),
          adminNote: opts.adminNote ?? null,
        },
      });
      if (w.source === "HERALD_COMMISSIONS") {
        await tx.heraldCommission.updateMany({
          where: {
            heraldId: w.userId,
            status: "HELD",
            note: `withdrawal:${withdrawalId}`,
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });
      }
    });
    return { ok: true as const, status: "SENT" as const };
  }

  // FAILED or CANCELLED → release hold back to ACCRUED
  await prisma.$transaction(async (tx) => {
    await tx.walletWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: opts.mark,
        processedById: adminId,
        processedAt: new Date(),
        adminNote: opts.adminNote ?? null,
      },
    });
    if (w.source === "HERALD_COMMISSIONS") {
      await tx.heraldCommission.updateMany({
        where: {
          heraldId: w.userId,
          status: "HELD",
          note: `withdrawal:${withdrawalId}`,
        },
        data: {
          status: "ACCRUED",
          note: null,
        },
      });
    }
  });

  return { ok: true as const, status: opts.mark };
}

export type { User };
