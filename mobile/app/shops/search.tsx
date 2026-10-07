import { Screen, Title, Muted } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { ShopSearch } from "@/components/shop-search";

export default function ShopsSearchScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Title>{t("shops_title")}</Title>
      <Muted>{t("shops_subtitle")}</Muted>
      <ShopSearch hideHeading plain />
    </Screen>
  );
}
