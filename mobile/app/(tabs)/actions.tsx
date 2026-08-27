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
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>Annoncer</Text>
          <Muted>
            Publiez une annonce, un événement ou un communiqué dans le fil
            Communauté.
          </Muted>
          <Button
            label="Annoncer"
            onPress={() => router.push("/(tabs)/community?annoncer=1")}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
