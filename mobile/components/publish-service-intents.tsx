import { type Href, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

const INTENTS = [
  {
    href: "/trip/new" as Href,
    titleKey: "publish_intent_transport" as const,
    hintFr: "Trajet, capacité bagages / colis.",
    hintEn: "Route, luggage / parcel capacity.",
  },
  {
    href: "/request/new?need=JOB_OFFER" as Href,
    titleKey: "publish_intent_job" as const,
    hintFr: "Offre d’emploi pour recruter.",
    hintEn: "Job offer to hire.",
  },
  {
    href: "/shops/new" as Href,
    titleKey: "publish_intent_shop" as const,
    hintFr: "Boutique en ligne pour vendre.",
    hintEn: "Online shop to sell.",
  },
];

export function PublishServiceIntents() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <View style={{ gap: 8, marginTop: 12, marginBottom: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {t("publish_intents_hint")}
      </Text>
      {INTENTS.map((item) => (
        <Pressable
          key={item.titleKey}
          onPress={() => router.push(item.href)}
          style={{
            borderWidth: 1,
            borderColor: colors.accent,
            backgroundColor: "transparent",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            {t(item.titleKey)}
          </Text>
          <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>
            {locale === "en" ? item.hintEn : item.hintFr}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
