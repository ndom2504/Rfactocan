import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { DM_REACTION_EMOJIS, type ReactionSummary } from "@/lib/dm-reactions";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

function IconBtn({
  name,
  onPress,
  color,
  label,
}: {
  name: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  color: string;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={4}
      style={{
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
      }}
    >
      <Ionicons name={name} size={18} color={color} />
    </Pressable>
  );
}

export function DmReactionPicker({
  onPick,
  onShare,
  onForward,
  onDelete,
  alignEnd,
}: {
  onPick: (emoji: string) => void;
  onShare: () => void;
  onForward: () => void;
  onDelete?: () => void;
  alignEnd?: boolean;
}) {
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <View
      style={{
        alignSelf: alignEnd ? "flex-end" : "flex-start",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: 24,
        paddingHorizontal: 4,
        paddingVertical: 4,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {DM_REACTION_EMOJIS.map((emoji) => (
        <Pressable
          key={emoji}
          onPress={() => onPick(emoji)}
          accessibilityLabel={emoji}
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 18,
          }}
        >
          <Text style={{ fontSize: 22, lineHeight: 26 }}>{emoji}</Text>
        </Pressable>
      ))}
      <View
        style={{
          width: 1,
          height: 20,
          backgroundColor: colors.border,
          marginHorizontal: 2,
        }}
      />
      <IconBtn
        name="share-outline"
        onPress={onShare}
        color={colors.accent}
        label={t("dm_share")}
      />
      <IconBtn
        name="arrow-redo-outline"
        onPress={onForward}
        color={colors.accent}
        label={t("dm_forward")}
      />
      {onDelete ? (
        <IconBtn
          name="trash-outline"
          onPress={onDelete}
          color={colors.danger}
          label={t("dm_delete_file")}
        />
      ) : null}
    </View>
  );
}

export function DmReactionChips({
  reactions,
  onToggle,
  mine,
}: {
  reactions: ReactionSummary[];
  onToggle: (emoji: string) => void;
  mine?: boolean;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  if (!reactions.length) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 4,
        alignSelf: mine ? "flex-end" : "flex-start",
        paddingHorizontal: 4,
      }}
    >
      {reactions.map((reaction) => (
        <Pressable
          key={reaction.emoji}
          onPress={() => onToggle(reaction.emoji)}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 12,
            backgroundColor: reaction.mine ? colors.accentSoft : colors.surface,
            borderWidth: 1,
            borderColor: reaction.mine ? colors.accent : colors.border,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.foreground }}>
            {reaction.count > 1
              ? `${reaction.emoji} ${reaction.count}`
              : reaction.emoji}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
