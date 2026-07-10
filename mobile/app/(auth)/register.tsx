import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { Button, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { colors } from "@/lib/theme";

export default function RegisterScreen() {
  const { register } = useAuth();
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
          <Muted>Expéditeur, voyageur, ou les deux.</Muted>
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
            label="Pays (code ISO, ex. CA, FR, SN)"
            autoCapitalize="characters"
            value={country}
            onChangeText={setCountry}
          />
          <ErrorText>{error}</ErrorText>
          <Button label="S'inscrire" onPress={onSubmit} loading={loading} />
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
