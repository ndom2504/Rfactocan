"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/locale-provider";

type DisputeRow = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  openedBy: { id: string; displayName: string };
  againstUser: { id: string; displayName: string };
};

const REASONS = [
  "DAMAGE",
  "MISSING",
  "DELAY",
  "PAYMENT",
  "BEHAVIOR",
  "CUSTOMS",
  "OTHER",
] as const;

type Props = {
  bookingId: string;
  canOpen: boolean;
};

export function DisputePanel({ bookingId, canOpen }: Props) {
  const { t, locale } = useI18n();
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("OTHER");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/disputes?bookingId=${bookingId}`);
    const data = await res.json();
    if (res.ok) setDisputes(data.disputes ?? []);
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasOpen = disputes.some((d) =>
    ["OPEN", "IN_REVIEW"].includes(d.status)
  );

  async function submit() {
    setBusy(true);
    setError("");
    setOk("");
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, reason, details }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setOk(t("dispute_opened_ok"));
    setOpen(false);
    setDetails("");
    await load();
  }

  const reasonLabels: Record<string, string> = {
    DAMAGE: t("dispute_reason_damage"),
    MISSING: t("dispute_reason_missing"),
    DELAY: t("dispute_reason_delay"),
    PAYMENT: t("dispute_reason_payment"),
    BEHAVIOR: t("dispute_reason_behavior"),
    CUSTOMS: t("dispute_reason_customs"),
    OTHER: t("dispute_reason_other"),
  };

  const statusLabels: Record<string, string> = {
    OPEN: t("dispute_status_open"),
    IN_REVIEW: t("dispute_status_in_review"),
    RESOLVED: t("dispute_status_resolved"),
    CLOSED: t("dispute_status_closed"),
  };

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{t("dispute_title")}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("dispute_hint")}</p>
        </div>
        {canOpen && !hasOpen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t("cancel") : t("dispute_open")}
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-[var(--border)] pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="dispute-reason">{t("dispute_reason")}</Label>
            <Select
              id="dispute-reason"
              value={reason}
              onChange={(e) =>
                setReason(e.target.value as (typeof REASONS)[number])
              }
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {reasonLabels[r]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dispute-details">{t("dispute_details")}</Label>
            <Textarea
              id="dispute-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("dispute_details_placeholder")}
              rows={4}
            />
          </div>
          <p className="text-xs text-[var(--muted)]">{t("dispute_escrow_note")}</p>
          <Button
            disabled={busy || details.trim().length < 10}
            onClick={() => void submit()}
          >
            {busy ? t("loading") : t("dispute_submit")}
          </Button>
        </div>
      )}

      {ok && <p className="text-sm text-[var(--accent)]">{ok}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {disputes.length > 0 && (
        <ul className="space-y-2 border-t border-[var(--border)] pt-3">
          {disputes.map((d) => (
            <li key={d.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{statusLabels[d.status] ?? d.status}</Badge>
                <span className="font-medium">
                  {reasonLabels[d.reason] ?? d.reason}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {new Intl.DateTimeFormat(
                    locale === "en" ? "en-CA" : "fr-CA",
                    { dateStyle: "short", timeStyle: "short" }
                  ).format(new Date(d.createdAt))}
                </span>
              </div>
              <p className="mt-1 text-[var(--muted)]">
                {d.openedBy.displayName} → {d.againstUser.displayName}
              </p>
              {d.details && <p className="mt-1">{d.details}</p>}
              {d.adminNote && (
                <p className="mt-1 text-xs text-[var(--accent)]">
                  {t("dispute_admin_note")}: {d.adminNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
