import { useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getApiUrl } from "@/lib/api";
import { colors } from "@/lib/theme";

const WHATSAPP =
  process.env.EXPO_PUBLIC_WHATSAPP_COMMUNITY_URL?.trim() ||
  "https://chat.whatsapp.com/Efxd71iuEcgEK8lpu38DR8";

const BANNER = `${getApiUrl()}/images/home/slide-communaute.png`;

const ABOUT = [
  {
    title: "Message de bienvenue",
    text: "Bienvenue chez Rfacto (RapidFacto). Nous connectons voyageurs, prestataires de services et clients pour faciliter les envois, les prestations et la mise en lumière des talents — près de chez vous et à travers le monde. Chaque membre est un Héraut Réseau : acteur de proximité qui anime sa communauté, crée des connexions et peut recevoir des missions pour développer le réseau.",
  },
  {
    title: "Notre vision",
    text: "Promouvoir l’usage des services en ligne et des outils numériques ; rapprocher les gens ; créer un écosystème qui met en évidence des services et activités ; favoriser l’autonomie et redonner de l’espoir à ceux qui ont des talents non exploités.",
  },
  {
    title: "Nos objectifs",
    text: "Établir Rfacto corridor après corridor : 12+ pays actifs, 10 000 inscrits la première année, 500 Hérauts Réseau, et un groupe WhatsApp officiel par pays.",
  },
  {
    title: "Nos valeurs",
    text: "Confiance et transparence · Entraide et inclusion · Autonomie et dignité du travail · Responsabilité partagée · Innovation au service du réel.",
  },
];

export function WelcomeHome() {
  const router = useRouter();
  const [about, setAbout] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.accent }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        bounces={false}
      >
        <Pressable
          onPress={() => void Linking.openURL(WHATSAPP)}
          accessibilityRole="link"
          accessibilityLabel="Rejoindre la communauté WhatsApp"
        >
          <Image
            source={{ uri: BANNER }}
            style={{ width: "100%", aspectRatio: 1024 / 576, backgroundColor: colors.accent }}
            resizeMode="cover"
          />
        </Pressable>

        <View style={{ paddingHorizontal: 28, paddingTop: 28, alignItems: "center" }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              letterSpacing: 2,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            RapidFacto
          </Text>
          <Text
            style={{
              color: "#fff",
              fontSize: 52,
              fontWeight: "700",
              lineHeight: 56,
              marginTop: 8,
            }}
          >
            Rfacto
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.92)",
              fontSize: 17,
              lineHeight: 24,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            Voyageurs, services et clients — connectés en un seul réseau.
          </Text>

          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={{
              marginTop: 36,
              height: 56,
              width: "100%",
              backgroundColor: "#fff",
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 16 }}>
              Commencer ici
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAbout(true)}
            style={{
              marginTop: 14,
              width: "100%",
              paddingVertical: 14,
              borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.35)",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              Qui sommes-nous
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={about} animationType="slide" onRequestClose={() => setAbout(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: colors.foreground,
              paddingHorizontal: 20,
              marginBottom: 12,
            }}
          >
            Qui sommes-nous
          </Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            {ABOUT.map((section) => (
              <View key={section.title} style={{ marginBottom: 16 }}>
                <Text style={{ fontWeight: "700", fontSize: 15, color: colors.foreground }}>
                  {section.title}
                </Text>
                <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 21, color: colors.muted }}>
                  {section.text}
                </Text>
              </View>
            ))}
            <Pressable
              onPress={() => void Linking.openURL(`${getApiUrl()}/trust`)}
              style={{
                marginTop: 8,
                paddingVertical: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.accent, fontWeight: "600" }}>
                Voir le programme de confiance
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setAbout(false)}
              style={{
                marginTop: 16,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>Fermer</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
