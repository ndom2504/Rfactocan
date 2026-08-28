import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhoneOtpAuth } from "@/components/phone-otp-auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Button, ErrorText, Field } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mfaToken?: string; emailHint?: string }>();
  const { login, verifyLoginOtp, resendLoginOtp } = useAuth();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [phoneDisplayName, setPhoneDisplayName] = useState("");

  useEffect(() => {
    const token = Array.isArray(params.mfaToken)
      ? params.mfaToken[0]
      : params.mfaToken;
    if (!token) return;
    const hint = Array.isArray(params.emailHint)
      ? params.emailHint[0]
      : params.emailHint;
    setMfaToken(token);
    setEmailHint(hint || "");
    setInfo("Un code a été envoyé à votre email.");
  }, [params.mfaToken, params.emailHint]);

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
              {mfaToken ? "Vérification" : "Connexion"}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 22, marginBottom: 20 }}>
              {mfaToken
                ? `Entrez le code à 6 chiffres envoyé à ${emailHint || "votre email"}.`
                : mode === "phone"
                  ? "Vous pouvez aussi vous connecter avec votre numéro."
                  : "Heureux de vous revoir ! Connectez-vous pour continuer."}
            </Text>

            {mfaToken ? (
              <>
                <Field
                  label="Code de vérification"
                  labelStyle={{ color: "#fff" }}
                  keyboardType="number-pad"
                  value={otpCode}
                  onChangeText={(v) => setOtpCode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                />
                {!!info && !error && (
                  <Text style={{ color: "#8BC34A", marginBottom: 8 }}>{info}</Text>
                )}
                <ErrorText>{error}</ErrorText>
                <Button label="Valider le code" onPress={onVerify} loading={loading} />
                <Button
                  label="Renvoyer le code"
                  onPress={onResend}
                  loading={resendLoading}
                  variant="outline"
                  tone="dark"
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
                  <Text style={{ color: "rgba(255,255,255,0.85)", textAlign: "center" }}>
                    Retour à la connexion
                  </Text>
                </Pressable>
              </>
            ) : mode === "phone" ? (
              <>
                <GoogleSignInButton
                  disabled={loading}
                  onMfa={(token, hint) => {
                    setMfaToken(token);
                    setEmailHint(hint);
                    setInfo("Un code a été envoyé à votre email.");
                    setError("");
                  }}
                  onError={setError}
                />
                <PhoneOtpAuth
                  tone="dark"
                  displayName={phoneDisplayName}
                  onDisplayNameChange={setPhoneDisplayName}
                  onLoggedIn={() => {}}
                />
                <Pressable onPress={() => setMode("email")} style={{ marginTop: 16 }}>
                  <Text style={{ color: "#8BC34A", fontWeight: "600", textAlign: "center" }}>
                    J’ai un email
                  </Text>
                </Pressable>
                <Link href="/(auth)/register" style={{ marginTop: 16 }}>
                  <Text style={{ color: "#8BC34A", fontWeight: "600", textAlign: "center" }}>
                    Créer un compte
                  </Text>
                </Link>
                <Pressable onPress={() => router.replace("/")} style={{ marginTop: 16 }}>
                  <Text style={{ color: "#fff", textAlign: "center" }}>Retour</Text>
                </Pressable>
              </>
            ) : (
              <>
                <GoogleSignInButton
                  disabled={loading}
                  onMfa={(token, hint) => {
                    setMfaToken(token);
                    setEmailHint(hint);
                    setInfo("Un code a été envoyé à votre email.");
                    setError("");
                  }}
                  onError={setError}
                />
                <Field
                  label="Email"
                  labelStyle={{ color: "#fff" }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="votre@email.com"
                />
                <Field
                  label="Mot de passe"
                  labelStyle={{ color: "#fff" }}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <ErrorText>{error}</ErrorText>
                <Button label="Se connecter" onPress={onSubmit} loading={loading} />
                <Pressable onPress={() => setMode("phone")} style={{ marginTop: 16 }}>
                  <Text style={{ color: "#8BC34A", fontWeight: "600", textAlign: "center" }}>
                    Connexion par SMS
                  </Text>
                </Pressable>
                <Link href="/(auth)/register" style={{ marginTop: 16, alignSelf: "center" }}>
                  <Text style={{ color: "#8BC34A", fontWeight: "600", textAlign: "center" }}>
                    Créer un compte
                  </Text>
                </Link>
                <Pressable onPress={() => router.replace("/")} style={{ marginTop: 16 }}>
                  <Text style={{ color: "#fff", textAlign: "center" }}>Retour</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
