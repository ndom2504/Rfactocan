"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RequestState = {
  isAmbassador: boolean;
  agentCode: string | null;
  ambassadorRequestStatus: string;
  ambassadorWhatsapp: string | null;
};

export default function BecomeAmbassadorPage() {
  const { t } = useI18n();
  const [state, setState] = useState<RequestState | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/ambassador/apply");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setState(data.request);
    if (data.request.ambassadorWhatsapp) {
      setWhatsapp(data.request.ambassadorWhatsapp);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/ambassador/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setState(data.request);
    setMessage(t("ambassador_apply_sent"));
  }

  const pending = state?.ambassadorRequestStatus === "PENDING";
  const isAmb = Boolean(state?.isAmbassador);
  const rejected = state?.ambassadorRequestStatus === "REJECTED";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/dashboard" className="text-sm text-[var(--accent)]">
        ← {t("nav_dashboard")}
      </Link>
      <Card>
        <CardTitle>{t("ambassador_apply_title")}</CardTitle>
        <CardDescription className="mt-2">
          {t("ambassador_apply_lead")}
        </CardDescription>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>{t("ambassador_apply_step1")}</li>
          <li>{t("ambassador_apply_step2")}</li>
          <li>{t("ambassador_apply_step3")}</li>
          <li>{t("ambassador_apply_step4")}</li>
        </ol>

        {isAmb ? (
          <p className="mt-6 text-sm text-[var(--accent)]">
            {t("ambassador_apply_already")}
          </p>
        ) : pending ? (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium text-[var(--accent)]">
              {t("ambassador_apply_pending")}
            </p>
            {state?.ambassadorWhatsapp && (
              <p className="text-sm text-[var(--muted)]">
                WhatsApp : {state.ambassadorWhatsapp}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {rejected && (
              <p className="text-sm text-amber-800">
                {t("ambassador_apply_rejected")}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="whatsapp">{t("ambassador_apply_whatsapp")}</Label>
              <Input
                id="whatsapp"
                type="tel"
                inputMode="tel"
                placeholder="+241 06 00 00 00"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
              />
              <p className="text-xs text-[var(--muted)]">
                {t("ambassador_apply_whatsapp_hint")}
              </p>
            </div>
            <Button type="submit" disabled={loading || !whatsapp.trim()}>
              {loading ? t("loading") : t("ambassador_apply_submit")}
            </Button>
          </form>
        )}

        {message && (
          <p className="mt-3 text-sm text-[var(--accent)]">{message}</p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>
    </div>
  );
}
