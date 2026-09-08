import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { Image, Pressable, Text, View } from "react-native";
import { isImageAttachment, isPdfAttachment } from "@/lib/api";
import { colors } from "@/lib/theme";

export function AttachmentPreview({
  url,
  fileName,
  mine,
}: {
  url: string;
  fileName: string;
  mine?: boolean;
}) {
  const label = mine ? "#fff" : colors.foreground;
  const muted = mine ? "rgba(255,255,255,0.85)" : colors.muted;

  if (isImageAttachment(url)) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: 220, height: 160, borderRadius: 10 }}
        resizeMode="cover"
      />
    );
  }

  async function open() {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      /* ignore */
    }
  }

  if (isPdfAttachment(url)) {
    return (
      <Pressable onPress={() => void open()}>
        <View
          style={{
            width: 220,
            height: 160,
            borderRadius: 10,
            overflow: "hidden",
            backgroundColor: mine ? "rgba(255,255,255,0.16)" : "#fff",
            borderWidth: 1,
            borderColor: mine ? "rgba(255,255,255,0.25)" : colors.border,
          }}
        >
          <View
            style={{
              flex: 1,
              padding: 12,
              justifyContent: "space-between",
            }}
          >
            <Ionicons
              name="document-text"
              size={36}
              color={mine ? "#fff" : colors.accent}
            />
            <Text
              numberOfLines={3}
              style={{ color: label, fontSize: 13, fontWeight: "600" }}
            >
              {fileName}
            </Text>
            <Text style={{ color: muted, fontSize: 11 }}>PDF · Aperçu</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={() => void open()}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          width: 220,
          padding: 10,
          borderRadius: 8,
          backgroundColor: mine ? "rgba(255,255,255,0.15)" : colors.surface,
        }}
      >
        <Ionicons
          name="document"
          size={22}
          color={mine ? "#fff" : colors.accent}
        />
        <Text style={{ color: label, fontSize: 13, flex: 1 }} numberOfLines={2}>
          {fileName}
        </Text>
      </View>
    </Pressable>
  );
}
