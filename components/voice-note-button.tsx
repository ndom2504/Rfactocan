"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";

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
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);

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
    };
  }, []);

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t("voice_unavailable"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  function stop(send: boolean) {
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
      if (!send) {
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
      setBusy(true);
      void onRecorded(file)
        .catch(() => setError(t("voice_failed")))
        .finally(() => setBusy(false));
    };
    rec.stop();
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
          {t("voice_send")}
        </Button>
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
