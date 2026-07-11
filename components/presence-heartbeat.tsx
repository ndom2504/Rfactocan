"use client";

import { useEffect } from "react";

/** Keeps the session user marked online while the app is open. */
export function PresenceHeartbeat() {
  useEffect(() => {
    let cancelled = false;

    async function beat() {
      if (cancelled || document.visibilityState === "hidden") return;
      try {
        await fetch("/api/presence", { method: "POST" });
      } catch {
        /* ignore network blips */
      }
    }

    void beat();
    const interval = setInterval(() => void beat(), 45_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void beat();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
