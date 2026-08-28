import { Image, View } from "react-native";
import { mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

const DEFAULT_FR = "/images/home/slide-communaute.png";
const DEFAULT_EN = "/images/home/slide-communaute-en.png";

export function CoverBanner({ customUrl }: { customUrl?: string | null }) {
  const { locale } = useI18n();
  const custom = Boolean(customUrl?.trim());
  const src = mediaUrl(
    custom ? customUrl! : locale === "en" ? DEFAULT_EN : DEFAULT_FR
  );

  return (
    <View
      style={{
        width: "100%",
        height: custom ? 140 : 168,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors.greenDark,
      }}
    >
      <Image
        source={{ uri: src }}
        style={{ width: "100%", height: "100%" }}
        resizeMode={custom ? "cover" : "cover"}
      />
    </View>
  );
}
