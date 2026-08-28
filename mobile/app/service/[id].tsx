import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { startDirectChat } from "@/lib/dm";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { PRICE_UNITS, catalogLabel } from "@/lib/services-catalog";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  serviceType: string;
  country: string;
  city: string;
  priceAmount: number | null;
  priceUnit: string;
  currency: string;
  photos?: string[];
  websiteUrl?: string | null;
  userId: string;
  user: {
    id: string;
    displayName: string;
    ratingAvg?: number;
    ratingCount?: number;
    kycStatus?: string | null;
    avatarUrl?: string | null;
    country?: string | null;
  };
};

export default function ServiceListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const data = await api<{ listing: Listing }>(`/api/services/${id}`);
      setListing(data.listing);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function contact() {
    if (!listing) return;
    const peerId = listing.userId || listing.user?.id;
    if (!peerId) return;
    setBusy(true);
    setError("");
    try {
      const body =
        locale === "en"
          ? `Hello, I am interested in your service « ${listing.title} ».`
          : `Bonjour, je suis intéressé(e) par votre service « ${listing.title} ».`;
      const threadId = await startDirectChat({
        toUserId: peerId,
        contextType: "SERVICE",
        contextId: listing.id,
        body,
      });
      if (threadId) router.push(`/messages/${threadId}`);
      else router.push("/(tabs)/messages");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  if (!listing) {
    return (
      <Screen>
        <ErrorText>{error || "Service introuvable"}</ErrorText>
        <Button label="Retour" variant="outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  const isOwner = Boolean(user?.id) && user?.id === listing.userId;
  const meVerified = user?.kycStatus === "VERIFIED" || user?.kycRequired === false;
  const peerVerified =
    listing.user?.kycStatus === "VERIFIED" ||
    listing.country === "GA" ||
    listing.user?.country === "GA";
  const canContact = !isOwner && Boolean(user?.id) && meVerified && peerVerified;
  const unit = PRICE_UNITS.find((u) => u.id === listing.priceUnit);
  const photos = listing.photos ?? [];
  const avatar = listing.user?.avatarUrl ? mediaUrl(listing.user.avatarUrl) : "";

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, width: "100%" }}>
        <ErrorText>{error}</ErrorText>
        {photos.map((url) => (
          <Image
            key={url}
            source={{ uri: mediaUrl(url) }}
            style={{
              width: "100%",
              aspectRatio: 4 / 3,
              borderRadius: 12,
              marginBottom: 10,
              backgroundColor: colors.surface2,
            }}
            resizeMode="cover"
          />
        ))}
        <Title>{listing.title}</Title>
        <Muted>
          {[listing.city, listing.country].filter(Boolean).join(", ")}
          {listing.priceAmount != null
            ? ` · ${formatMoney(listing.priceAmount, listing.currency || "CAD")}${
                unit ? ` / ${catalogLabel(unit, locale)}` : ""
              }`
            : ""}
        </Muted>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginTop: 14,
            marginBottom: 12,
          }}
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.accentSoft,
              }}
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 20 }}>
                {(listing.user?.displayName || "R").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 16 }}>
              {listing.user?.displayName || "—"}
            </Text>
            <Muted>
              {(listing.user?.ratingCount ?? 0) > 0
                ? `★ ${(listing.user?.ratingAvg ?? 0).toFixed(1)} (${listing.user?.ratingCount})`
                : t("services_no_rating")}
            </Muted>
          </View>
        </View>

        <Text style={{ color: colors.foreground, lineHeight: 22, marginBottom: 16 }}>
          {listing.description}
        </Text>

        {listing.websiteUrl ? (
          <Pressable
            onPress={() => void Linking.openURL(listing.websiteUrl!)}
            style={{ marginBottom: 16 }}
          >
            <Text style={{ color: colors.accent, fontWeight: "700" }}>
              {listing.websiteUrl}
            </Text>
          </Pressable>
        ) : null}

        {!isOwner ? (
          canContact ? (
            <Button
              label={t("services_contact")}
              onPress={() => void contact()}
              loading={busy}
            />
          ) : (
            <>
              <Button
                label={t("verify_identity")}
                variant="outline"
                onPress={() => router.push("/(tabs)/settings")}
              />
              <Muted>
                {user?.id && !meVerified
                  ? t("services_verify_to_contact")
                  : t("dm_verified_required")}
              </Muted>
            </>
          )
        ) : (
          <Muted>{t("services_own_listing")}</Muted>
        )}
      </ScrollView>
    </Screen>
  );
}
