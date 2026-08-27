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
          Colis et services — publiez un trajet, un besoin d’expédition ou un
          service, puis commandez depuis le fil.
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
            onPress={() => router.push("/services")}
          />
        </Card>
        <Card>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.foreground }}>
            Commander
          </Text>
          <Button
            label="Parcourir la communauté"
            onPress={() => router.push("/(tabs)/community")}
          />
          <Button
            label="Messages"
            variant="outline"
            onPress={() => router.push("/(tabs)/messages")}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
