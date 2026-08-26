const stoppers = new Set<() => void>();

export function registerVoiceStopper(stop: () => void) {
  stoppers.add(stop);
  return () => {
    stoppers.delete(stop);
  };
}

export function stopAllVoicePlayback() {
  for (const stop of [...stoppers]) {
    try {
      stop();
    } catch {
      /* ignore */
    }
  }
}

export function formatVoiceSecs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function formatVoiceTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function waveformFromKey(key: string, count = 32) {
  let seed = 0;
  for (let i = 0; i < key.length; i++) {
    seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  }
  return Array.from({ length: count }, (_, i) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const wobble = 0.22 + ((seed % 1000) / 1000) * 0.78;
    return 0.28 + wobble * (0.35 + 0.65 * Math.abs(Math.sin(i * 0.55)));
  });
}

export function isVoiceMessage(url?: string | null, body?: string | null) {
  const text = (body || "").trim();
  if (text === "Note vocale" || text === "Voice note") return true;
  if (!url) return false;
  try {
    const hay = decodeURIComponent(url).toLowerCase();
    if (hay.includes("voice-note")) return true;
    return /\.(m4a|aac|mp3|ogg|oga|wav|amr|3gpp|weba)(\?|#|$)/i.test(hay);
  } catch {
    return /voice-note|\.(m4a|aac|mp3|ogg|oga|wav|amr|3gpp|weba)(\?|#|$)/i.test(url);
  }
}

export function voiceUploadMeta(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.includes(".webm") || lower.includes(".weba")) {
    return { name: `voice-note-${Date.now()}.webm`, type: "audio/webm" };
  }
  if (lower.includes(".mp3")) {
    return { name: `voice-note-${Date.now()}.mp3`, type: "audio/mpeg" };
  }
  if (lower.includes(".3gp")) {
    return { name: `voice-note-${Date.now()}.3gp`, type: "audio/3gpp" };
  }
  return { name: `voice-note-${Date.now()}.m4a`, type: "audio/mp4" };
}
