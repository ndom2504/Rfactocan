import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, TextInput, View } from "react-native";
import type { ComponentProps } from "react";
import { VoiceNoteBubble } from "@/components/voice-note-bubble";
import { useVoiceNote, type VoicePickedFile } from "@/components/voice-note-button";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

function IconBtn({
  name,
  onPress,
  disabled,
  color,
  label,
}: {
  name: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  disabled?: boolean;
  color: string;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={6}
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Ionicons name={name} size={22} color={color} />
    </Pressable>
  );
}

export function ChatComposer({
  draft,
  onDraftChange,
  sending,
  onSend,
  onAttach,
  onRecorded,
}: {
  draft: string;
  onDraftChange: (next: string) => void;
  sending: boolean;
  onSend: () => void;
  onAttach: () => void;
  onRecorded: (file: VoicePickedFile) => Promise<void>;
}) {
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const voice = useVoiceNote({ sending, onRecorded });
  const locked = sending || voice.recording || Boolean(voice.previewUri);
  const canSend = !locked && draft.trim().length > 0;

  return (
    <View>
      {voice.recording ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: "#b91c1c", fontWeight: "700", flex: 1 }}>
            ● {voice.formatElapsed()}
          </Text>
          <Pressable onPress={() => void voice.stop(false)} hitSlop={8}>
            <Text style={{ color: colors.accent, fontWeight: "600" }}>{t("cancel")}</Text>
          </Pressable>
          <IconBtn
            name="stop-circle"
            label={t("voice_stop")}
            color={colors.accent}
            onPress={() => void voice.stop(true)}
          />
        </View>
      ) : null}

      {voice.previewUri ? (
        <View style={{ paddingVertical: 6, gap: 4 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{t("voice_preview")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ flex: 1 }}>
              <VoiceNoteBubble url={voice.previewUri} />
            </View>
            <Pressable
              onPress={voice.discardPreview}
              disabled={sending}
              hitSlop={8}
              style={{ paddingHorizontal: 8 }}
            >
              <Text style={{ color: colors.accent, fontWeight: "600" }}>{t("cancel")}</Text>
            </Pressable>
            <Pressable
              onPress={() => void voice.sendPreview()}
              disabled={sending}
              style={{
                backgroundColor: colors.accent,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                opacity: sending ? 0.5 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                {sending ? t("loading") : t("voice_send")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {voice.error ? (
        <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 4 }}>
          {voice.error}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 2,
          paddingVertical: 6,
        }}
      >
        <IconBtn
          name="attach"
          label={t("attach_file")}
          color={colors.accent}
          disabled={locked}
          onPress={onAttach}
        />
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          placeholder={t("type_message")}
          placeholderTextColor={colors.muted}
          editable={!locked}
          multiline
          maxLength={4000}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 110,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            color: colors.foreground,
          }}
        />
        <IconBtn
          name="mic"
          label={t("voice_record")}
          color={colors.accent}
          disabled={locked}
          onPress={() => void voice.start()}
        />
        <IconBtn
          name="send"
          label={t("send")}
          color={colors.accent}
          disabled={!canSend}
          onPress={onSend}
        />
      </View>
    </View>
  );
}
