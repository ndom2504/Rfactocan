import { useState } from "react";
import { type Href, useRouter } from "expo-router";
import { Text } from "react-native";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Field } from "@/components/ui";
import { Chip, ChipRow } from "@/components/chip";
import { CountryCityFields } from "@/components/geo-fields";
import {
  SearchActions,
  SearchLayout,
  SearchResultCard,
  SearchResults,
  buildQuery,
} from "@/components/search-shared";
import { SHOP_CATEGORIES, shopCategoryLabel, type ShopCategoryId } from "@/lib/shops-catalog";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type ShopHit = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  country?: string | null;
  city?: string | null;
  coverUrl?: string | null;
  logoUrl?: string | null;
  _count?: { products?: number };
  user?: {
    displayName?: string | null;
    ratingAvg?: number | null;
    ratingCount?: number | null;
  };
};

export function ShopSearch({
  hideHeading = false,
  plain = false,
}: {
  hideHeading?: boolean;
  plain?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ShopCategoryId | "">("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<ShopHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ shops?: ShopHit[] }>(
        `/api/shops${buildQuery({
          q,
          category,
          country: country.toUpperCase(),
          city,
        })}`
      );
      setResults(data.shops ?? []);
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
    setCategory("");
    setCountry("");
    setCity("");
    setResults([]);
    setSearched(false);
    setError("");
  }

  return (
    <SearchLayout
      title={t("search_shops")}
      hint={t("search_shops_hint")}
      hideHeading={hideHeading}
      plain={plain}
      filters={
        <>
          <Field
            label={t("search")}
            value={q}
            onChangeText={setQ}
            placeholder={t("search_shops_placeholder")}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch()}
          />
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 6 }}>
            {t("shops_category")}
          </Text>
          <ChipRow>
            <Chip
              label={t("shops_all")}
              selected={category === ""}
              onPress={() => setCategory("")}
            />
            {SHOP_CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={locale === "en" ? c.en : c.fr}
                selected={category === c.id}
                onPress={() => setCategory(c.id)}
              />
            ))}
          </ChipRow>
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
          foundLabel={t("shops_found")}
          emptyLabel={t("shops_no_shops")}
        >
          {results.map((item) => (
            <SearchResultCard
              key={item.id}
              title={item.name}
              subtitle={[
                item.category ? shopCategoryLabel(item.category, locale) : null,
                [item.city, item.country].filter(Boolean).join(", ") || null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
              meta={[
                item._count?.products != null
                  ? `${item._count.products} ${t("shops_products").toLowerCase()}`
                  : null,
                item.user?.displayName,
                item.user?.ratingCount
                  ? `★ ${(item.user.ratingAvg ?? 0).toFixed(1)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              description={item.description}
              imageUrl={item.coverUrl || item.logoUrl}
              onPress={() => router.push(`/shops/${item.id}` as Href)}
            />
          ))}
        </SearchResults>
      ) : null}
    </SearchLayout>
  );
}
