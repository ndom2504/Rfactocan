import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ErrorText, Field } from "@/components/ui";
import { getApiUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || t("retry"));
      }
      setInfo(data.message || t("forgot_password_sent"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.greenDark,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "700",
                marginBottom: 8,
              }}
            >
              {t("forgot_password_title")}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 15,
                lineHeight: 22,
                marginBottom: 20,
              }}
            >
              {t("forgot_password_hint")}
            </Text>
            <Field
              label="Email"
              labelStyle={{ color: "#fff" }}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
            />
            {!!info && !error ? (
              <Text style={{ color: "#8BC34A", marginBottom: 8 }}>{info}</Text>
            ) : null}
            <ErrorText>{error}</ErrorText>
            <Button
              label={t("forgot_password_send")}
              onPress={() => void onSubmit()}
              loading={loading}
            />
            <Pressable onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 16 }}>
              <Text style={{ color: "#fff", textAlign: "center" }}>
                {t("back_to_login")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
