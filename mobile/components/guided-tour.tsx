import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import {
  TOUR_STEPS,
  consumeTourPending,
  markTourDone,
  onTourStartRequest,
} from "@/lib/guided-tour";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

export function GuidedTour() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const segments = useSegments();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);

  const step = TOUR_STEPS[index];
  const isLast = index >= TOUR_STEPS.length - 1;

  const start = useCallback(() => {
    setIndex(0);
    setActive(true);
    const first = TOUR_STEPS[0];
    if (first) router.push(first.href);
  }, [router]);

  const finish = useCallback(() => {
    setActive(false);
    setIndex(0);
    void markTourDone();
  }, []);

  useEffect(() => onTourStartRequest(start), [start]);

  useEffect(() => {
    if (!user) {
      setActive(false);
      return;
    }
    const root = String(segments[0] ?? "");
    if (root !== "(tabs)") return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (consumeTourPending()) start();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user?.id, segments, start]);

  function goTo(nextIndex: number) {
    const next = TOUR_STEPS[nextIndex];
    if (!next) return;
    const prevHref = TOUR_STEPS[index]?.href;
    setIndex(nextIndex);
    if (next.href !== prevHref) router.push(next.href);
  }

  if (!active || !step) return null;

  return (
    <Modal transparent animationType="fade" visible={active} onRequestClose={finish}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 22, 12, 0.45)",
          justifyContent: "flex-end",
        }}
      >
        <View style={{ flex: 1 }} />
        <View
          style={{
            margin: 16,
            marginBottom: 28,
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 18,
            gap: 10,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
            {t("tour_label")} · {index + 1}/{TOUR_STEPS.length}
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800" }}>
            {t(step.titleKey)}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
            {t(step.bodyKey)}
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 8,
              alignItems: "center",
            }}
          >
            <Pressable onPress={finish} style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
              <Text style={{ color: colors.muted, fontWeight: "700" }}>{t("tour_skip")}</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            {index > 0 ? (
              <Pressable
                onPress={() => goTo(index - 1)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  {t("tour_prev")}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => (isLast ? finish() : goTo(index + 1))}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor: colors.accent,
              }}
            >
              <Text style={{ color: colors.white, fontWeight: "700" }}>
                {isLast ? t("tour_done") : t("tour_next")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
