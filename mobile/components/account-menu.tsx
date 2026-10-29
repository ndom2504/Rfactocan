import { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type Props = {
  size?: number;
  children?: React.ReactNode;
};

export function AccountMenu({ size = 56, children }: Props) {
  const { user, savedAccounts, switchAccount, addAccount, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [open, setOpen] = useState(false);
  const avatar = user?.avatarUrl ? mediaUrl(user.avatarUrl) : "";
  const initial = (user?.displayName || "R").slice(0, 1).toUpperCase();

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityLabel={t("account_switch")}>
        {children ??
          (avatar ? (
            <Image
              source={{ uri: avatar }}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.accentSoft,
              }}
            />
          ) : (
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontWeight: "700",
                  fontSize: size * 0.38,
                }}
              >
                {initial}
              </Text>
            </View>
          ))}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {savedAccounts.map((acc) => {
              const current = acc.id === user?.id;
              const src = acc.avatarUrl ? mediaUrl(acc.avatarUrl) : "";
              return (
                <Pressable
                  key={acc.id}
                  disabled={current}
                  onPress={() => {
                    setOpen(false);
                    void switchAccount(acc.id);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    opacity: current ? 0.7 : 1,
                  }}
                >
                  {src ? (
                    <Image
                      source={{ uri: src }}
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontWeight: "700", color: colors.foreground }}>
                        {acc.displayName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={{ color: colors.foreground, fontWeight: current ? "700" : "500", flex: 1 }}>
                    {current ? `${acc.displayName} ✓` : acc.displayName}
                  </Text>
                </Pressable>
              );
            })}
            {savedAccounts.length < 2 ? (
              <Pressable
                onPress={() => {
                  setOpen(false);
                  void addAccount().then(() => router.push("/(auth)/login"));
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 12 }}
              >
                <Text style={{ color: colors.foreground }}>{t("account_add")}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                setOpen(false);
                router.push("/profile");
              }}
              style={{ paddingHorizontal: 16, paddingVertical: 12 }}
            >
              <Text style={{ color: colors.foreground }}>{t("nav_profile")}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setOpen(false);
                router.push("/settings");
              }}
              style={{ paddingHorizontal: 16, paddingVertical: 12 }}
            >
              <Text style={{ color: colors.foreground }}>{t("nav_settings")}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setOpen(false);
                void logout();
              }}
              style={{ paddingHorizontal: 16, paddingVertical: 12 }}
            >
              <Text style={{ color: "#b91c1c" }}>{t("logout")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
