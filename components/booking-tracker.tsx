"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@prisma/client";

type TrackEvent = {
  id: string;
  type: string;
  status: string | null;
  label: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

type TrackLocation = {
  id: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  label: string | null;
  createdAt: string;
  mapsUrl: string;
};

type TrackingData = {
  status: BookingStatus;
  stepIndex: number;
  steps: BookingStatus[];
  events: TrackEvent[];
  locations: TrackLocation[];
  latestLocation: (TrackLocation & { userId: string }) | null;
  canShareLocation: boolean;
};

type Props = {
  bookingId: string;
  className?: string;
};

function formatWhen(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function BookingTracker({ bookingId, className }: Props) {
  const { t, locale, bookingStatus } = useI18n();
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/bookings/${bookingId}/tracking`);
    const json = await res.json();
    if (res.ok) setData(json);
  }, [bookingId]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function shareLocation() {
    if (!navigator.geolocation) {
      setError(t("geo_unsupported"));
      return;
    }
    setSharing(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch(`/api/bookings/${bookingId}/tracking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyM: pos.coords.accuracy || null,
          }),
        });
        const json = await res.json().catch(() => ({}));
        setSharing(false);
        if (!res.ok) {
          setError(json.error ?? t("geo_failed"));
          return;
        }
        await load();
      },
      (err) => {
        setSharing(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? t("geo_denied")
            : t("geo_failed")
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardTitle>{t("tracking_title")}</CardTitle>
        <p className="mt-3 text-sm text-[var(--muted)]">{t("loading")}</p>
      </Card>
    );
  }

  const closed =
    data.status === "CANCELLED" || data.status === "REFUSED";

  return (
    <Card className={className}>
      <CardTitle>{t("tracking_title")}</CardTitle>
      <CardDescription>{t("tracking_hint")}</CardDescription>

      {!closed && (
        <ol className="mt-5 space-y-0">
          {data.steps.map((step, i) => {
            const done = data.stepIndex >= i;
            const current = data.stepIndex === i;
            return (
              <li key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
                      done
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
                      current && "ring-2 ring-[var(--accent)]/30"
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {i < data.steps.length - 1 && (
                    <span
                      className={cn(
                        "my-1 w-0.5 flex-1 min-h-[18px]",
                        data.stepIndex > i
                          ? "bg-[var(--accent)]"
                          : "bg-[var(--border)]"
                      )}
                    />
                  )}
                </div>
                <div className="pb-4 pt-0.5">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      done
                        ? "text-[var(--foreground)]"
                        : "text-[var(--muted)]"
                    )}
                  >
                    {bookingStatus(step)}
                  </p>
                  {current && (
                    <Badge className="mt-1 bg-[var(--accent-soft)] text-[var(--accent)]">
                      {t("tracking_current")}
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {closed && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          {bookingStatus(data.status)}
        </p>
      )}

      <div className="mt-2 border-t border-[var(--border)] pt-4">
        <p className="mb-2 text-sm font-medium">{t("tracking_history")}</p>
        <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
          {[...data.events].reverse().map((e) => (
            <li key={e.id} className="flex justify-between gap-3">
              <span>
                {e.type === "LOCATION" ? `📍 ${e.label}` : e.label}
                {e.type === "LOCATION" &&
                  typeof e.meta?.latitude === "number" &&
                  typeof e.meta?.longitude === "number" && (
                    <>
                      {" · "}
                      <a
                        href={`https://www.google.com/maps?q=${e.meta.latitude},${e.meta.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {t("open_map")}
                      </a>
                    </>
                  )}
              </span>
              <span className="shrink-0 text-xs text-[var(--muted)]">
                {formatWhen(e.createdAt, locale)}
              </span>
            </li>
          ))}
          {data.events.length === 0 && (
            <li className="text-[var(--muted)]">{t("tracking_empty")}</li>
          )}
        </ul>
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <p className="mb-2 text-sm font-medium">{t("geo_title")}</p>
        {data.latestLocation ? (
          <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
            <p>
              {t("last_position")} ·{" "}
              {formatWhen(data.latestLocation.createdAt, locale)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {data.latestLocation.latitude.toFixed(5)},{" "}
              {data.latestLocation.longitude.toFixed(5)}
              {data.latestLocation.accuracyM
                ? ` · ±${Math.round(data.latestLocation.accuracyM)} m`
                : ""}
            </p>
            <a
              href={data.latestLocation.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-[var(--accent)] underline"
            >
              {t("open_map")}
            </a>
          </div>
        ) : (
          <p className="mb-3 text-sm text-[var(--muted)]">{t("no_position")}</p>
        )}

        {data.canShareLocation && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={sharing}
              onClick={() => void shareLocation()}
            >
              {sharing ? t("loading") : t("share_location")}
            </Button>
            <p className="mt-2 text-xs text-[var(--muted)]">{t("geo_consent")}</p>
          </>
        )}
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
    </Card>
  );
}
