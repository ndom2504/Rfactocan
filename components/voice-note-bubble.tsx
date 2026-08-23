"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { guessVoiceNoteMime } from "@/lib/community";
import { stopAllVoicePlayback } from "@/lib/voice-audio";
import { cn } from "@/lib/utils";

function barsFromKey(key: string, count = 32) {
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }, (_, i) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const wobble = 0.22 + ((seed % 1000) / 1000) * 0.78;
    return 0.28 + wobble * (0.35 + 0.65 * Math.abs(Math.sin(i * 0.55)));
  });
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  url: string;
  mine?: boolean;
};

export function VoiceNoteBubble({ url, mine = false }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bars = useMemo(() => barsFromKey(url), [url]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncDuration = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    };
    const onTime = () => {
      const d = audio.duration;
      const dur = Number.isFinite(d) && d > 0 ? d : duration;
      setCurrent(audio.currentTime || 0);
      setProgress(dur > 0 ? audio.currentTime / dur : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onErr = () => setError("Lecture impossible");
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("canplay", syncDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onErr);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("canplay", syncDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onErr);
    };
  }, [duration, url]);

  async function blobSrc() {
    if (objectUrlRef.current) return objectUrlRef.current;
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("load");
    const header = res.headers.get("content-type");
    const type = guessVoiceNoteMime(url, header);
    const blob = new Blob([await res.arrayBuffer()], { type });
    objectUrlRef.current = URL.createObjectURL(blob);
    return objectUrlRef.current;
  }

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setError("");
    setBusy(true);
    try {
      stopAllVoicePlayback(audio);
      try {
        await audio.play();
      } catch {
        audio.src = await blobSrc();
        audio.load();
        await audio.play();
      }
    } catch {
      setPlaying(false);
      setError("Lecture impossible");
    } finally {
      setBusy(false);
    }
  }

  function seek(index: number) {
    const audio = audioRef.current;
    const dur = duration || audio?.duration || 0;
    if (!audio || !Number.isFinite(dur) || dur <= 0) return;
    audio.currentTime = (index / bars.length) * dur;
  }

  const played = mine ? "bg-white" : "bg-[var(--accent)]";
  const rest = mine ? "bg-white/35" : "bg-[var(--foreground)]/25";

  return (
    <div
      className="flex w-[230px] flex-col gap-1 py-0.5"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <audio
          ref={audioRef}
          src={url}
          preload="auto"
          playsInline
          data-rfacto-voice
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggle();
          }}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            mine ? "bg-white/20 text-white" : "bg-[var(--accent)] text-white"
          )}
          aria-label={playing ? "Pause" : "Lecture"}
          disabled={busy}
        >
          {busy ? (
            <span className="text-xs">…</span>
          ) : playing ? (
            <span className="text-lg leading-none">❚❚</span>
          ) : (
            <span className="pl-0.5 text-lg leading-none">▶</span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex h-7 items-end gap-px">
            {bars.map((h, i) => (
              <button
                key={i}
                type="button"
                className={cn(
                  "w-[3px] min-h-[4px] rounded-full",
                  i / bars.length <= progress ? played : rest
                )}
                style={{ height: `${Math.round(h * 100)}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  seek(i);
                }}
                aria-hidden
              />
            ))}
          </div>
          <p className={cn("mt-0.5 text-[11px]", mine ? "text-white/80" : "text-[var(--muted)]")}>
            {formatTime(playing || progress > 0 ? current : duration)}
          </p>
        </div>
      </div>
      {error ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "text-[11px] underline",
            mine ? "text-white/90" : "text-[var(--accent)]"
          )}
        >
          Ouvrir l’audio
        </a>
      ) : null}
    </div>
  );
}
