import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

export function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: selected ? colors.accent : colors.surface2,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: selected ? colors.white : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
      {children}
    </View>
  );
}
