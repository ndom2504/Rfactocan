import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

export function TypingDots({ mine }: { mine?: boolean }) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 350);
    return () => clearInterval(id);
  }, []);

  const color = mine ? "rgba(255,255,255,0.85)" : colors.muted;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        height: 16,
      }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            opacity: tick % 3 === i ? 1 : 0.35,
          }}
        />
      ))}
    </View>
  );
}

export function TypingBubble() {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginTop: 4,
      }}
    >
      <TypingDots />
    </View>
  );
}
