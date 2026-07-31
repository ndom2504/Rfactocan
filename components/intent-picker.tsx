"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/locale-provider";
import type { CarrierType, PrimaryIntent } from "@/lib/user-intent";

type Props = {
  primaryIntent: PrimaryIntent;
  carrierType: CarrierType;
  onPrimaryIntentChange: (v: PrimaryIntent) => void;
  onCarrierTypeChange: (v: CarrierType) => void;
  showHints?: boolean;
};

export function IntentPicker({
  primaryIntent,
  carrierType,
  onPrimaryIntentChange,
  onCarrierTypeChange,
  showHints = true,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="primaryIntent">{t("intent_label")}</Label>
        <Select
          id="primaryIntent"
          value={primaryIntent}
          onChange={(e) =>
            onPrimaryIntentChange(e.target.value as PrimaryIntent)
          }
        >
          <option value="vendre">{t("intent_vendre")}</option>
          <option value="payer">{t("intent_payer")}</option>
          <option value="both">{t("intent_both")}</option>
        </Select>
        {showHints && (
          <p className="text-xs text-[var(--muted)]">{t("intent_hint")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountStatus">{t("account_status")}</Label>
        <Select
          id="accountStatus"
          value={carrierType}
          onChange={(e) => onCarrierTypeChange(e.target.value as CarrierType)}
        >
          <option value="particulier">{t("carrier_particulier")}</option>
          <option value="commercial">{t("carrier_commercial")}</option>
        </Select>
        {showHints && (
          <p className="text-xs text-[var(--muted)]">{t("account_status_hint")}</p>
        )}
      </div>
    </div>
  );
}
