import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Chip, ChipRow } from "@/components/chip";
import {
  PaymentSetupCard,
  type ProfileUser,
} from "@/components/payment-setup-card";
import {
  Button,
  Card,
  ErrorText,
  Muted,
  Screen,
  Title,
} from "@/components/ui";
import { api, getApiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n, type Locale } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

const CURRENCIES = ["CAD", "USD", "EUR", "XOF", "XAF"] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { user: sessionUser, logout, refresh } = useAuth();
  const { t, setLocale } = useI18n();
  const theme = useOptionalTheme();
  const colors = theme?.colors ?? lightColors;
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [language, setLanguage] = useState<Locale>("fr");
  const [preferredCurrency, setPreferredCurrency] = useState("CAD");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLiability, setShowLiability] = useState(false);

  async function load() {
    try {
      const data = await api<{ user: ProfileUser }>("/api/profile");
      const u = data.user;
      setProfile({ ...u, kycRequired: sessionUser?.kycRequired ?? u.kycRequired });
      setLanguage(u.language === "en" ? "en" : "fr");
      setPreferredCurrency(u.preferredCurrency ?? "CAD");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patchAccount(partial: Record<string, unknown>) {
    const data = await api<{ user: ProfileUser }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(partial),
    });
    setProfile(data.user);
    await refresh();
    setMessage(t("profile_saved"));
  }

  async function onLanguage(next: Locale) {
    setLanguage(next);
    setLocale(next);
    setError("");
    try {
      await patchAccount({ language: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    }
  }

  async function onCurrency(code: string) {
    setPreferredCurrency(code);
    setError("");
    try {
      await patchAccount({ preferredCurrency: code });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    }
  }

  async function acceptCharter() {
    setSaving(true);
    setError("");
    try {
      await patchAccount({ acceptPublicationCharter: true });
      setMessage(t("pub_charter_accepted"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteAccount() {
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        t("delete_account_profile_title"),
        t("delete_account_profile_confirm_prompt"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("delete_account_profile_cta"),
            style: "destructive",
            onPress: (value?: string) => {
              if (value !== "SUPPRIMER") {
                Alert.alert(t("delete_account_profile_confirm_mismatch"));
                return;
              }
              void deleteAccount();
            },
          },
        ],
        "plain-text"
      );
      return;
    }
    Alert.alert(t("delete_account_profile_title"), t("delete_account_profile_desc"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete_account_profile_cta"),
        style: "destructive",
        onPress: () => void deleteAccount(),
      },
    ]);
  }

  async function deleteAccount() {
    setSaving(true);
    setError("");
    try {
      await api("/api/profile", {
        method: "DELETE",
        body: JSON.stringify({ confirm: "SUPPRIMER" }),
      });
      await logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("delete_account_profile_error"));
    } finally {
      setSaving(false);
    }
  }

  const site = getApiUrl();
  const year = String(new Date().getFullYear());

  if (loading) {
    return (
      <Screen>
        <Title>{t("settings_title")}</Title>
        <Muted>{t("loading")}</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>{t("settings_title")}</Title>
        <Muted>{t("settings_subtitle")}</Muted>

        {profile ? (
          <PaymentSetupCard
            user={{ ...profile }}
            onUserUpdated={(next) => setProfile(next)}
          />
        ) : null}

        <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.foreground }}>
          {t("theme_mode")}
        </Text>
        <ChipRow>
          <Chip
            label={t("theme_system")}
            selected={theme?.mode === "system"}
            onPress={() => theme?.setMode("system")}
          />
          <Chip
            label={t("theme_light")}
            selected={theme?.mode === "light"}
            onPress={() => theme?.setMode("light")}
          />
          <Chip
            label={t("theme_dark")}
            selected={theme?.mode === "dark"}
            onPress={() => theme?.setMode("dark")}
          />
        </ChipRow>

        <Text style={{ fontWeight: "700", marginTop: 16, marginBottom: 8, color: colors.foreground }}>
          {t("language")}
        </Text>
        <ChipRow>
          <Chip
            label={t("lang_fr")}
            selected={language === "fr"}
            onPress={() => void onLanguage("fr")}
          />
          <Chip
            label={t("lang_en")}
            selected={language === "en"}
            onPress={() => void onLanguage("en")}
          />
        </ChipRow>

        <Text style={{ fontWeight: "700", marginTop: 16, marginBottom: 8, color: colors.foreground }}>
          {t("preferred_currency")}
        </Text>
        <ChipRow>
          {CURRENCIES.map((code) => (
            <Chip
              key={code}
              label={code}
              selected={preferredCurrency === code}
              onPress={() => void onCurrency(code)}
            />
          ))}
        </ChipRow>

        <ErrorText>{error}</ErrorText>
        {message ? (
          <Text style={{ color: colors.accent, marginTop: 8 }}>{message}</Text>
        ) : null}

        <View style={{ height: 8 }} />
        <Button
          label={t("ambassador_become_cta")}
          onPress={() => void Linking.openURL(`${site}/ambassador/apply`)}
        />
        <Button
          label={t("trust_program_cta")}
          variant="outline"
          onPress={() => void Linking.openURL(`${site}/trust`)}
        />
        <Muted>{t("trust_program_hint")}</Muted>

        <Card>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            {t("pub_charter_profile_title")}
          </Text>
          <Button
            label={t("pub_charter_cta")}
            variant="outline"
            onPress={() => void Linking.openURL(`${site}/publication-charter`)}
          />
          {profile?.publicationCharterAcceptedAt ? (
            <Text style={{ color: colors.accent, marginTop: 8 }}>{t("pub_charter_accepted")}</Text>
          ) : (
            <Button
              label={t("pub_charter_accept")}
              onPress={() => void acceptCharter()}
              loading={saving}
            />
          )}
        </Card>

        <Button label={t("liability_title")} variant="outline" onPress={() => setShowLiability(true)} />
        <Button
          label={t("nav_terms")}
          variant="outline"
          onPress={() => void Linking.openURL(`${site}/terms`)}
        />
        <Button
          label={t("privacy_title")}
          variant="outline"
          onPress={() => void Linking.openURL(`${site}/privacy`)}
        />
        <Button
          label={t("cta_about_us")}
          variant="outline"
          onPress={() => void Linking.openURL(`${site}/about`)}
        />

        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 16 }}>
          {t("copyright_line").replace("{year}", year)}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, marginBottom: 12 }}>
          {t("copyright_ip_note")}
        </Text>

        <Button
          label={t("delete_account_profile_cta")}
          variant="danger"
          onPress={confirmDeleteAccount}
          loading={saving}
        />
        <Button
          label={t("delete_account_profile_info")}
          variant="outline"
          onPress={() => void Linking.openURL(`${site}/delete-account`)}
        />
        <Button
          label={t("logout")}
          variant="outline"
          onPress={() => {
            void logout()
              .catch(() => {})
              .finally(() => router.replace("/"));
          }}
        />
      </ScrollView>

      <Modal visible={showLiability} animationType="slide" onRequestClose={() => setShowLiability(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.accent, marginBottom: 12 }}>
            {t("liability_title")}
          </Text>
          <ScrollView>
            <Text style={{ color: colors.foreground, marginBottom: 12 }}>{t("liability_intro")}</Text>
            <Text style={{ fontWeight: "700", color: colors.accent }}>{t("liability_we_do")}</Text>
            <Text style={{ color: colors.foreground }}>· {t("liability_we_do_1")}</Text>
            <Text style={{ color: colors.foreground }}>· {t("liability_we_do_2")}</Text>
            <Text style={{ color: colors.foreground, marginBottom: 12 }}>· {t("liability_we_do_3")}</Text>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>{t("liability_you_do")}</Text>
            <Text style={{ color: colors.foreground }}>· {t("liability_you_do_1")}</Text>
            <Text style={{ color: colors.foreground }}>· {t("liability_you_do_2")}</Text>
            <Text style={{ color: colors.foreground, marginBottom: 12 }}>· {t("liability_you_do_3")}</Text>
            <Text style={{ fontWeight: "700", color: colors.danger }}>{t("liability_we_dont")}</Text>
            <Text style={{ color: colors.foreground }}>· {t("liability_we_dont_1")}</Text>
            <Text style={{ color: colors.foreground }}>· {t("liability_we_dont_2")}</Text>
            <Text style={{ color: colors.foreground }}>· {t("liability_we_dont_3")}</Text>
            <Pressable
              onPress={() => void Linking.openURL(`${site}/responsibility`)}
              style={{ marginTop: 16 }}
            >
              <Text style={{ color: colors.accent, fontWeight: "700" }}>{t("trust_program_cta")}</Text>
            </Pressable>
          </ScrollView>
          <Button label={t("close")} onPress={() => setShowLiability(false)} />
        </View>
      </Modal>
    </Screen>
  );
}
