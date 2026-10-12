import { useState } from "react";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
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
import { formatDate } from "@/lib/format";

type RequestHit = {
  requestId: string;
  fromCity?: string | null;
  toCity?: string | null;
  weightKg?: number | null;
  urgency?: string | null;
  desiredDate?: string | null;
  description?: string | null;
  photos?: string[];
  user?: { displayName?: string | null; kycStatus?: string | null };
};

export function RequestSearch({
  hideHeading = false,
  plain = false,
}: {
  hideHeading?: boolean;
  plain?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { need } = useLocalSearchParams<{ need?: string }>();
  const needType = typeof need === "string" && need.trim() ? need : "PARCEL";
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [results, setResults] = useState<RequestHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ requests?: RequestHit[] }>(
        `/api/requests/search${buildQuery({
          needType,
          q,
          region,
          country: country.toUpperCase(),
          city,
          date,
        })}`
      );
      setResults(data.requests ?? []);
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
      title={t("search_requests")}
      hint={t("search_requests_hint")}
      hideHeading={hideHeading}
      plain={plain}
      filters={
        <>
          <Field
            label={t("search")}
            value={q}
            onChangeText={setQ}
            placeholder={t("search_requests_placeholder")}
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
          foundLabel={t("requests_found")}
          emptyLabel={t("no_requests_found")}
        >
          {results.map((hit) => (
            <SearchResultCard
              key={hit.requestId}
              title={`${hit.fromCity || "?"} → ${hit.toCity || "?"}`}
              subtitle={hit.user?.displayName || "—"}
              meta={[
                hit.weightKg != null ? `${hit.weightKg} kg` : null,
                hit.urgency,
                hit.desiredDate ? formatDate(hit.desiredDate) : null,
                hit.user?.kycStatus === "VERIFIED" ? t("verified") : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              description={hit.description}
              imageUrl={hit.photos?.[0]}
              actionLabel={t("apply_trip")}
              onPress={() => router.push(`/request/${hit.requestId}` as Href)}
            />
          ))}
        </SearchResults>
      ) : null}
    </SearchLayout>
  );
}
