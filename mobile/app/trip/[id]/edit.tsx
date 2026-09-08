import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { TripForm, type TripFormInitial } from "@/components/trip-form";
import { ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function EditTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [initial, setInitial] = useState<TripFormInitial | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api<{ trip: TripFormInitial }>(`/api/trips/${id}`);
      setInitial(data.trip);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) {
    return (
      <Screen>
        <Muted>{t("loading")}</Muted>
      </Screen>
    );
  }

  if (!initial) {
    return (
      <Screen>
        <ErrorText>{error || t("retry")}</ErrorText>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Title>{t("edit")}</Title>
          <ErrorText>{error}</ErrorText>
          <TripForm
            mode="edit"
            initial={initial}
            submitting={saving}
            onSubmit={async (payload) => {
              if (!id) return;
              setSaving(true);
              setError("");
              try {
                await api(`/api/trips/${id}`, {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                });
                router.replace(`/trip/${id}`);
              } catch (e) {
                setError(e instanceof Error ? e.message : t("retry"));
                setSaving(false);
              }
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
