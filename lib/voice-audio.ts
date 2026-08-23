const VOICE_EVENT = "rfacto:stop-voice-playback";

/** Pause every in-app voice note so a new recording cannot capture speaker audio. */
export function stopAllVoicePlayback(except?: HTMLMediaElement | null) {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLMediaElement>("audio[data-rfacto-voice]")
    .forEach((el) => {
      if (el === except) return;
      try {
        el.pause();
      } catch {
        /* ignore */
      }
    });
  window.dispatchEvent(new Event(VOICE_EVENT));
}

export function onStopVoicePlayback(handler: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(VOICE_EVENT, handler);
  return () => window.removeEventListener(VOICE_EVENT, handler);
}
