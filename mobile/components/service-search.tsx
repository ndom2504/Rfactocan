import { useState } from "react";
import { type Href, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Field } from "@/components/ui";
import { CountryCityFields } from "@/components/geo-fields";
import {
  SearchActions,
  SearchLayout,
  SearchResultCard,
  SearchResults,
  buildQuery,
} from "@/components/search-shared";
import { formatMoney } from "@/lib/format";

type ServiceHit = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  serviceType?: string | null;
  country?: string | null;
  city?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
  photos?: string[];
  user?: {
    displayName?: string | null;
    ratingAvg?: number | null;
    ratingCount?: number | null;
  };
};

export function ServiceSearch({
  hideHeading = false,
  plain = false,
}: {
  hideHeading?: boolean;
  plain?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<ServiceHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ listings?: ServiceHit[] }>(
        `/api/services${buildQuery({ country: country.toUpperCase(), city })}`
      );
      let list = data.listings ?? [];
      const needle = q.trim().toLowerCase();
      if (needle) {
        list = list.filter((item) =>
          [item.title, item.description, item.serviceType, item.category, item.user?.displayName]
            .some((v) => (v ?? "").toLowerCase().includes(needle))
        );
      }
      setResults(list);
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
    setCountry("");
    setCity("");
    setResults([]);
    setSearched(false);
    setError("");
  }

  return (
    <SearchLayout
      title={t("search_services")}
      hint={t("search_services_hint")}
      hideHeading={hideHeading}
      plain={plain}
      filters={
        <>
          <Field
            label={t("search")}
            value={q}
            onChangeText={setQ}
            placeholder={t("search_services_placeholder")}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch()}
          />
          <CountryCityFields
            country={country}
            city={city}
            onCountry={setCountry}
            onCity={setCity}
            allowEmpty
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
          foundLabel={t("services_found")}
          emptyLabel={t("services_empty")}
        >
          {results.map((item) => (
            <SearchResultCard
              key={item.id}
              title={item.title}
              subtitle={[item.city, item.country].filter(Boolean).join(", ") || "—"}
              meta={[
                item.serviceType,
                item.category,
                item.priceAmount != null
                  ? formatMoney(item.priceAmount, item.currency || "CAD")
                  : null,
                item.user?.displayName,
                item.user?.ratingCount
                  ? `★ ${(item.user.ratingAvg ?? 0).toFixed(1)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              description={item.description}
              imageUrl={item.photos?.[0]}
              onPress={() => router.push(`/service/${item.id}` as Href)}
            />
          ))}
        </SearchResults>
      ) : null}
    </SearchLayout>
  );
}
