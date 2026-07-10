"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";

type HandoverState = {
  status: string;
  isSender: boolean;
  isTraveler: boolean;
  canGenerate: boolean;
  canConfirmCode: boolean;
  handedOverAt: string | null;
  code: string | null;
  expiresAt: string | null;
  confirmUrl: string | null;
  qrDataUrl: string | null;
};

type Props = {
  bookingId: string;
  onConfirmed?: () => void;
};

export function HandoverQrPanel({ bookingId, onConfirmed }: Props) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<HandoverState | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/bookings/${bookingId}/handover`);
    const json = await res.json();
    if (res.ok) setData(json);
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/bookings/${bookingId}/handover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate" }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Erreur");
      return;
    }
    await load();
  }

  async function confirmCode() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/bookings/${bookingId}/handover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_code", code: codeInput }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Erreur");
      return;
    }
    setCodeInput("");
    onConfirmed?.();
    await load();
  }

  if (!data) {
    return (
      <p className="text-sm text-[var(--muted)]">{t("loading")}</p>
    );
  }

  if (data.status === "HANDED_OVER" || data.handedOverAt) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <p className="text-sm font-medium text-[var(--accent)]">
          {t("handover_done")}
        </p>
        {data.handedOverAt && (
          <p className="mt-1 text-xs text-[var(--muted)]">
            {new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(data.handedOverAt))}
          </p>
        )}
      </div>
    );
  }

  if (data.status !== "ACCEPTED") return null;

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div>
        <h3 className="font-medium">{t("handover_title")}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("handover_hint")}</p>
      </div>

      {data.isSender && (
        <div className="space-y-3">
          {!data.qrDataUrl ? (
            <Button disabled={busy || !data.canGenerate} onClick={() => void generate()}>
              {busy ? t("loading") : t("handover_generate")}
            </Button>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.qrDataUrl}
                alt={t("handover_qr_alt")}
                className="h-44 w-44 rounded-lg border border-[var(--border)] bg-white p-2"
              />
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-[var(--muted)]">{t("handover_code")} :</span>{" "}
                  <span className="font-mono text-lg font-semibold tracking-widest">
                    {data.code}
                  </span>
                </p>
                {data.expiresAt && (
                  <p className="text-xs text-[var(--muted)]">
                    {t("handover_expires")}{" "}
                    {new Intl.DateTimeFormat(
                      locale === "en" ? "en-CA" : "fr-CA",
                      { dateStyle: "short", timeStyle: "short" }
                    ).format(new Date(data.expiresAt))}
                  </p>
                )}
                <p className="text-xs text-[var(--muted)]">
                  {t("handover_show_traveler")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void generate()}
                >
                  {t("handover_refresh")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {data.isTraveler && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            {t("handover_traveler_hint")}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="handover-code">{t("handover_enter_code")}</Label>
              <Input
                id="handover-code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="font-mono tracking-widest uppercase"
                maxLength={8}
              />
            </div>
            <Button
              disabled={busy || codeInput.trim().length < 4}
              onClick={() => void confirmCode()}
            >
              {busy ? t("loading") : t("handover_confirm")}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
