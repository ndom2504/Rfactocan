"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/locale-provider";
import type {
  CarrierType,
  OrderIntent,
  PrimaryIntent,
} from "@/lib/user-intent";

type Props = {
  primaryIntent: PrimaryIntent;
  carrierType: CarrierType;
  orderIntent: OrderIntent;
  onPrimaryIntentChange: (v: PrimaryIntent) => void;
  onCarrierTypeChange: (v: CarrierType) => void;
  onOrderIntentChange: (v: OrderIntent) => void;
  showHints?: boolean;
};

export function IntentPicker({
  primaryIntent,
  carrierType,
  orderIntent,
  onPrimaryIntentChange,
  onCarrierTypeChange,
  onOrderIntentChange,
  showHints = true,
}: Props) {
  const { t } = useI18n();
  const showCarrier = primaryIntent === "livrer" || primaryIntent === "both";
  const showOrder = primaryIntent === "commander" || primaryIntent === "both";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="primaryIntent">{t("role")}</Label>
        <Select
          id="primaryIntent"
          value={primaryIntent}
          onChange={(e) =>
            onPrimaryIntentChange(e.target.value as PrimaryIntent)
          }
        >
          <option value="livrer">{t("intent_livrer")}</option>
          <option value="commander">{t("intent_commander")}</option>
          <option value="both">{t("intent_both")}</option>
        </Select>
        {showHints && (
          <p className="text-xs text-[var(--muted)]">{t("intent_hint")}</p>
        )}
      </div>

      {showCarrier && (
        <div className="space-y-2">
          <Label htmlFor="carrierType">{t("carrier_type")}</Label>
          <Select
            id="carrierType"
            value={carrierType}
            onChange={(e) =>
              onCarrierTypeChange(e.target.value as CarrierType)
            }
          >
            <option value="particulier">{t("carrier_particulier")}</option>
            <option value="commercial">{t("carrier_commercial")}</option>
          </Select>
          {showHints && (
            <p className="text-xs text-[var(--muted)]">{t("carrier_hint")}</p>
          )}
        </div>
      )}

      {showOrder && (
        <div className="space-y-2">
          <Label htmlFor="orderIntent">{t("order_intent")}</Label>
          <Select
            id="orderIntent"
            value={orderIntent}
            onChange={(e) =>
              onOrderIntentChange(e.target.value as OrderIntent)
            }
          >
            <option value="envoyer">{t("order_send")}</option>
            <option value="recevoir">{t("order_receive")}</option>
          </Select>
          {showHints && (
            <p className="text-xs text-[var(--muted)]">
              {orderIntent === "recevoir"
                ? t("order_receive_hint")
                : t("order_send_hint")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
