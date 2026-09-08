import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Chip, ChipRow } from "@/components/chip";
import { Badge, Button, Card, ErrorText, Field, Muted } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

const REASONS = [
  "DAMAGE",
  "MISSING",
  "DELAY",
  "PAYMENT",
  "BEHAVIOR",
  "CUSTOMS",
  "OTHER",
] as const;

type DisputeRow = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  openedBy?: { displayName?: string };
  againstUser?: { displayName?: string };
};

export function DisputePanel({
  bookingId,
  canOpen,
}: {
  bookingId: string;
  canOpen: boolean;
}) {
  const { t } = useI18n();
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("OTHER");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ disputes?: DisputeRow[] }>(
        `/api/disputes?bookingId=${bookingId}`
      );
      setDisputes(data.disputes ?? []);
    } catch {
      /* keep previous */
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasOpen = disputes.some((d) =>
    ["OPEN", "IN_REVIEW"].includes(d.status)
  );

  const reasonLabel: Record<string, string> = {
    DAMAGE: t("dispute_reason_damage"),
    MISSING: t("dispute_reason_missing"),
    DELAY: t("dispute_reason_delay"),
    PAYMENT: t("dispute_reason_payment"),
    BEHAVIOR: t("dispute_reason_behavior"),
    CUSTOMS: t("dispute_reason_customs"),
    OTHER: t("dispute_reason_other"),
  };
  const statusLabel: Record<string, string> = {
    OPEN: t("dispute_status_open"),
    IN_REVIEW: t("dispute_status_in_review"),
    RESOLVED: t("dispute_status_resolved"),
    CLOSED: t("dispute_status_closed"),
  };

  async function submit() {
    setBusy(true);
    setError("");
    setOk("");
    try {
      await api("/api/disputes", {
        method: "POST",
        body: JSON.stringify({ bookingId, reason, details: details.trim() }),
      });
      setOk(t("dispute_opened_ok"));
      setOpen(false);
      setDetails("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Text style={{ fontWeight: "700", color: colors.foreground }}>
        {t("dispute_title")}
      </Text>
      <Muted>{t("dispute_hint")}</Muted>
      {canOpen && !hasOpen ? (
        <Button
          label={open ? t("cancel") : t("dispute_open")}
          variant="outline"
          onPress={() => setOpen((v) => !v)}
        />
      ) : null}
      {open ? (
        <View>
          <Muted>{t("dispute_reason")}</Muted>
          <ChipRow>
            {REASONS.map((r) => (
              <Chip
                key={r}
                label={reasonLabel[r]}
                selected={reason === r}
                onPress={() => setReason(r)}
              />
            ))}
          </ChipRow>
          <Field
            label={t("dispute_details")}
            value={details}
            onChangeText={setDetails}
            multiline
            placeholder={t("dispute_details_placeholder")}
          />
          <Muted>{t("dispute_escrow_note")}</Muted>
          <Button
            label={t("dispute_submit")}
            onPress={() => void submit()}
            loading={busy}
            disabled={details.trim().length < 10}
          />
        </View>
      ) : null}
      {ok ? (
        <Text style={{ color: colors.accent, marginTop: 8 }}>{ok}</Text>
      ) : null}
      <ErrorText>{error}</ErrorText>
      {disputes.map((d) => (
        <View key={d.id} style={{ marginTop: 10 }}>
          <Badge>
            {statusLabel[d.status] ?? d.status} · {reasonLabel[d.reason] ?? d.reason}
          </Badge>
          <Muted>
            {d.openedBy?.displayName} → {d.againstUser?.displayName}
          </Muted>
          {d.details ? (
            <Text style={{ color: colors.foreground, marginTop: 4 }}>
              {d.details}
            </Text>
          ) : null}
          {d.adminNote ? (
            <Muted>
              {t("dispute_admin_note")}: {d.adminNote}
            </Muted>
          ) : null}
        </View>
      ))}
    </Card>
  );
}
