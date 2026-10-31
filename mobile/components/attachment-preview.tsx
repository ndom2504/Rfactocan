import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image, Pressable, Text, View } from "react-native";
import {
  isImageAttachment,
  isPdfAttachment,
  isVideoAttachment,
} from "@/lib/api";
import { colors } from "@/lib/theme";

function VideoThumb({
  url,
  mine,
}: {
  url: string;
  mine?: boolean;
}) {
  const player = useVideoPlayer({ uri: url }, (p) => {
    p.loop = false;
    p.muted = true;
    p.pause();
  });

  return (
    <Pressable
      onPress={() => void WebBrowser.openBrowserAsync(url)}
      style={{
        width: 220,
        height: 160,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#0B1F0A",
      }}
    >
      <VideoView
        player={player}
        style={{ width: 220, height: 160 }}
        contentFit="cover"
        nativeControls={false}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.2)",
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 2 }} />
        </View>
      </View>
      <Text
        style={{
          position: "absolute",
          left: 8,
          bottom: 8,
          color: mine ? "#fff" : "#fff",
          fontSize: 11,
          fontWeight: "700",
          textShadowColor: "rgba(0,0,0,0.6)",
          textShadowRadius: 4,
        }}
      >
        Vidéo
      </Text>
    </Pressable>
  );
}

export function AttachmentPreview({
  url,
  fileName,
  mine,
  body,
}: {
  url: string;
  fileName: string;
  mine?: boolean;
  body?: string | null;
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
              {fileName.includes(".") ? fileName : "document.pdf"}
            </Text>
            <Text style={{ color: muted, fontSize: 11 }}>PDF · Aperçu</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // WhatsApp-style: anything that is not image/PDF → video thumbnail
  if (
    isVideoAttachment(url, body) ||
    !fileName.includes(".") ||
    fileName.length > 40
  ) {
    return <VideoThumb url={url} mine={mine} />;
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
          {fileName.includes(".") ? fileName : "Fichier"}
        </Text>
      </View>
    </Pressable>
  );
}
