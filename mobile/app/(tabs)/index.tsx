import { useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { Button, Card, Muted, Screen, Title } from "@/components/ui";
import { getApiUrl } from "@/lib/api";

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <ScrollView>
        <Title>Bonjour {user?.displayName?.split(" ")[0] ?? ""}</Title>
        <Muted>
          Mettez en relation voyageurs et expéditeurs pour vos colis
          internationaux.
        </Muted>
        <Card>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>
            Actions rapides
          </Text>
          <Button
            label="Publier un voyage"
            onPress={() => router.push("/trip/new")}
          />
          <Button
            label="Créer une demande"
            variant="outline"
            onPress={() => router.push("/request/new")}
          />
        </Card>
        <Card>
          <Text style={{ fontWeight: "700" }}>API</Text>
          <Muted>{getApiUrl()}</Muted>
          <Muted>Devise préférée : {user?.preferredCurrency ?? "CAD"}</Muted>
        </Card>
      </ScrollView>
    </Screen>
  );
}
