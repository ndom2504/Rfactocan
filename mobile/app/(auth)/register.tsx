import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from "react-native";
import { PhoneOtpAuth } from "@/components/phone-otp-auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Button, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function RegisterScreen() {
  const { register, verifyLoginOtp, resendLoginOtp } = useAuth();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("CA");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState("");
  const [otpCode, setOtpCode] = useState("");

  function onGoogleMfa(token: string, hint: string) {
    setMfaToken(token);
    setEmailHint(hint);
    setInfo("Un code a été envoyé à votre email.");
    setError("");
  }

  async function onSubmit() {
    setLoading(true);
    setError("");
    try {
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        role: "BOTH",
        country: country.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inscription impossible");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyGoogle() {
    if (!mfaToken) return;
    setLoading(true);
    setError("");
    try {
      await verifyLoginOtp(mfaToken, otpCode.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code incorrect");
    } finally {
      setLoading(false);
    }
  }

  async function onResendGoogle() {
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
          <Title>Créer un compte</Title>
          <Muted>Email, Google ou SMS — expéditeur, voyageur, ou les deux.</Muted>
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
              {!!info && !error ? (
                <Text style={{ color: colors.accent, marginBottom: 8 }}>{info}</Text>
              ) : null}
              <ErrorText>{error}</ErrorText>
              <Button label="Valider le code" onPress={onVerifyGoogle} loading={loading} />
              <Button
                label="Renvoyer le code"
                onPress={onResendGoogle}
                loading={resendLoading}
                variant="outline"
              />
            </>
          ) : mode === "phone" ? (
            <>
              <GoogleSignInButton
                tone="light"
                disabled={loading}
                onMfa={onGoogleMfa}
                onError={setError}
              />
              <PhoneOtpAuth
                displayName={displayName}
                onDisplayNameChange={setDisplayName}
                onLoggedIn={() => {}}
              />
              <Pressable onPress={() => setMode("email")} style={{ marginTop: 16 }}>
                <Text style={{ color: colors.accent, fontWeight: "600", textAlign: "center" }}>
                  J’ai un email
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <GoogleSignInButton
                tone="light"
                disabled={loading}
                onMfa={onGoogleMfa}
                onError={setError}
              />
              <Field
                label="Nom affiché"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Amina N."
              />
              <Field
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Field
                label="Mot de passe (8+ caractères)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Field
                label="Pays (code ISO, ex. CA, FR, GA)"
                autoCapitalize="characters"
                value={country}
                onChangeText={setCountry}
              />
              <ErrorText>{error}</ErrorText>
              <Button label="S'inscrire" onPress={onSubmit} loading={loading} />
              <Pressable onPress={() => setMode("phone")} style={{ marginTop: 16 }}>
                <Text style={{ color: colors.accent, fontWeight: "600", textAlign: "center" }}>
                  Créer le compte par SMS
                </Text>
              </Pressable>
            </>
          )}
          <Link href="/(auth)/login" style={{ marginTop: 16 }}>
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              Déjà un compte ? Connexion
            </Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
