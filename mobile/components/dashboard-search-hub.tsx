import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Field } from "@/components/ui";
import { colors } from "@/lib/theme";

type Mode = "voyageurs" | "colis" | "services";

type TravelerHit = {
  tripId: string;
  fromCity?: string | null;
  toCity?: string | null;
  weightKg?: number | null;
  pricePerKgCad?: number | null;
  currency?: string | null;
  user?: { displayName?: string | null };
};

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
        <Text style={{ color: colors.accent, fontSize: 13, marginTop: 2 }}>
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

export function DashboardSearchHub() {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("voyageurs");
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [travelers, setTravelers] = useState<TravelerHit[]>([]);
  const [requests, setRequests] = useState<RequestHit[]>([]);
  const [services, setServices] = useState<ServiceHit[]>([]);

  function clearResults() {
    setSearched(false);
    setTravelers([]);
    setRequests([]);
    setServices([]);
    setError("");
  }

  function selectMode(next: Mode) {
    setMode(next);
    clearResults();
  }

  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      if (mode === "voyageurs") {
        const data = await api<{ travelers?: TravelerHit[] }>(
          `/api/travelers/search${query({
            q,
            country: country.toUpperCase(),
            city,
            date: travelDate,
          })}`
        );
        setTravelers(data.travelers ?? []);
        setRequests([]);
        setServices([]);
      } else if (mode === "colis") {
        const data = await api<{ requests?: RequestHit[] }>(
          `/api/requests/search${query({
            q,
            country: country.toUpperCase(),
            city,
            date: travelDate,
            needType: "PARCEL",
          })}`
        );
        setRequests(data.requests ?? []);
        setTravelers([]);
        setServices([]);
      } else {
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
        setTravelers([]);
        setRequests([]);
      }
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }

  const placeholder =
    mode === "voyageurs"
      ? t("search_placeholder")
      : mode === "colis"
        ? t("search_requests_placeholder")
        : t("search_services_placeholder");

  return (
    <View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: colors.accent,
          marginBottom: 4,
        }}
      >
        {t("dashboard_search_title")}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
        {t("dashboard_search_hint")}
      </Text>
      <Card>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          {t("search_filter_type")}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {(
            [
              ["voyageurs", t("publish_transport_cta")],
              ["colis", t("publish_ship_cta")],
              ["services", t("publish_listing_cta")],
            ] as const
          ).map(([id, label]) => {
            const selected = mode === id;
            return (
              <Pressable
                key={id}
                onPress={() => selectMode(id)}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                  backgroundColor: selected ? colors.accent : colors.surface2,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: selected ? colors.white : colors.foreground,
                    textAlign: "center",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Field label={t("search")} value={q} onChangeText={setQ} placeholder={placeholder} />
        <Field
          label={t("country")}
          autoCapitalize="characters"
          value={country}
          onChangeText={setCountry}
          placeholder="GA"
        />
        <Field
          label={mode === "services" ? t("city") : t("city_from")}
          value={city}
          onChangeText={setCity}
        />
        {mode !== "services" ? (
          <Field
            label={t("search_travel_date")}
            value={travelDate}
            onChangeText={setTravelDate}
            placeholder="AAAA-MM-JJ"
          />
        ) : null}
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

        {searched && mode === "voyageurs" ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: colors.muted, marginBottom: 8 }}>
              {travelers.length} {t("travelers_found")}
            </Text>
            {travelers.length === 0 ? (
              <Text style={{ color: colors.muted }}>{t("no_travelers")}</Text>
            ) : (
              travelers.map((hit) => (
                <ResultCard
                  key={hit.tripId}
                  title={hit.user?.displayName || "—"}
                  subtitle={`${hit.fromCity || "?"} → ${hit.toCity || "?"}`}
                  meta={[
                    hit.weightKg != null ? `${hit.weightKg}kg` : null,
                    hit.pricePerKgCad != null
                      ? `${hit.pricePerKgCad}/${hit.currency || "CAD"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  actionLabel={t("propose_parcel")}
                  onPress={() => router.push(`/trip/${hit.tripId}`)}
                  onAction={() => router.push(`/trip/${hit.tripId}`)}
                />
              ))
            )}
          </View>
        ) : null}

        {searched && mode === "colis" ? (
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
                    onPress={() => router.push(`/request/${id}`)}
                    onAction={() => router.push(`/request/${id}`)}
                  />
                );
              })
            )}
          </View>
        ) : null}

        {searched && mode === "services" ? (
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
                  onPress={() => router.push("/services")}
                />
              ))
            )}
          </View>
        ) : null}
      </Card>
    </View>
  );
}
