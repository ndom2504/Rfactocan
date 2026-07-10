import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Button,
  Card,
  ErrorText,
  Field,
  Muted,
  Screen,
  Title,
} from "@/components/ui";
import { colors } from "@/lib/theme";

export default function ProfileScreen() {
  const { user, logout, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [preferredCurrency, setPreferredCurrency] = useState(
    user?.preferredCurrency ?? "CAD"
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setPreferredCurrency(user?.preferredCurrency ?? "CAD");
  }, [user]);

  async function save() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim(),
          preferredCurrency: preferredCurrency.trim().toUpperCase(),
        }),
      });
      await refresh();
      setMessage("Profil enregistré.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView>
        <Title>Profil</Title>
        <Muted>{user?.email}</Muted>
        <Card>
          <Field
            label="Nom affiché"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <Field
            label="Devise préférée (CAD, USD, EUR, XOF, XAF)"
            autoCapitalize="characters"
            value={preferredCurrency}
            onChangeText={setPreferredCurrency}
          />
          <ErrorText>{error}</ErrorText>
          {message ? (
            <Text style={{ color: colors.accent, marginTop: 8 }}>{message}</Text>
          ) : null}
          <Button label="Enregistrer" onPress={save} loading={loading} />
        </Card>
        <Button label="Se déconnecter" variant="outline" onPress={logout} />
      </ScrollView>
    </Screen>
  );
}
