"use client";

import { Suspense } from "react";
import { PublishServiceIntents } from "@/components/publish-service-intents";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

export default function NewServicePage() {
  const { t } = useI18n();

  return (
    <Suspense>
      <Card className="mx-auto max-w-2xl">
        <CardTitle>{t("services_publish")}</CardTitle>
        <CardDescription className="mt-1">
          {t("services_publish_hint")}
        </CardDescription>
        <div className="mt-6">
          <PublishServiceIntents />
        </div>
      </Card>
    </Suspense>
  );
}
