import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { TripForm } from "@/components/trip-form";
import { ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function NewTripScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Title>{t("new_trip_title")}</Title>
          <Muted>{t("new_trip_subtitle")}</Muted>
          <ErrorText>{error}</ErrorText>
          <TripForm
            mode="create"
            submitting={loading}
            onSubmit={async (payload) => {
              setLoading(true);
              setError("");
              try {
                const data = await api<{ trip: { id: string } }>("/api/trips", {
                  method: "POST",
                  body: JSON.stringify(payload),
                });
                router.replace(`/trip/${data.trip.id}`);
              } catch (e) {
                setError(e instanceof Error ? e.message : t("retry"));
                setLoading(false);
              }
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
