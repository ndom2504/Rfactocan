import { Screen, Title, Muted } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { TravelerSearch } from "@/components/traveler-search";

export default function TripsSearchScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Title>{t("trips_title")}</Title>
      <Muted>{t("trips_subtitle")}</Muted>
      <TravelerSearch hideHeading plain />
    </Screen>
  );
}
