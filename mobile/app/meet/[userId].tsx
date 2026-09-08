import { useCallback, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Button, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type ViewData = {
  profile: {
    headline: string;
    bio: string | null;
    kind: "BUSINESS" | "ROMANCE";
    city: string | null;
    country: string | null;
    photoUrl: string | null;
    photoVisible: boolean;
  };
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    verified: boolean;
  };
  contactStatus: string | null;
  contactId: string | null;
  threadId: string | null;
  canContact: boolean;
};

export default function MeetPublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const router = useRouter();
  const [data, setData] = useState<ViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    if (user?.id && user.id === userId) {
      router.replace("/meet" as Href);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const json = await api<ViewData>(`/api/meet/${userId}`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.id, router, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function sendContact() {
    if (!userId) return;
    setBusy(true);
    setError("");
    try {
      const json = await api<{ threadId?: string }>("/api/meet/contact", {
        method: "POST",
        body: JSON.stringify({
          toUserId: userId,
          message: note.trim() || undefined,
        }),
      });
      if (json.threadId) {
        router.push(`/messages/${json.threadId}`);
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!data?.contactId) return;
    setBusy(true);
    setError("");
    try {
      const json = await api<{ threadId?: string }>(
        `/api/meet/contact/${data.contactId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ action: "accept" }),
        }
      );
      if (json.threadId) router.push(`/messages/${json.threadId}`);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Muted>{t("loading")}</Muted>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
        <Button label={t("browse_meet")} onPress={() => router.replace("/meet" as Href)} />
      </Screen>
    );
  }

  const photo = data.profile.photoVisible
    ? data.profile.photoUrl || data.user.avatarUrl
    : data.user.avatarUrl;

  return (
    <Screen>
      <ScrollView>
        {photo ? (
          <Image
            source={{ uri: mediaUrl(photo) }}
            style={{
              width: "100%",
              height: 220,
              borderRadius: 14,
              marginBottom: 16,
              backgroundColor: colors.surface2,
            }}
            resizeMode="cover"
          />
        ) : null}
        <Title>{data.user.displayName}</Title>
        <Text style={{ color: colors.accent, fontWeight: "700", marginBottom: 8 }}>
          {data.profile.headline}
        </Text>
        <Muted>
          {[
            data.profile.kind === "ROMANCE"
              ? t("meet_kind_romance")
              : t("meet_kind_business"),
            data.profile.city,
            data.profile.country,
            data.user.verified ? t("verified") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Muted>
        {data.profile.bio ? (
          <Text style={{ color: colors.foreground, marginTop: 12, lineHeight: 22 }}>
            {data.profile.bio}
          </Text>
        ) : null}
        <ErrorText>{error}</ErrorText>
        {data.threadId ? (
          <Button
            label={t("meet_open_chat")}
            onPress={() => router.push(`/messages/${data.threadId}`)}
          />
        ) : data.contactStatus === "INCOMING" ? (
          <Button
            label={t("meet_accept")}
            onPress={() => void accept()}
            loading={busy}
          />
        ) : data.contactStatus === "SENT" ? (
          <Muted>{t("meet_contact_sent")}</Muted>
        ) : data.canContact ? (
          <View style={{ marginTop: 12 }}>
            <Field
              label={t("meet_contact")}
              value={note}
              onChangeText={setNote}
              multiline
              style={{ minHeight: 72, textAlignVertical: "top" }}
            />
            <Button
              label={t("meet_contact")}
              onPress={() => void sendContact()}
              loading={busy}
            />
          </View>
        ) : (
          <Button
            label={t("meet_need_profile")}
            variant="outline"
            onPress={() => router.push("/meet" as Href)}
          />
        )}
        <Button
          label={t("browse_meet")}
          variant="outline"
          onPress={() => router.push("/meet" as Href)}
        />
      </ScrollView>
    </Screen>
  );
}
