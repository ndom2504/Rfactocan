import { useState } from "react";
import { type Href, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Field } from "@/components/ui";
import { CountryCityFields, RegionField } from "@/components/geo-fields";
import {
  SearchActions,
  SearchLayout,
  SearchResultCard,
  SearchResults,
  buildQuery,
} from "@/components/search-shared";
import { formatDate, formatMoney } from "@/lib/format";
import { transportModeLabel } from "@/lib/transport";

type TravelerHit = {
  tripId: string;
  fromCity?: string | null;
  toCity?: string | null;
  departAt?: string | null;
  weightKg?: number | null;
  pricePerKgCad?: number | null;
  currency?: string | null;
  transportMode?: string | null;
  user?: {
    displayName?: string | null;
    kycStatus?: string | null;
    ratingAvg?: number | null;
    ratingCount?: number | null;
  };
};

export function TravelerSearch({
  hideHeading = false,
  plain = false,
}: {
  hideHeading?: boolean;
  plain?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [results, setResults] = useState<TravelerHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ travelers?: TravelerHit[] }>(
        `/api/travelers/search${buildQuery({
          q,
          region,
          country: country.toUpperCase(),
          city,
          date,
        })}`
      );
      setResults(data.travelers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
      setResults([]);
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }

  function reset() {
    setQ("");
    setRegion("");
    setCountry("");
    setCity("");
    setDate("");
    setResults([]);
    setSearched(false);
    setError("");
  }

  return (
    <SearchLayout
      title={t("search_travelers")}
      hint={t("search_travelers_hint")}
      hideHeading={hideHeading}
      plain={plain}
      filters={
        <>
          <Field
            label={t("search")}
            value={q}
            onChangeText={setQ}
            placeholder={t("search_placeholder")}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch()}
          />
          <RegionField
            label={t("region")}
            value={region}
            onChange={(id) => {
              setRegion(id);
              setCountry("");
              setCity("");
            }}
          />
          <CountryCityFields
            country={country}
            city={city}
            onCountry={setCountry}
            onCity={setCity}
            allowEmpty
            regionId={region}
          />
          <Field
            label={t("search_travel_date")}
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-JJ"
          />
          <SearchActions
            loading={loading}
            error={error}
            onSearch={() => void runSearch()}
            onReset={reset}
          />
        </>
      }
    >
      {searched && !error ? (
        <SearchResults
          count={results.length}
          foundLabel={t("travelers_found")}
          emptyLabel={t("no_travelers")}
        >
          {results.map((hit) => (
            <SearchResultCard
              key={hit.tripId}
              title={hit.user?.displayName || "—"}
              subtitle={`${hit.fromCity || "?"} → ${hit.toCity || "?"}`}
              meta={[
                transportModeLabel(hit.transportMode, locale),
                hit.departAt ? formatDate(hit.departAt) : null,
                hit.weightKg != null ? `${hit.weightKg} kg` : null,
                hit.pricePerKgCad != null
                  ? `${formatMoney(hit.pricePerKgCad, hit.currency || "CAD")}/kg`
                  : null,
                hit.user?.kycStatus === "VERIFIED" ? t("verified") : null,
                hit.user?.ratingCount
                  ? `★ ${(hit.user.ratingAvg ?? 0).toFixed(1)} (${hit.user.ratingCount})`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              actionLabel={t("propose_parcel")}
              onPress={() => router.push(`/trip/${hit.tripId}` as Href)}
            />
          ))}
        </SearchResults>
      ) : null}
    </SearchLayout>
  );
}
