import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button, Card, Muted, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const first = user?.displayName?.split(" ")[0] ?? "";

  return (
    <Screen>
      <ScrollView>
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.accent, fontWeight: "700" }}>
              {(first || "R").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Title>Bonjour {first}</Title>
        </Pressable>
        <Muted>
          Transporter, expédier ou publier un service — ou annoncer un événement
          dans le fil.
        </Muted>
        <Card>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.foreground }}>
            Publier
          </Text>
          <Button label="Transporter" onPress={() => router.push("/trip/new")} />
          <Button
            label="Expédier"
            variant="outline"
            onPress={() => router.push("/request/new")}
          />
          <Button
            label="Publier un service"
            variant="outline"
            onPress={() => router.push("/service/new")}
          />
          <Button
            label="Annoncer"
            onPress={() => router.push("/(tabs)/announce")}
          />
        </Card>
        <Button
          label="Réservations"
          variant="outline"
          onPress={() => router.push("/(tabs)/bookings")}
        />
      </ScrollView>
    </Screen>
  );
}
