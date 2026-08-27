import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, ScrollView, Text } from "react-native";
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
  const router = useRouter();
  const { user, logout, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [preferredCurrency, setPreferredCurrency] = useState(
    user?.preferredCurrency ?? "CAD"
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  function confirmDeleteAccount() {
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        "Supprimer mon compte",
        "Tapez SUPPRIMER pour confirmer. Action définitive.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: (value?: string) => {
              if (value !== "SUPPRIMER") {
                Alert.alert(
                  "Confirmation incorrecte",
                  "Le compte n'a pas été supprimé."
                );
                return;
              }
              void deleteAccount();
            },
          },
        ],
        "plain-text"
      );
      return;
    }

    Alert.alert(
      "Supprimer mon compte",
      "Cette action est définitive. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => void deleteAccount(),
        },
      ]
    );
  }

  async function deleteAccount() {
    setDeleting(true);
    setError("");
    try {
      await api("/api/profile", {
        method: "DELETE",
        body: JSON.stringify({ confirm: "SUPPRIMER" }),
      });
      await logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setDeleting(false);
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
        <Button
          label="Réservations"
          variant="outline"
          onPress={() => router.push("/(tabs)/bookings")}
        />
        <Button label="Se déconnecter" variant="outline" onPress={logout} />
        <Card>
          <Muted>
            Suppression définitive : vos données personnelles seront
            anonymisées. Impossible s'il reste des réservations ou litiges
            ouverts.
          </Muted>
          <Button
            label="Supprimer mon compte"
            variant="outline"
            loading={deleting}
            onPress={confirmDeleteAccount}
          />
          <Button
            label="En savoir plus"
            variant="outline"
            onPress={() =>
              void Linking.openURL("https://rfacto.com/delete-account")
            }
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
