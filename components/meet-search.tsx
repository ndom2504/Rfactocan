"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { COUNTRIES, getCountryName, getCities } from "@/lib/corridors";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

type MeetHit = {
  userId: string;
  profileId: string;
  kind: string;
  headline: string;
  bio: string | null;
  interests: string | null;
  city: string | null;
  country: string | null;
  age: number | null;
  photoUrl: string | null;
  matchScore?: number;
  href: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
    kycStatus: string;
  };
};

export function MeetSearch({
  hideHeading = false,
  plain = false,
}: {
  hideHeading?: boolean;
  plain?: boolean;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState("");
  const [results, setResults] = useState<MeetHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [needProfile, setNeedProfile] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const cityOptions = useMemo(
    () => (country ? getCities(country) : []),
    [country]
  );

  function runSearch() {
    setError("");
    startTransition(async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (country) params.set("country", country);
      if (city.trim()) params.set("city", city.trim());
      if (kind === "BUSINESS" || kind === "ROMANCE") params.set("kind", kind);
      const res = await fetch(`/api/meet/search?${params}`);
      const data = await res.json().catch(() => ({}));
      setSearched(true);
      if (!res.ok) {
        setError(data.error ?? t("meet_search_error"));
        setResults([]);
        setNeedProfile(false);
        return;
      }
      setNeedProfile(Boolean(data.needProfile));
      setResults((data.profiles ?? []) as MeetHit[]);
      if (data.needProfile) {
        setError(data.message ?? t("meet_search_need_profile"));
      }
    });
  }

  const filters = (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="meet-q">{t("search")}</Label>
          <Input
            id="meet-q"
            placeholder={t("search_meet_placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meet-kind">{t("meet_kind_label")}</Label>
          <Select
            id="meet-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">{t("meet_kind_auto")}</option>
            <option value="BUSINESS">{t("meet_kind_business")}</option>
            <option value="ROMANCE">{t("meet_kind_romance")}</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meet-country">{t("country")}</Label>
          <Select
            id="meet-country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCity("");
            }}
          >
            <option value="">{t("all_f")}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meet-city">{t("city")}</Label>
          <Select
            id="meet-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!country}
          >
            <option value="">{t("all_f")}</option>
            {cityOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={() => runSearch()}>
          {pending ? t("loading") : t("search")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setQ("");
            setCountry("");
            setCity("");
            setKind("");
            setResults([]);
            setSearched(false);
            setNeedProfile(false);
            setError("");
          }}
        >
          {t("reset")}
        </Button>
        <Link
          href="/community?kind=MEET"
          className={buttonVariants({ variant: "outline" })}
        >
          {t("meet_see_matches")}
        </Link>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-700">
          {error}{" "}
          {needProfile && (
            <Link href="/meet" className="font-medium underline">
              {t("meet_edit_profile")}
            </Link>
          )}
        </p>
      )}
    </div>
  );

  return (
    <section className="space-y-4">
      {!hideHeading && (
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {t("search_meet")}
          </h2>
          <p className="text-sm text-[var(--muted)]">{t("search_meet_hint")}</p>
        </div>
      )}

      {plain ? filters : <Card>{filters}</Card>}

      {searched && !needProfile && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            {results.length} {t("meet_found")}
          </p>
          {results.map((hit) => {
            const place = [hit.city, hit.country ? getCountryName(hit.country) : ""]
              .filter(Boolean)
              .join(", ");
            const kindLabel =
              hit.kind === "BUSINESS"
                ? t("meet_kind_business")
                : t("meet_kind_romance");
            return (
              <Card key={hit.profileId}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                      {hit.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={hit.photoUrl}
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
                      <CardTitle className="text-base">{hit.headline}</CardTitle>
                      <CardDescription>
                        {hit.user.displayName}
                        {place ? ` · ${place}` : ""}
                        {hit.age != null ? ` · ${hit.age} ans` : ""}
                      </CardDescription>
                      {hit.bio && (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                          {hit.bio}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{kindLabel}</Badge>
                        {typeof hit.matchScore === "number" && (
                          <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                            Match {Math.round(hit.matchScore)}
                          </Badge>
                        )}
                        {hit.user.kycStatus === "VERIFIED" && (
                          <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                            {t("verified")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={hit.href || `/meet/${hit.userId}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    {t("view_meet_profile")}
                  </Link>
                </div>
              </Card>
            );
          })}
          {results.length === 0 && (
            <p className="text-sm text-[var(--muted)]">{t("no_meet_found")}</p>
          )}
        </div>
      )}
    </section>
  );
}
