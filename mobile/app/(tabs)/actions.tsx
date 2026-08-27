import { useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";
import { Button, Card, Muted, Screen, Title } from "@/components/ui";

export default function ActionsScreen() {
  const router = useRouter();
  return (
    <Screen>
      <ScrollView>
        <Title>Publier</Title>
        <Muted>
          Transporter un colis, expédier un besoin, ou publier un service.
        </Muted>
        <Card>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>Publier</Text>
          <Button
            label="Transporter"
            onPress={() => router.push("/trip/new")}
          />
          <Button
            label="Expédier"
            variant="outline"
            onPress={() => router.push("/request/new")}
          />
          <Button
            label="Publier"
            variant="outline"
            onPress={() => router.push("/services")}
          />
        </Card>
        <Card>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>Commander</Text>
          <Muted>
            Parcourez le fil et contactez un voyageur ou un prestataire.
          </Muted>
          <Button
            label="Commander"
            onPress={() => router.push("/(tabs)/community")}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
