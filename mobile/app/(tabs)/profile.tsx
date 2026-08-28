import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Chip, ChipRow } from "@/components/chip";
import type { ProfileUser } from "@/components/payment-setup-card";
import {
  Button,
  ErrorText,
  Field,
  Muted,
  Screen,
  Title,
} from "@/components/ui";
import { api, mediaUrl, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";
import {
  apiRoleToIntent,
  intentToApiRole,
  loadUserIntent,
  saveUserIntent,
  type CarrierType,
  type OrderIntent,
  type PrimaryIntent,
} from "@/lib/user-intent";

async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Permission photos refusée");
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const name = asset.fileName || `photo-${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";
  return uploadFile("/api/upload", { uri: asset.uri, name, type });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user: sessionUser, refresh } = useAuth();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [primaryIntent, setPrimaryIntent] = useState<PrimaryIntent>("both");
  const [carrierType, setCarrierType] = useState<CarrierType>("particulier");
  const [orderIntent, setOrderIntent] = useState<OrderIntent>("envoyer");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      const data = await api<{ user: ProfileUser }>("/api/profile");
      const u = data.user;
      setProfile({ ...u, kycRequired: sessionUser?.kycRequired ?? u.kycRequired });
      setDisplayName(u.displayName ?? "");
      setBio(u.bio ?? "");
      setCountry(u.country ?? "");
      setAvatarUrl(u.avatarUrl ?? null);
      setBannerUrl(u.bannerUrl ?? null);
      const prefs = await loadUserIntent();
      setPrimaryIntent(
        u.role === "ADMIN" ? "both" : apiRoleToIntent(u.role) || prefs.primaryIntent
      );
      setCarrierType(prefs.carrierType);
      setOrderIntent(prefs.orderIntent);
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

  async function persistMedia(kind: "avatarUrl" | "bannerUrl", url: string | null) {
    const data = await api<{ user: ProfileUser }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ [kind]: url }),
    });
    setProfile(data.user);
    if (kind === "avatarUrl") setAvatarUrl(url);
    else setBannerUrl(url);
    await refresh();
    setMessage(t("profile_saved"));
  }

  async function onPick(kind: "avatar" | "banner") {
    setUploading(true);
    setError("");
    try {
      const uploaded = await pickImage();
      if (!uploaded) return;
      await persistMedia(kind === "avatar" ? "avatarUrl" : "bannerUrl", uploaded.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (displayName.trim().length < 2) {
      setError("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveUserIntent({ primaryIntent, carrierType, orderIntent });
      const data = await api<{ user: ProfileUser }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim(),
          country: country.trim() || undefined,
          avatarUrl,
          bannerUrl,
          ...(profile?.role !== "ADMIN" ? { role: intentToApiRole(primaryIntent) } : {}),
        }),
      });
      setProfile(data.user);
      await refresh();
      setMessage(t("profile_saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Title>{t("profile_title")}</Title>
        <Muted>{t("loading")}</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>{t("profile_title")}</Title>
        <Muted>{t("profile_subtitle")}</Muted>

        <View style={{ marginTop: 12 }}>
          <Button
            label={t("profile_open_settings")}
            variant="outline"
            onPress={() => router.push("/(tabs)/settings")}
          />
        </View>

        <Text style={{ fontWeight: "700", marginTop: 16, marginBottom: 6, color: colors.foreground }}>
          {t("profile_banner")}
        </Text>
        <Muted>{t("profile_banner_hint")}</Muted>
        <View
          style={{
            height: 120,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: colors.surface2,
            marginTop: 8,
            marginBottom: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {bannerUrl ? (
            <Image
              source={{ uri: mediaUrl(bannerUrl) }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: colors.muted }}>{t("profile_banner_none")}</Text>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={bannerUrl ? t("profile_banner_change") : t("profile_banner_add")}
              variant="outline"
              onPress={() => void onPick("banner")}
              loading={uploading}
            />
          </View>
          {bannerUrl ? (
            <View style={{ flex: 1 }}>
              <Button
                label={t("profile_banner_remove")}
                variant="outline"
                onPress={() => void persistMedia("bannerUrl", null)}
              />
            </View>
          ) : null}
        </View>

        <Text style={{ fontWeight: "700", marginTop: 16, marginBottom: 6, color: colors.foreground }}>
          {t("photo")}
        </Text>
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          {avatarUrl ? (
            <Image
              source={{ uri: mediaUrl(avatarUrl) }}
              style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: colors.accentSoft }}
            />
          ) : (
            <View
              style={{
                width: 112,
                height: 112,
                borderRadius: 56,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 28 }}>
                {(displayName || "R").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={avatarUrl ? t("change_photo") : t("add_photo")}
              variant="outline"
              onPress={() => void onPick("avatar")}
              loading={uploading}
            />
          </View>
          {avatarUrl ? (
            <View style={{ flex: 1 }}>
              <Button
                label={t("remove_photo")}
                variant="outline"
                onPress={() => void persistMedia("avatarUrl", null)}
              />
            </View>
          ) : null}
        </View>
        <Muted>{profile?.email || profile?.phone || "—"}</Muted>

        <View style={{ height: 12 }} />
        <Field label={t("display_name")} value={displayName} onChangeText={setDisplayName} />
        <Field label={t("country")} value={country} onChangeText={setCountry} placeholder="GA" />
        <Field
          label={t("bio")}
          value={bio}
          onChangeText={setBio}
          multiline
          style={{ minHeight: 80, textAlignVertical: "top" }}
        />

        {profile?.role !== "ADMIN" ? (
          <>
            <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.foreground }}>
              {t("role")}
            </Text>
            <ChipRow>
              <Chip
                label={t("intent_vendre")}
                selected={primaryIntent === "vendre"}
                onPress={() => setPrimaryIntent("vendre")}
              />
              <Chip
                label={t("intent_payer")}
                selected={primaryIntent === "payer"}
                onPress={() => setPrimaryIntent("payer")}
              />
              <Chip
                label={t("intent_both")}
                selected={primaryIntent === "both"}
                onPress={() => setPrimaryIntent("both")}
              />
            </ChipRow>
            {primaryIntent === "vendre" || primaryIntent === "both" ? (
              <>
                <Text
                  style={{
                    fontWeight: "700",
                    marginTop: 12,
                    marginBottom: 8,
                    color: colors.foreground,
                  }}
                >
                  {t("carrier_type")}
                </Text>
                <ChipRow>
                  <Chip
                    label={t("carrier_particulier")}
                    selected={carrierType === "particulier"}
                    onPress={() => setCarrierType("particulier")}
                  />
                  <Chip
                    label={t("carrier_commercial")}
                    selected={carrierType === "commercial"}
                    onPress={() => setCarrierType("commercial")}
                  />
                </ChipRow>
              </>
            ) : null}
            {primaryIntent === "payer" || primaryIntent === "both" ? (
              <>
                <Text
                  style={{
                    fontWeight: "700",
                    marginTop: 12,
                    marginBottom: 8,
                    color: colors.foreground,
                  }}
                >
                  {t("order_intent")}
                </Text>
                <ChipRow>
                  <Chip
                    label={t("order_send")}
                    selected={orderIntent === "envoyer"}
                    onPress={() => setOrderIntent("envoyer")}
                  />
                  <Chip
                    label={t("order_receive")}
                    selected={orderIntent === "recevoir"}
                    onPress={() => setOrderIntent("recevoir")}
                  />
                </ChipRow>
              </>
            ) : null}
          </>
        ) : null}

        <ErrorText>{error}</ErrorText>
        {message ? (
          <Text style={{ color: colors.accent, marginTop: 8 }}>{message}</Text>
        ) : null}
        {uploading ? <Muted>{t("uploading")}</Muted> : null}
        <Button label={t("save")} onPress={() => void save()} loading={saving} />

        <View style={{ marginTop: 12 }}>
          <Button label={t("meet_edit_profile")} onPress={() => router.push("/meet")} />
        </View>
      </ScrollView>
    </Screen>
  );
}
