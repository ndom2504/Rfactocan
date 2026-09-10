import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { Chip, ChipRow } from "@/components/chip";
import { CountryCityFields } from "@/components/geo-fields";
import { Button, Card, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { api, mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type MeetProfile = {
  kind?: "BUSINESS" | "ROMANCE";
  headline?: string;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  active?: boolean;
};

type MeetHit = {
  userId: string;
  headline: string;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  age?: number | null;
  photoUrl?: string | null;
  user?: { displayName?: string | null; avatarUrl?: string | null };
};

export default function MeetScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [tab, setTab] = useState<"discover" | "profile">("discover");
  const [kind, setKind] = useState<"BUSINESS" | "ROMANCE">("BUSINESS");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("GA");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchCountry, setSearchCountry] = useState("");
  const [searching, setSearching] = useState(false);
  const [needProfile, setNeedProfile] = useState(false);
  const [hits, setHits] = useState<MeetHit[]>([]);
  const [hint, setHint] = useState("");

  const loadMine = useCallback(async () => {
    try {
      const data = await api<{ profile?: MeetProfile | null }>("/api/meet/profile");
      const p = data.profile;
      if (p) {
        setKind(p.kind === "ROMANCE" ? "ROMANCE" : "BUSINESS");
        setHeadline(p.headline ?? "");
        setBio(p.bio ?? "");
        setCity(p.city ?? "");
        setCountry(p.country ?? "GA");
        setActive(p.active !== false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const search = useCallback(async () => {
    setSearching(true);
    setError("");
    setHint("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (searchCity.trim()) params.set("city", searchCity.trim());
      if (searchCountry.trim()) params.set("country", searchCountry.trim());
      const qs = params.toString();
      const data = await api<{
        profiles?: MeetHit[];
        needProfile?: boolean;
        message?: string;
      }>(`/api/meet/search${qs ? `?${qs}` : ""}`);
      setNeedProfile(Boolean(data.needProfile));
      setHits(data.profiles ?? []);
      setHint(data.message || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setSearching(false);
    }
  }, [q, searchCity, searchCountry, t]);

  const latestSearch = useRef(search);
  latestSearch.current = search;

  useFocusEffect(
    useCallback(() => {
      if (tab === "discover" && !loading) void latestSearch.current();
    }, [tab, loading])
  );

  async function save() {
    if (headline.trim().length < 3) {
      setError(t("meet_headline"));
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("/api/meet/profile", {
        method: "PUT",
        body: JSON.stringify({
          kind,
          headline: headline.trim(),
          bio: bio.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          active,
        }),
      });
      setMessage(t("meet_saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Title>{t("meet_manage_title")}</Title>
        <Muted>{t("loading")}</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <Title>{t("meet_manage_title")}</Title>
        <ChipRow>
          <Chip
            label={t("meet_discover")}
            selected={tab === "discover"}
            onPress={() => setTab("discover")}
          />
          <Chip
            label={t("meet_my_profile")}
            selected={tab === "profile"}
            onPress={() => setTab("profile")}
          />
        </ChipRow>

        {tab === "discover" ? (
          <View style={{ marginTop: 12 }}>
            <Muted>{t("meet_manage_body")}</Muted>
            <Field label={t("search")} value={q} onChangeText={setQ} />
            <CountryCityFields
              country={searchCountry}
              city={searchCity}
              onCountry={setSearchCountry}
              onCity={setSearchCity}
              allowEmpty
            />
            <Button label={t("search")} onPress={() => void search()} loading={searching} />
            <ErrorText>{error}</ErrorText>
            {needProfile ? (
              <Card>
                <Text style={{ color: colors.foreground }}>{t("meet_need_profile")}</Text>
                <Button
                  label={t("meet_my_profile")}
                  onPress={() => setTab("profile")}
                />
              </Card>
            ) : null}
            {hint && !needProfile ? <Muted>{hint}</Muted> : null}
            {hits.map((hit) => {
              const photo = hit.photoUrl || hit.user?.avatarUrl;
              return (
                <Pressable
                  key={hit.userId}
                  onPress={() => router.push(`/meet/${hit.userId}` as Href)}
                >
                  <Card>
                    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                      {photo ? (
                        <Image
                          source={{ uri: mediaUrl(photo) }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: colors.accentSoft,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: colors.accentSoft,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                            {(hit.user?.displayName || "?").slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", color: colors.foreground }}>
                          {hit.user?.displayName || "—"}
                        </Text>
                        <Text style={{ color: colors.foreground, marginTop: 2 }}>
                          {hit.headline}
                        </Text>
                        <Muted>
                          {[hit.city, hit.country, hit.age != null ? `${hit.age} ans` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </Muted>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={{ marginTop: 12 }}>
            <Muted>{t("meet_manage_body")}</Muted>
            <Text
              style={{
                fontWeight: "700",
                marginTop: 16,
                marginBottom: 8,
                color: colors.foreground,
              }}
            >
              {t("search_filter_type")}
            </Text>
            <ChipRow>
              <Chip
                label={t("meet_kind_business")}
                selected={kind === "BUSINESS"}
                onPress={() => setKind("BUSINESS")}
              />
              <Chip
                label={t("meet_kind_romance")}
                selected={kind === "ROMANCE"}
                onPress={() => setKind("ROMANCE")}
              />
            </ChipRow>
            <View style={{ height: 12 }} />
            <Field label={t("meet_headline")} value={headline} onChangeText={setHeadline} />
            <Field
              label={t("bio")}
              value={bio}
              onChangeText={setBio}
              multiline
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />
            <CountryCityFields
              country={country}
              city={city}
              onCountry={setCountry}
              onCity={setCity}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {t("meet_active")}
              </Text>
              <Switch value={active} onValueChange={setActive} />
            </View>
            <ErrorText>{error}</ErrorText>
            {message ? (
              <Text style={{ color: colors.foreground, marginBottom: 8 }}>{message}</Text>
            ) : null}
            <Button label={t("save")} onPress={() => void save()} loading={saving} />
            <Button
              label={t("nav_community")}
              variant="outline"
              onPress={() => router.push("/(tabs)/community")}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
