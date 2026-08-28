import { Pressable, Text, View } from "react-native";
import { useI18n, type Locale } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: selected ? colors.accent : "transparent",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          color: selected ? colors.white : colors.accent,
          fontSize: 11,
          fontWeight: selected ? "700" : "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  function select(next: Locale) {
    if (next !== locale) setLocale(next);
  }
  return (
    <View
      style={{
        flexDirection: "row",
        borderWidth: 1,
        borderColor: colors.accent + "59",
        borderRadius: 8,
        padding: 2,
      }}
    >
      <Chip label="FR" selected={locale === "fr"} onPress={() => select("fr")} />
      <Chip label="EN" selected={locale === "en"} onPress={() => select("en")} />
    </View>
  );
}
