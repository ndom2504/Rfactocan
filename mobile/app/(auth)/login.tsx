import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, Pressable } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { Button, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const { login, verifyLoginOtp, resendLoginOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const result = await login(email.trim(), password);
      if (result.mfaRequired) {
        setMfaToken(result.mfaToken);
        setEmailHint(result.emailHint);
        setInfo("Un code a été envoyé à votre email.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    if (!mfaToken) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      await verifyLoginOtp(mfaToken, otpCode.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code incorrect");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!mfaToken) return;
    setResendLoading(true);
    setError("");
    try {
      const hint = await resendLoginOtp(mfaToken);
      if (hint) setEmailHint(hint);
      setInfo("Un nouveau code a été envoyé.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de renvoyer le code");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Title>Rfacto</Title>
          {mfaToken ? (
            <>
              <Muted>
                Entrez le code à 6 chiffres envoyé à {emailHint || "votre email"}.
              </Muted>
              <Field
                label="Code de vérification"
                keyboardType="number-pad"
                value={otpCode}
                onChangeText={(v) => setOtpCode(v.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
              />
              {!!info && !error && (
                <Text style={{ color: colors.accent, marginBottom: 8 }}>{info}</Text>
              )}
              <ErrorText>{error}</ErrorText>
              <Button label="Valider le code" onPress={onVerify} loading={loading} />
              <Button
                label="Renvoyer le code"
                onPress={onResend}
                loading={resendLoading}
                variant="outline"
              />
              <Pressable
                onPress={() => {
                  setMfaToken(null);
                  setOtpCode("");
                  setInfo("");
                  setError("");
                }}
                style={{ marginTop: 16 }}
              >
                <Text style={{ color: colors.muted, textAlign: "center" }}>
                  Retour à la connexion
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Muted>
                Connectez-vous pour trouver un voyageur ou proposer de transporter
                un colis.
              </Muted>
              <Field
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="vous@email.com"
              />
              <Field
                label="Mot de passe"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
              />
              <ErrorText>{error}</ErrorText>
              <Button label="Se connecter" onPress={onSubmit} loading={loading} />
              <Link href="/(auth)/register" style={{ marginTop: 16 }}>
                <Text style={{ color: colors.accent, fontWeight: "600" }}>
                  Créer un compte
                </Text>
              </Link>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
