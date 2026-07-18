"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  const [channel, setChannel] = useState<PayoutChannel>("bank");
  const [provider, setProvider] = useState<PayoutProvider>("mobile_money");
  const [identifier, setIdentifier] = useState("");
  const [ready, setReady] = useState(false);

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

  function persist(partial: {
    payoutChannel?: PayoutChannel;
    payoutProvider?: PayoutProvider;
    payoutIdentifier?: string;
  }) {
    saveUserIntent(partial);
  }

  useEffect(() => {
    const prefs = loadUserIntent();
    setChannel(prefs.payoutChannel);
    setProvider(prefs.payoutProvider);
    setIdentifier(prefs.payoutIdentifier);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!mobileProviders.includes(provider)) {
      const next = mobileProviders[0];
      if (next) {
        setProvider(next);
        persist({ payoutProvider: next });
      }
    }
    if (channel === "bank" && !allowBank && allowMobile) {
      setChannel("mobile");
      persist({ payoutChannel: "mobile" });
    }
    if (channel === "mobile" && !allowMobile && allowBank) {
      setChannel("bank");
      persist({ payoutChannel: "bank" });
    }
  }, [ready, mobileProviders, provider, channel, allowBank, allowMobile]);

  if (!ready) return null;

  return (
    <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
      <div className="space-y-2">
        <Label htmlFor="payoutChannel">{t("payout_channel")}</Label>
        <Select
          id="payoutChannel"
          value={channel}
          onChange={(e) => {
            const v = e.target.value as PayoutChannel;
            setChannel(v);
            persist({ payoutChannel: v });
          }}
        >
          {allowBank && <option value="bank">{t("payout_bank")}</option>}
          {allowMobile && <option value="mobile">{t("payout_mobile")}</option>}
        </Select>
        <p className="text-xs text-[var(--muted)]">{t("payout_channel_hint")}</p>
      </div>

      {channel === "bank" && bankSlot}

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
                persist({ payoutProvider: v });
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
                persist({ payoutIdentifier: e.target.value });
              }}
              placeholder={
                provider === "interac" ? "email@exemple.com" : "+1…"
              }
            />
            <p className="text-xs text-[var(--muted)]">
              {t("payout_identifier_hint")}
            </p>
          </div>
          {identifier.trim() && (
            <p className="text-xs text-[var(--accent)]">
              {t("payout_mobile_saved")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
