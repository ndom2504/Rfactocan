"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/locale-provider";
import {
  loadUserIntent,
  saveUserIntent,
  type PayoutChannel,
  type PayoutProvider,
} from "@/lib/user-intent";

type Props = {
  /** When true, show bank Stripe CTA slot via children when channel is bank */
  bankSlot?: React.ReactNode;
};

export function PayoutChannelPicker({ bankSlot }: Props) {
  const { t } = useI18n();
  const [channel, setChannel] = useState<PayoutChannel>("bank");
  const [provider, setProvider] = useState<PayoutProvider>("mobile_money");
  const [identifier, setIdentifier] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prefs = loadUserIntent();
    setChannel(prefs.payoutChannel);
    setProvider(prefs.payoutProvider);
    setIdentifier(prefs.payoutIdentifier);
    setReady(true);
  }, []);

  function persist(partial: {
    payoutChannel?: PayoutChannel;
    payoutProvider?: PayoutProvider;
    payoutIdentifier?: string;
  }) {
    saveUserIntent(partial);
  }

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
          <option value="bank">{t("payout_bank")}</option>
          <option value="mobile">{t("payout_mobile")}</option>
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
              <option value="mobile_money">{t("payout_mobile_money")}</option>
              <option value="orange_money">{t("payout_orange")}</option>
              <option value="airtel_money">{t("payout_airtel")}</option>
              <option value="interac">{t("payout_interac")}</option>
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
