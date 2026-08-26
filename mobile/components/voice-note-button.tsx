import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { VoiceNoteBubble } from "@/components/voice-note-bubble";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme";
import {
  formatVoiceSecs,
  stopAllVoicePlayback,
  voiceUploadMeta,
} from "@/lib/voice";

const MAX_MS = 120_000;

type PickedFile = { uri: string; name: string; type: string };

export function VoiceNoteButton({
  disabled,
  sending,
  onRecorded,
}: {
  disabled?: boolean;
  sending?: boolean;
  onRecorded: (file: PickedFile) => Promise<void>;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState("");
  const startedAt = useRef(0);
  const stopRef = useRef<(keep: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    if (!recording) return;
    if (recState.durationMillis >= MAX_MS) void stopRef.current(true);
  }, [recording, recState.durationMillis]);

  useEffect(() => {
    return () => {
      if (recorder.isRecording) {
        void recorder.stop();
      }
    };
  }, [recorder]);

  async function start() {
    setError("");
    stopAllVoicePlayback();
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError("Autorisez le micro pour enregistrer une note vocale.");
      return;
    }
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      stopAllVoicePlayback();
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setRecording(true);
    } catch {
      setError("Enregistrement impossible.");
    }
  }

  async function stop(keep: boolean) {
    if (!recording && !recorder.isRecording) return;
    try {
      await recorder.stop();
    } catch {
      /* already stopped */
    }
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
    } catch {
      /* ignore */
    }
    setRecording(false);
    const uri = recorder.uri;
    const durationMs = recState.durationMillis || Date.now() - startedAt.current;
    if (!keep || !uri || durationMs < 400) {
      setPreviewUri(null);
      return;
    }
    setPreviewUri(uri);
  }
  stopRef.current = stop;

  async function sendPreview() {
    if (!previewUri) return;
    setError("");
    try {
      await onRecorded({ uri: previewUri, ...voiceUploadMeta(previewUri) });
      setPreviewUri(null);
    } catch {
      setError("Impossible d’envoyer la note vocale.");
    }
  }

  if (recording) {
    return (
      <View style={{ gap: 6, marginBottom: 4 }}>
        <Text style={{ color: "#b91c1c", fontWeight: "700" }}>
          ● {formatVoiceSecs(recState.durationMillis || Date.now() - startedAt.current)}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label="Annuler" variant="outline" onPress={() => void stop(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Arrêter" onPress={() => void stop(true)} />
          </View>
        </View>
      </View>
    );
  }

  if (previewUri) {
    return (
      <View style={{ gap: 6, marginBottom: 4 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Écouter avant d’envoyer</Text>
        <VoiceNoteBubble url={previewUri} />
        {error ? (
          <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Annuler"
              variant="outline"
              onPress={() => setPreviewUri(null)}
              disabled={sending}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Envoyer la note"
              onPress={() => void sendPreview()}
              loading={sending}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Button
        label="🎤 Note vocale"
        variant="outline"
        onPress={() => void start()}
        disabled={disabled || sending}
      />
      {error ? (
        <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}
