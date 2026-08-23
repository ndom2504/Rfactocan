"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const bars = useMemo(() => barsFromKey(url), [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const d = audio.duration || duration;
      setProgress(d > 0 ? audio.currentTime / d : 0);
    };
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [duration]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  function seek(index: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = (index / bars.length) * duration;
  }

  const played = mine ? "bg-white" : "bg-[var(--accent)]";
  const rest = mine ? "bg-white/35" : "bg-[var(--foreground)]/25";

  return (
    <div className="flex w-[230px] items-center gap-2 py-0.5">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={() => void toggle()}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          mine ? "bg-white/20 text-white" : "bg-[var(--accent)] text-white"
        )}
        aria-label={playing ? "Pause" : "Lecture"}
      >
        {playing ? (
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
              onClick={() => seek(i)}
              aria-hidden
            />
          ))}
        </div>
        <p className={cn("mt-0.5 text-[11px]", mine ? "text-white/80" : "text-[var(--muted)]")}>
          {formatTime(playing || progress > 0 ? (audioRef.current?.currentTime ?? 0) : duration)}
        </p>
      </div>
    </div>
  );
}
