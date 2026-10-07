import { Screen, Title, Muted } from "@/components/ui";
import { PublishServiceIntents } from "@/components/publish-service-intents";
import { useI18n } from "@/lib/i18n";

export default function NewServiceScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Title>{t("services_publish")}</Title>
      <Muted>{t("services_publish_hint")}</Muted>
      <PublishServiceIntents />
    </Screen>
  );
}
