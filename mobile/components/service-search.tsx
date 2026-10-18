import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";
import { api, mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Field } from "@/components/ui";
import { CountryCityFields } from "@/components/geo-fields";
import { colors } from "@/lib/theme";

type ServiceHit = {
  id: string;
  title: string;
  city?: string | null;
  country?: string | null;
  serviceType?: string | null;
  category?: string | null;
  photos?: string[];
  user?: { displayName?: string | null };
};

function query(params: Record<string, string>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v.trim()) u.set(k, v.trim());
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

function ResultCard({
  title,
  subtitle,
  meta,
  imageUrl,
  onPress,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  imageUrl?: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        {imageUrl ? (
          <Image
            source={{ uri: mediaUrl(imageUrl) }}
            style={{
              width: "100%",
              height: 120,
              borderRadius: 10,
              marginBottom: 10,
              backgroundColor: colors.surface2,
            }}
            resizeMode="cover"
          />
        ) : null}
        <Text style={{ fontWeight: "700", fontSize: 15, color: colors.foreground }}>
          {title}
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 2 }}>
          {subtitle}
        </Text>
        {meta ? (
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            {meta}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

type Props = {
  hideHeading?: boolean;
  plain?: boolean;
};

export function ServiceSearch({ hideHeading = false, plain = false }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [services, setServices] = useState<ServiceHit[]>([]);

  function clearResults() {
    setSearched(false);
    setServices([]);
    setError("");
  }

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ listings?: ServiceHit[] }>(
        `/api/services${query({
          country: country.toUpperCase(),
          city,
        })}`
      );
      const needle = q.trim().toLowerCase();
      let list = data.listings ?? [];
      if (needle) {
        list = list.filter(
          (item) =>
            item.title.toLowerCase().includes(needle) ||
            (item.serviceType ?? "").toLowerCase().includes(needle) ||
            (item.category ?? "").toLowerCase().includes(needle) ||
            (item.user?.displayName ?? "").toLowerCase().includes(needle)
        );
      }
      setServices(list);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }

  const placeholder = t("search_services_placeholder");

  const body = (
    <>
      <Field label={t("search")} value={q} onChangeText={setQ} placeholder={placeholder} />
      <CountryCityFields
        country={country}
        city={city}
        onCountry={setCountry}
        onCity={setCity}
        allowEmpty
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label={t("search")} onPress={() => void runSearch()} loading={loading} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t("reset")}
            variant="outline"
            onPress={() => {
              setQ("");
              setCountry("");
              setCity("");
              clearResults();
            }}
          />
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
      ) : null}
      {error ? (
        <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>
      ) : null}

      {searched ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>
            {services.length} {t("services_found")}
          </Text>
          {services.length === 0 ? (
            <Text style={{ color: colors.muted }}>{t("services_empty")}</Text>
          ) : (
            services.map((hit) => (
              <ResultCard
                key={hit.id}
                title={hit.title}
                subtitle={[hit.city, hit.country].filter(Boolean).join(", ") || "—"}
                meta={[hit.serviceType, hit.category, hit.user?.displayName]
                  .filter(Boolean)
                  .join(" · ")}
                imageUrl={hit.photos?.[0]}
                onPress={() => router.push(`/service/${hit.id}` as Href)}
              />
            ))
          )}
        </View>
      ) : null}
    </>
  );

  return (
    <View>
      {!hideHeading && (
        <>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.foreground,
              marginBottom: 4,
            }}
          >
            {t("search_services")}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
            {t("search_services_hint")}
          </Text>
        </>
      )}
      {plain ? body : <Card>{body}</Card>}
    </View>
  );
}
