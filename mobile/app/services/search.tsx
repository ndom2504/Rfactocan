import { Screen, Title, Muted } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { ServiceSearch } from "@/components/service-search";

export default function ServicesSearchScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Title>{t("services_title")}</Title>
      <Muted>{t("services_subtitle")}</Muted>
      <ServiceSearch hideHeading plain />
    </Screen>
  );
}
