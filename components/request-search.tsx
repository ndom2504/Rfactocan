"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { COUNTRIES, getCountryName, getCities } from "@/lib/corridors";
import { REGIONS, citiesInRegion } from "@/lib/regions";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatDate, formatKg } from "@/lib/utils";
import { useI18n } from "@/components/locale-provider";

type RequestHit = {
  requestId: string;
  fromCountry: string;
  fromCity: string;
  toCountry: string;
  toCity: string;
  weightKg: number;
  urgency: string;
  desiredDate: string | null;
  description: string;
  photos: string[];
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
    ratingAvg: number;
    ratingCount: number;
    verifiedAt: string | null;
    kycStatus: string;
  };
};

export function RequestSearch() {
  const { t, urgency } = useI18n();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<RequestHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const countryOptions = useMemo(() => {
    if (!region) return COUNTRIES;
    const codes = new Set<string>(
      REGIONS.find((r) => r.id === region)?.codes ?? []
    );
    return COUNTRIES.filter((c) => codes.has(c.code));
  }, [region]);

  const cityOptions = useMemo(() => {
    if (country) return getCities(country);
    if (region) return citiesInRegion(region);
    return [];
  }, [country, region]);

  useEffect(() => {
    if (country && !countryOptions.some((c) => c.code === country)) {
      setCountry("");
      setCity("");
    }
  }, [country, countryOptions]);

  useEffect(() => {
    if (city && cityOptions.length && !cityOptions.includes(city)) {
      setCity("");
    }
  }, [city, cityOptions]);

  function runSearch() {
    setError("");
    startTransition(async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (region) params.set("region", region);
      if (country) params.set("country", country);
      if (city.trim()) params.set("city", city.trim());
      const res = await fetch(`/api/requests/search?${params}`);
      const data = await res.json();
      setSearched(true);
      if (!res.ok) {
        setError(data.error ?? "Recherche impossible");
        setResults([]);
        return;
      }
      setResults(data.requests ?? []);
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {t("search_requests")}
        </h2>
        <p className="text-sm text-[var(--muted)]">{t("search_requests_hint")}</p>
      </div>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="request-q">{t("search")}</Label>
            <Input
              id="request-q"
              placeholder={t("search_requests_placeholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="request-region">{t("region")}</Label>
            <Select
              id="request-region"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setCountry("");
                setCity("");
              }}
            >
              <option value="">{t("all_f")}</option>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="request-country">{t("country")}</Label>
            <Select
              id="request-country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCity("");
              }}
            >
              <option value="">{t("all")}</option>
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="request-city">{t("city")}</Label>
            {cityOptions.length > 0 ? (
              <Select
                id="request-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">{t("all_f")}</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="request-city"
                placeholder="Ex. Paris"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
              />
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={pending} onClick={runSearch}>
            {pending ? t("loading") : t("search")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setQ("");
              setRegion("");
              setCountry("");
              setCity("");
              setResults([]);
              setSearched(false);
              setError("");
            }}
          >
            {t("reset")}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </Card>

      {searched && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            {results.length} {t("requests_found")}
          </p>
          {results.map((hit) => {
            const cover = hit.photos[0];
            return (
              <Card key={hit.requestId}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserAvatar
                          name={hit.user.displayName}
                          avatarUrl={hit.user.avatarUrl}
                          size="lg"
                          className="h-full w-full rounded-lg"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">
                        {hit.fromCity} → {hit.toCity}
                      </CardTitle>
                      <CardDescription>
                        {getCountryName(hit.fromCountry)} →{" "}
                        {getCountryName(hit.toCountry)} ·{" "}
                        {hit.user.displayName}
                      </CardDescription>
                      <p className="mt-1 line-clamp-1 text-sm text-[var(--muted)]">
                        {hit.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{formatKg(hit.weightKg)}</Badge>
                        <Badge>{urgency(hit.urgency)}</Badge>
                        {hit.desiredDate && (
                          <Badge>{formatDate(hit.desiredDate)}</Badge>
                        )}
                        {hit.user.kycStatus === "VERIFIED" && (
                          <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                            {t("verified")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link href={`/requests/${hit.requestId}`}>
                    <Button variant="outline" size="sm">
                      {t("view_request")}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
          {results.length === 0 && (
            <p className="text-sm text-[var(--muted)]">{t("no_requests_found")}</p>
          )}
        </div>
      )}
    </section>
  );
}
