import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import {
  formatVoiceSecs,
  stopAllVoicePlayback,
  voiceUploadMeta,
} from "@/lib/voice";

const MAX_MS = 120_000;

export type VoicePickedFile = { uri: string; name: string; type: string };

export function useVoiceNote({
  sending,
  onRecorded,
}: {
  sending?: boolean;
  onRecorded: (file: VoicePickedFile) => Promise<void>;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState("");
  const startedAt = useRef(0);
  const activeRef = useRef(false);
  const stopRef = useRef<(keep: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    if (!recording) return;
    const tick = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsedMs(ms);
      if (ms >= MAX_MS) void stopRef.current(true);
    }, 250);
    return () => clearInterval(tick);
  }, [recording]);

  useEffect(() => {
    return () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      void recorder.stop().catch(() => {});
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
      activeRef.current = true;
      setElapsedMs(0);
      setRecording(true);
    } catch {
      setError("Enregistrement impossible.");
    }
  }

  async function stop(keep: boolean) {
    if (!activeRef.current && !recording) return;
    activeRef.current = false;
    let uri: string | null = null;
    try {
      await recorder.stop();
      uri = recorder.uri;
    } catch {
      /* already stopped or released */
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
    const durationMs = elapsedMs || Date.now() - startedAt.current;
    if (!keep || !uri || durationMs < 400) {
      setPreviewUri(null);
      return;
    }
    setPreviewUri(uri);
  }
  stopRef.current = stop;

  async function sendPreview() {
    if (!previewUri || sending) return;
    setError("");
    try {
      await onRecorded({ uri: previewUri, ...voiceUploadMeta(previewUri) });
      setPreviewUri(null);
    } catch {
      setError("Impossible d’envoyer la note vocale.");
    }
  }

  function discardPreview() {
    setPreviewUri(null);
    setError("");
  }

  return {
    recording,
    previewUri,
    elapsedMs: elapsedMs || (recording ? Date.now() - startedAt.current : 0),
    error,
    start,
    stop,
    sendPreview,
    discardPreview,
    formatElapsed: () =>
      formatVoiceSecs(elapsedMs || Date.now() - startedAt.current),
  };
}
