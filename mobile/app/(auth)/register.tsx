import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from "react-native";
import { PhoneOtpAuth } from "@/components/phone-otp-auth";
import { Button, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("CA");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Title>Créer un compte</Title>
          <Muted>Email ou SMS — expéditeur, voyageur, ou les deux.</Muted>
          {mode === "phone" ? (
            <>
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
