import { useEffect, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Chip, ChipRow } from "@/components/chip";
import { Button, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type MeetProfile = {
  kind?: "BUSINESS" | "ROMANCE";
  headline?: string;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  myGender?: string;
  seekGender?: string;
  birthYear?: number | null;
  active?: boolean;
};

export default function MeetProfileScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
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

  useEffect(() => {
    void (async () => {
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
    })();
  }, [t]);

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
        <Muted>{t("meet_manage_body")}</Muted>
        <Text style={{ fontWeight: "700", marginTop: 16, marginBottom: 8, color: colors.foreground }}>
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
        <Field label={t("city")} value={city} onChangeText={setCity} />
        <Field label={t("country")} value={country} onChangeText={setCountry} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>{t("meet_active")}</Text>
          <Switch value={active} onValueChange={setActive} />
        </View>
        <ErrorText>{error}</ErrorText>
        {message ? <Text style={{ color: colors.accent, marginBottom: 8 }}>{message}</Text> : null}
        <Button label={t("save")} onPress={() => void save()} loading={saving} />
        <Button label={t("nav_community")} variant="outline" onPress={() => router.push("/(tabs)/community")} />
        <Button label={t("close")} variant="outline" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
