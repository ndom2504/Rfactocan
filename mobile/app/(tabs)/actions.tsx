import { type Href, useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";
import { Button, Card, Muted, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

export default function ActionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
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
            label="Boutiques"
            variant="outline"
            onPress={() => router.push("/(tabs)/shops")}
          />
          <Button
            label="Créer une boutique"
            variant="outline"
            onPress={() => router.push("/shops/new" as Href)}
          />
          <Button
            label="Mes projets"
            variant="outline"
            onPress={() => router.push("/projects" as Href)}
          />
          <Button
            label="Rencontre"
            variant="outline"
            onPress={() => router.push("/meet" as Href)}
          />
          <Button
            label="Héraut Réseau"
            variant="outline"
            onPress={() => router.push("/herald" as Href)}
          />
          {user?.role === "ADMIN" ? (
            <Button
              label={t("admin_open_cta")}
              variant="outline"
              onPress={() => router.push("/admin" as Href)}
            />
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}
