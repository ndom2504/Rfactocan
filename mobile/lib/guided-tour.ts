import * as SecureStore from "expo-secure-store";
import type { Href } from "expo-router";
import type { DictKey } from "@/lib/i18n";

export const TOUR_STORAGE_KEY = "rfacto_tour_v1_done";

export type TourStep = {
  id: string;
  href: Href;
  titleKey: DictKey;
  bodyKey: DictKey;
};

/** Visite guidée alignée sur les onglets Expo (accueil → réservations → messages → profil). */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    href: "/(tabs)" as Href,
    titleKey: "tour_welcome_title",
    bodyKey: "tour_welcome_body",
  },
  {
    id: "publish-ctas",
    href: "/(tabs)" as Href,
    titleKey: "tour_ctas_title",
    bodyKey: "tour_ctas_body",
  },
  {
    id: "search",
    href: "/(tabs)" as Href,
    titleKey: "tour_search_title",
    bodyKey: "tour_search_body",
  },
  {
    id: "stats",
    href: "/(tabs)" as Href,
    titleKey: "tour_stats_title",
    bodyKey: "tour_stats_body",
  },
  {
    id: "activity",
    href: "/(tabs)" as Href,
    titleKey: "tour_activity_title",
    bodyKey: "tour_activity_body",
  },
  {
    id: "nav",
    href: "/(tabs)" as Href,
    titleKey: "tour_nav_title",
    bodyKey: "tour_nav_body",
  },
  {
    id: "bookings",
    href: "/(tabs)/bookings" as Href,
    titleKey: "tour_bookings_title",
    bodyKey: "tour_bookings_body",
  },
  {
    id: "messages",
    href: "/(tabs)/messages" as Href,
    titleKey: "tour_messages_title",
    bodyKey: "tour_messages_body",
  },
  {
    id: "profile",
    href: "/(tabs)/settings" as Href,
    titleKey: "tour_profile_title",
    bodyKey: "tour_profile_body",
  },
  {
    id: "intent",
    href: "/(tabs)/profile" as Href,
    titleKey: "tour_intent_title",
    bodyKey: "tour_intent_body",
  },
];

let pending = false;
const startListeners = new Set<() => void>();

export async function isTourDone() {
  try {
    return (await SecureStore.getItemAsync(TOUR_STORAGE_KEY)) === "1";
  } catch {
    return true;
  }
}

export async function markTourDone() {
  pending = false;
  try {
    await SecureStore.setItemAsync(TOUR_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Call right after a successful login/register so the tour starts on first entry. */
export async function markTourPendingIfNeeded() {
  if (await isTourDone()) return;
  pending = true;
}

export function consumeTourPending() {
  if (!pending) return false;
  pending = false;
  return true;
}

export function requestTourStart() {
  startListeners.forEach((fn) => fn());
}

export function onTourStartRequest(fn: () => void) {
  startListeners.add(fn);
  return () => {
    startListeners.delete(fn);
  };
}
