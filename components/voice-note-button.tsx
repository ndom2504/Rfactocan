"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";
import { stopAllVoicePlayback } from "@/lib/voice-audio";

const MAX_MS = 120_000;

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

function formatSecs(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

type Props = {
  disabled?: boolean;
  onRecorded: (file: File) => Promise<void>;
};

export function VoiceNoteButton({ disabled, onRecorded }: Props) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null
  );
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);

  function clearPreview() {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      if (ms >= MAX_MS) stop(true);
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  useEffect(() => {
    return () => {
      recRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (preview) URL.revokeObjectURL(preview.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError("");
    clearPreview();
    stopAllVoicePlayback();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t("voice_unavailable"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stopAllVoicePlayback();
      streamRef.current = stream;
      const mime = pickMime();
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recRef.current = rec;
      startedAt.current = Date.now();
      setElapsed(0);
      rec.start();
      setRecording(true);
    } catch {
      setError(t("voice_denied"));
    }
  }

  function stop(keep: boolean) {
    const rec = recRef.current;
    if (!rec || rec.state === "inactive") {
      setRecording(false);
      return;
    }
    rec.onstop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recRef.current = null;
      setRecording(false);
      if (!keep) {
        chunksRef.current = [];
        return;
      }
      const type = rec.mimeType || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : "webm";
      const blob = new Blob(chunksRef.current, { type: type.split(";")[0] });
      chunksRef.current = [];
      if (blob.size < 800) return;
      const file = new File([blob], `voice-note.${ext}`, {
        type: blob.type || "audio/webm",
      });
      setPreview({ file, url: URL.createObjectURL(file) });
    };
    rec.stop();
  }

  async function sendPreview() {
    if (!preview || busy) return;
    setBusy(true);
    setError("");
    try {
      await onRecorded(preview.file);
      clearPreview();
    } catch {
      setError(t("voice_failed"));
    } finally {
      setBusy(false);
    }
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-red-600">
          ● {formatSecs(elapsed)}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => stop(false)}
        >
          {t("cancel")}
        </Button>
        <Button type="button" size="sm" onClick={() => stop(true)}>
          {t("voice_stop")}
        </Button>
      </div>
    );
  }

  if (preview) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[11px] text-[var(--muted)]">{t("voice_preview")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <audio
            src={preview.url}
            controls
            preload="metadata"
            data-rfacto-voice
            className="h-9 max-w-[220px] flex-1"
            onPlay={(e) => stopAllVoicePlayback(e.currentTarget)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              clearPreview();
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void sendPreview()}
          >
            {busy ? t("loading") : t("voice_send")}
          </Button>
        </div>
        {error ? (
          <p className="max-w-[16rem] text-[10px] text-red-600">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        title={t("voice_record")}
        disabled={disabled || busy}
        onClick={() => void start()}
        aria-label={t("voice_record")}
        className="shrink-0"
      >
        {busy ? "…" : "🎤"}
      </Button>
      {error ? (
        <p className="max-w-[10rem] text-[10px] text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
