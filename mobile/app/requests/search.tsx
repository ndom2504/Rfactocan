import { Screen, Title, Muted } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { RequestSearch } from "@/components/request-search";

export default function RequestsSearchScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Title>{t("requests_title")}</Title>
      <Muted>{t("requests_subtitle")}</Muted>
      <RequestSearch hideHeading plain />
    </Screen>
  );
}
