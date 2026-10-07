import { type Href, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

const INTENTS = [
  {
    href: "/trips/search" as Href,
    titleKey: "publish_intent_transport" as const,
    hintFr: "Trouvez des transporteurs pour vos colis.",
    hintEn: "Find carriers for your parcels.",
  },
  {
    href: "/requests/search?need=JOB_OFFER" as Href,
    titleKey: "publish_intent_job" as const,
    hintFr: "Cherchez des offres d'emploi.",
    hintEn: "Search for job offers.",
  },
  {
    href: "/shops/search" as Href,
    titleKey: "publish_intent_shop" as const,
    hintFr: "Explorez les boutiques du réseau.",
    hintEn: "Explore shops in the network.",
  },
  {
    href: "/services/search" as Href,
    titleKey: "publish_intent_service" as const,
    hintFr: "Services: hébergement, ménage, cours, etc.",
    hintEn: "Services: lodging, cleaning, lessons, etc.",
  },
];

export function SearchServiceIntents() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <View style={{ gap: 8, marginTop: 12, marginBottom: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {t("search_intents_hint")}
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
