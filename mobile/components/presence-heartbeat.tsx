import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/** Marks the signed-in user as online while the app is in the foreground. */
export function PresenceHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function beat() {
      if (cancelled || AppState.currentState !== "active") return;
      try {
        await api("/api/presence", { method: "POST" });
      } catch {
        /* ignore network blips */
      }
    }

    void beat();
    const interval = setInterval(() => void beat(), 45_000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void beat();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [user]);

  return null;
}
