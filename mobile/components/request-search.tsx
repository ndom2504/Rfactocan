import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";
import { api, mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Field } from "@/components/ui";
import { CountryCityFields, RegionField } from "@/components/geo-fields";
import { colors } from "@/lib/theme";

type RequestHit = {
  requestId?: string;
  id?: string;
  fromCity?: string | null;
  toCity?: string | null;
  weightKg?: number | null;
  urgency?: string | null;
  description?: string | null;
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
  actionLabel,
  onPress,
  onAction,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  imageUrl?: string | null;
  actionLabel?: string;
  onPress: () => void;
  onAction?: () => void;
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
        {actionLabel && onAction ? (
          <Button label={actionLabel} onPress={onAction} />
        ) : null}
      </Card>
    </Pressable>
  );
}

type Props = {
  hideHeading?: boolean;
  plain?: boolean;
};

export function RequestSearch({ hideHeading = false, plain = false }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [requests, setRequests] = useState<RequestHit[]>([]);

  function clearResults() {
    setSearched(false);
    setRequests([]);
    setError("");
  }

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ requests?: RequestHit[] }>(
        `/api/requests/search${query({
          q,
          region,
          country: country.toUpperCase(),
          city,
          date: travelDate,
          needType: "PARCEL",
        })}`
      );
      setRequests(data.requests ?? []);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }

  const placeholder = t("search_requests_placeholder");

  const body = (
    <>
      <Field label={t("search")} value={q} onChangeText={setQ} placeholder={placeholder} />
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
        value={travelDate}
        onChangeText={setTravelDate}
        placeholder="AAAA-MM-JJ"
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
              setRegion("");
              setCountry("");
              setCity("");
              setTravelDate("");
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
            {requests.length} {t("requests_found")}
          </Text>
          {requests.length === 0 ? (
            <Text style={{ color: colors.muted }}>{t("no_requests_found")}</Text>
          ) : (
            requests.map((hit) => {
              const id = hit.requestId || hit.id;
              if (!id) return null;
              return (
                <ResultCard
                  key={id}
                  title={hit.user?.displayName || "—"}
                  subtitle={`${hit.fromCity || "?"} → ${hit.toCity || "?"}`}
                  meta={[
                    hit.weightKg != null ? `${hit.weightKg}kg` : null,
                    hit.urgency,
                    hit.description?.slice(0, 40),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  actionLabel={t("apply_trip")}
                  onPress={() => router.push(`/request/${id}` as Href)}
                  onAction={() => router.push(`/request/${id}` as Href)}
                />
              );
            })
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
            {t("search_requests")}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
            {t("search_requests_hint")}
          </Text>
        </>
      )}
      {plain ? body : <Card>{body}</Card>}
    </View>
  );
}
