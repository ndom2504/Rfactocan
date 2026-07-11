"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/locale-provider";
import { formatDate, formatKg } from "@/lib/utils";

type OpenRequest = {
  id: string;
  fromCity: string;
  toCity: string;
  weightKg: number;
  desiredDate: string | null;
};

type Props = {
  tripId: string;
};

export function SenderProposePanel({ tripId }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [requests, setRequests] = useState<OpenRequest[]>([]);
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/requests?mine=1");
      const data = await res.json();
      if (res.ok) {
        const open = (data.requests ?? []).filter(
          (r: { status: string }) => r.status === "OPEN"
        ) as OpenRequest[];
        setRequests(open);
        if (open.length === 1) setRequestId(open[0].id);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#propose") {
      document.getElementById("propose")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [loaded]);

  async function propose() {
    if (!requestId) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, tripId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Impossible de proposer");
      return;
    }
    router.push(`/bookings/${data.booking.id}`);
  }

  if (!loaded) {
    return (
      <p id="propose" className="text-sm text-[var(--muted)]">
        {t("loading")}
      </p>
    );
  }

  if (requests.length === 0) {
    return (
      <Card id="propose" className="border-[var(--accent)]/30">
        <CardTitle className="text-lg">{t("propose_on_trip")}</CardTitle>
        <CardDescription className="mt-2">
          {t("propose_no_requests")}
        </CardDescription>
        <div className="mt-4">
          <Link href="/requests/new">
            <Button>{t("publish_request")}</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card
      id="propose"
      className="border-[var(--accent)]/30 bg-[var(--accent-soft)]/30"
    >
      <CardTitle className="text-lg">{t("propose_on_trip")}</CardTitle>
      <CardDescription className="mt-2">{t("propose_hint")}</CardDescription>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="propose-request">{t("select_request")}</Label>
          <Select
            id="propose-request"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
          >
            <option value="">{t("select_request")}</option>
            {requests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fromCity} → {r.toCity} · {formatKg(r.weightKg)}
                {r.desiredDate ? ` · ${formatDate(r.desiredDate)}` : ""}
              </option>
            ))}
          </Select>
        </div>
        <Button
          disabled={!requestId || loading}
          onClick={() => void propose()}
        >
          {loading ? t("loading") : t("propose")}
        </Button>
      </div>
    </Card>
  );
}
