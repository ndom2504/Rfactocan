import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, colors as lightColors } from "@/lib/theme";
import { useOptionalTheme } from "@/lib/theme-context";

function useColors() {
  return useOptionalTheme()?.colors ?? lightColors;
}

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.title, { color: colors.foreground }]}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.muted, { color: colors.muted }]}>{children}</Text>;
}

export function Card({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  tone = "light",
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  tone?: "light" | "dark";
  disabled?: boolean;
  loading?: boolean;
}) {
  const outlineOnDark = variant === "outline" && tone === "dark";
  const theme = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.accent },
        variant === "outline" && [
          styles.buttonOutline,
          { borderColor: theme.border, backgroundColor: "transparent" },
        ],
        outlineOnDark && styles.buttonOutlineOnDark,
        variant === "danger" && { backgroundColor: theme.danger },
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            outlineOnDark
              ? theme.white
              : variant === "outline"
                ? theme.accent
                : theme.white
          }
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "outline" && { color: theme.foreground },
            outlineOnDark && styles.buttonTextOutlineOnDark,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  secureTextEntry,
  style,
  labelStyle,
  ...props
}: { label: string; labelStyle?: Text["props"]["style"] } & TextInputProps) {
  const [visible, setVisible] = React.useState(false);
  const isPassword = secureTextEntry === true;
  const colors = useColors();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }, labelStyle]}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.foreground,
            },
            isPassword && styles.inputWithToggle,
            style,
          ]}
          secureTextEntry={isPassword && !visible}
          {...props}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            style={styles.eyeBtn}
            accessibilityLabel={visible ? "Masquer" : "Afficher"}
          >
            <Text style={[styles.eyeText, { color: colors.accent }]}>
              {visible ? "Masquer" : "Voir"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const colors = useColors();
  if (!children) return null;
  return <Text style={[styles.error, { color: colors.danger }]}>{children}</Text>;
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 8,
    width: "100%",
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonOutlineOnDark: {
    borderColor: "rgba(255,255,255,0.85)",
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  buttonTextOutline: {
    color: colors.foreground,
  },
  buttonTextOutlineOnDark: {
    color: colors.white,
  },
  field: {
    marginBottom: 12,
    width: "100%",
    alignSelf: "stretch",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: colors.foreground,
    includeFontPadding: false,
  },
  inputRow: {
    position: "relative",
    justifyContent: "center",
    width: "100%",
    alignSelf: "stretch",
  },
  inputWithToggle: {
    paddingRight: 72,
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  eyeText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
    marginTop: 8,
    marginBottom: 4,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
});
