"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";
import { paymentsForCountry } from "@/lib/countries";
import { resolveCountryCode } from "@/lib/detect-country";
import {
  loadUserIntent,
  payoutProviderLabelKey,
  saveUserIntent,
  type PayoutChannel,
  type PayoutProvider,
} from "@/lib/user-intent";

const ALL_MOBILE_PROVIDERS: PayoutProvider[] = [
  "mobile_money",
  "orange_money",
  "moov_money",
  "mtn_momo",
  "airtel_money",
  "mpesa_vodacom",
  "interac",
];

type Props = {
  /** When true, show bank Stripe CTA slot via children when channel is bank */
  bankSlot?: React.ReactNode;
  /** ISO country code — filtre les opérateurs selon `lib/countries`. */
  countryCode?: string | null;
};

export function PayoutChannelPicker({ bankSlot, countryCode }: Props) {
  const { t } = useI18n();
  const [channel, setChannel] = useState<PayoutChannel>("mobile");
  const [provider, setProvider] = useState<PayoutProvider>("mobile_money");
  const [identifier, setIdentifier] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolvedCode = useMemo(
    () => resolveCountryCode(countryCode) ?? countryCode ?? null,
    [countryCode]
  );

  const countryPayments = useMemo(
    () => (resolvedCode ? paymentsForCountry(resolvedCode) : null),
    [resolvedCode]
  );

  const mobileProviders = useMemo(() => {
    if (!countryPayments) return ALL_MOBILE_PROVIDERS;
    const allowed = ALL_MOBILE_PROVIDERS.filter((p) =>
      countryPayments.includes(p)
    );
    return allowed.length > 0 ? allowed : ALL_MOBILE_PROVIDERS;
  }, [countryPayments]);

  const allowBank =
    !countryPayments ||
    countryPayments.includes("bank") ||
    countryPayments.includes("stripe");

  const allowMobile =
    !countryPayments ||
    mobileProviders.some((p) => countryPayments.includes(p));

  function persistLocal(partial: {
    payoutChannel?: PayoutChannel;
    payoutProvider?: PayoutProvider;
    payoutIdentifier?: string;
  }) {
    saveUserIntent(partial);
  }

  async function saveToServer(override?: {
    payoutChannel?: PayoutChannel;
    payoutProvider?: PayoutProvider;
    payoutIdentifier?: string;
    payoutBankName?: string;
    payoutBankHolder?: string;
    payoutBankAccount?: string;
    payoutBankIban?: string;
  }) {
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    const ch = override?.payoutChannel ?? channel;
    const body = {
      payoutChannel: ch,
      payoutProvider: override?.payoutProvider ?? provider,
      payoutIdentifier: override?.payoutIdentifier ?? identifier,
      payoutBankName: override?.payoutBankName ?? bankName,
      payoutBankHolder: override?.payoutBankHolder ?? bankHolder,
      payoutBankAccount: override?.payoutBankAccount ?? bankAccount,
      payoutBankIban: override?.payoutBankIban ?? bankIban,
    };
    try {
      const res = await fetch("/api/wallet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("wallet_save_error"));
        return;
      }
      persistLocal({
        payoutChannel: ch,
        payoutProvider: body.payoutProvider as PayoutProvider,
        payoutIdentifier: body.payoutIdentifier,
      });
      setSavedMsg(t("wallet_linked_ok"));
    } catch {
      setError(t("wallet_save_error"));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const local = loadUserIntent();
      try {
        const res = await fetch("/api/wallet");
        if (res.ok) {
          const data = await res.json();
          const d = data.destination;
          if (!cancelled && d) {
            const ch =
              d.payoutChannel === "bank" || d.payoutChannel === "mobile"
                ? d.payoutChannel
                : local.payoutChannel;
            const isCanada = resolvedCode === "CA";
            const noSavedPayout =
              !d.payoutIdentifier?.trim() &&
              !d.payoutProvider &&
              !d.payoutChannel;
            setChannel(
              isCanada && noSavedPayout ? "mobile" : ch
            );
            setProvider(
              (isCanada && noSavedPayout
                ? "interac"
                : (d.payoutProvider as PayoutProvider)) ||
                local.payoutProvider
            );
            setIdentifier(d.payoutIdentifier || local.payoutIdentifier || "");
            setBankName(d.payoutBankName || "");
            setBankHolder(d.payoutBankHolder || "");
            setBankAccount(d.payoutBankAccount || "");
            setBankIban(d.payoutBankIban || "");
            setReady(true);
            return;
          }
        }
      } catch {
        /* offline → local */
      }
      if (!cancelled) {
        const isCanada = resolvedCode === "CA";
        const useCanadaInteracDefaults =
          isCanada &&
          !local.payoutIdentifier &&
          local.payoutProvider === "mobile_money" &&
          local.payoutChannel === "bank";
        setChannel(
          useCanadaInteracDefaults ? "mobile" : local.payoutChannel
        );
        setProvider(
          useCanadaInteracDefaults ? "interac" : local.payoutProvider
        );
        setIdentifier(local.payoutIdentifier);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedCode]);

  useEffect(() => {
    if (!ready) return;
    if (!mobileProviders.includes(provider)) {
      const next = mobileProviders[0];
      if (next) {
        setProvider(next);
        persistLocal({ payoutProvider: next });
      }
    }
    if (channel === "bank" && !allowBank && allowMobile) {
      setChannel("mobile");
      persistLocal({ payoutChannel: "mobile" });
    }
    if (channel === "mobile" && !allowMobile && allowBank) {
      setChannel("bank");
      persistLocal({ payoutChannel: "bank" });
    }
  }, [ready, mobileProviders, provider, channel, allowBank, allowMobile]);

  if (!ready) return null;

  return (
    <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--foreground)]">
          {t("wallet_title")}
        </p>
        <p className="text-xs text-[var(--muted)]">{t("wallet_lead")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payoutChannel">{t("payout_channel")}</Label>
        <Select
          id="payoutChannel"
          value={channel}
          onChange={(e) => {
            const v = e.target.value as PayoutChannel;
            setChannel(v);
            persistLocal({ payoutChannel: v });
          }}
        >
          {allowMobile && (
            <option value="mobile">{t("payout_mobile")}</option>
          )}
          {allowBank && <option value="bank">{t("payout_bank")}</option>}
        </Select>
        <p className="text-xs text-[var(--muted)]">{t("payout_channel_hint")}</p>
      </div>

      {channel === "bank" && (
        <div className="space-y-3">
          {bankSlot}
          <p className="text-xs text-[var(--muted)]">{t("wallet_bank_manual_hint")}</p>
          <div className="space-y-2">
            <Label htmlFor="bankHolder">{t("wallet_bank_holder")}</Label>
            <Input
              id="bankHolder"
              value={bankHolder}
              onChange={(e) => setBankHolder(e.target.value)}
              placeholder={t("wallet_bank_holder_ph")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">{t("wallet_bank_name")}</Label>
            <Input
              id="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder={t("wallet_bank_name_ph")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccount">{t("wallet_bank_account")}</Label>
            <Input
              id="bankAccount"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder={t("wallet_bank_account_ph")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankIban">{t("wallet_bank_iban")}</Label>
            <Input
              id="bankIban"
              value={bankIban}
              onChange={(e) => setBankIban(e.target.value)}
              placeholder="IBAN / RIB (optionnel)"
            />
          </div>
        </div>
      )}

      {channel === "mobile" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="payoutProvider">{t("payout_provider")}</Label>
            <Select
              id="payoutProvider"
              value={provider}
              onChange={(e) => {
                const v = e.target.value as PayoutProvider;
                setProvider(v);
                persistLocal({ payoutProvider: v });
              }}
            >
              {mobileProviders.map((p) => (
                <option key={p} value={p}>
                  {t(payoutProviderLabelKey(p))}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payoutIdentifier">{t("payout_identifier")}</Label>
            <Input
              id="payoutIdentifier"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                persistLocal({ payoutIdentifier: e.target.value });
              }}
              placeholder={
                provider === "interac" ? "email@exemple.com" : "+225…"
              }
            />
            <p className="text-xs text-[var(--muted)]">
              {t("payout_identifier_hint")}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => void saveToServer()}
        >
          {saving ? t("loading") : t("wallet_save_link")}
        </Button>
        {savedMsg && (
          <p className="text-xs text-[var(--accent)]">{savedMsg}</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
