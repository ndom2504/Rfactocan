import type { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card } from "@/components/ui";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

function useColors() {
  return useOptionalTheme()?.colors ?? lightColors;
}

export function buildQuery(params: Record<string, string>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v.trim()) u.set(k, v.trim());
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export function SearchLayout({
  title,
  hint,
  hideHeading,
  plain,
  filters,
  children,
}: {
  title: string;
  hint: string;
  hideHeading?: boolean;
  plain?: boolean;
  filters: ReactNode;
  children?: ReactNode;
}) {
  const colors = useColors();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {!hideHeading ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
            {title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{hint}</Text>
        </View>
      ) : null}
      {plain ? <View style={{ marginBottom: 12 }}>{filters}</View> : <Card>{filters}</Card>}
      {children}
    </ScrollView>
  );
}

export function SearchActions({
  loading,
  error,
  onSearch,
  onReset,
}: {
  loading: boolean;
  error: string;
  onSearch: () => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  const colors = useColors();
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label={t("search")} onPress={onSearch} loading={loading} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t("reset")} variant="outline" disabled={loading} onPress={onReset} />
        </View>
      </View>
      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} /> : null}
      {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}
    </>
  );
}

export function SearchResults({
  count,
  foundLabel,
  emptyLabel,
  children,
}: {
  count: number;
  foundLabel: string;
  emptyLabel: string;
  children: ReactNode;
}) {
  const colors = useColors();
  return (
    <View>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>
        {count} {foundLabel}
      </Text>
      {count === 0 ? <Text style={{ color: colors.muted }}>{emptyLabel}</Text> : children}
    </View>
  );
}

export function SearchResultCard({
  title,
  subtitle,
  meta,
  description,
  imageUrl,
  actionLabel,
  onPress,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  description?: string | null;
  imageUrl?: string | null;
  actionLabel?: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
      <Card>
        {imageUrl ? (
          <Image
            source={{ uri: mediaUrl(imageUrl) }}
            style={{
              width: "100%",
              height: 140,
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
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{meta}</Text>
        ) : null}
        {description ? (
          <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            {description}
          </Text>
        ) : null}
        {actionLabel ? <Button label={actionLabel} onPress={onPress} /> : null}
      </Card>
    </Pressable>
  );
}
