"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import { formatKg } from "@/lib/utils";

export default function HandoverConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<{
    booking: {
      id: string;
      fromCity: string;
      toCity: string;
      weightKg: number;
      senderName: string;
      travelerName: string;
      code: string | null;
    };
    expired: boolean;
    canConfirm: boolean;
    alreadyDone: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    void params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const res = await fetch(`/api/handover/${token}`);
      const data = await res.json();
      if (res.status === 401) {
        setNeedLogin(true);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      setInfo(data);
    })();
  }, [token]);

  async function confirm() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/handover/${token}`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    router.push(`/bookings/${data.booking.id}`);
    router.refresh();
  }

  if (needLogin) {
    return (
      <Card className="mx-auto max-w-md">
        <CardTitle>{t("handover_title")}</CardTitle>
        <CardDescription className="mt-2">
          {t("handover_login_required")}
        </CardDescription>
        <div className="mt-4">
          <Link href={`/login?next=${encodeURIComponent(`/handover/${token}`)}`}>
            <Button>{t("nav_login")}</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (!info && !error) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  if (error && !info) {
    return (
      <Card className="mx-auto max-w-md">
        <CardTitle>{t("handover_title")}</CardTitle>
        <p className="mt-3 text-sm text-red-700">{error}</p>
        <Link href="/bookings" className="mt-4 inline-block text-sm underline">
          {t("back_bookings")}
        </Link>
      </Card>
    );
  }

  if (!info) return null;

  return (
    <Card className="mx-auto max-w-md">
      <CardTitle>{t("handover_title")}</CardTitle>
      <CardDescription className="mt-2">
        {info.booking.fromCity} → {info.booking.toCity} ·{" "}
        {formatKg(info.booking.weightKg)}
      </CardDescription>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-[var(--muted)]">{t("sender")}</dt>
          <dd>{info.booking.senderName}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">{t("traveler")}</dt>
          <dd>{info.booking.travelerName}</dd>
        </div>
        {info.booking.code && (
          <div>
            <dt className="text-[var(--muted)]">{t("handover_code")}</dt>
            <dd className="font-mono tracking-widest">{info.booking.code}</dd>
          </div>
        )}
      </dl>

      {info.alreadyDone && (
        <p className="mt-4 text-sm text-[var(--accent)]">{t("handover_done")}</p>
      )}
      {info.expired && !info.alreadyDone && (
        <p className="mt-4 text-sm text-red-700">{t("handover_expired")}</p>
      )}
      {info.canConfirm && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-[var(--muted)]">
            {t("handover_confirm_prompt")}
          </p>
          <Button disabled={busy} onClick={() => void confirm()}>
            {busy ? t("loading") : t("handover_confirm")}
          </Button>
        </div>
      )}
      {!info.canConfirm && !info.alreadyDone && !info.expired && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          {t("handover_wrong_role")}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <Link
        href={`/bookings/${info.booking.id}`}
        className="mt-6 inline-block text-sm underline"
      >
        {t("back_bookings")}
      </Link>
    </Card>
  );
}
