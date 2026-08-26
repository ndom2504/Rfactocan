import { useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";
import { Button, Card, Muted, Screen, Title } from "@/components/ui";

export default function ActionsScreen() {
  const router = useRouter();
  return (
    <Screen>
      <ScrollView>
        <Title>Actions</Title>
        <Muted>Services, livraisons, demandes et réservations.</Muted>
        <Card>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>Hub</Text>
          <Button label="Services" onPress={() => router.push("/services")} />
          <Button
            label="Voyages / livraisons"
            variant="outline"
            onPress={() => router.push("/(tabs)/trips")}
          />
          <Button
            label="Demandes"
            variant="outline"
            onPress={() => router.push("/(tabs)/requests")}
          />
          <Button
            label="Réservations"
            variant="outline"
            onPress={() => router.push("/(tabs)/bookings")}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
