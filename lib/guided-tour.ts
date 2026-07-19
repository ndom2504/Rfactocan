import type { DictKey } from "@/lib/i18n";

export const TOUR_STORAGE_KEY = "rfacto_tour_v1_done";
export const TOUR_PENDING_KEY = "rfacto_tour_pending";
export const TOUR_START_EVENT = "rfacto:start-tour";

export type TourStep = {
  id: string;
  /** Path where the target should exist */
  route: string;
  /** CSS selector — usually [data-tour="..."] */
  selector: string;
  titleKey: DictKey;
  bodyKey: DictKey;
};

/** Visite guidée alignée sur les écrans produit (dashboard → réservations → messages → profil). */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    selector: '[data-tour="welcome"]',
    titleKey: "tour_welcome_title",
    bodyKey: "tour_welcome_body",
  },
  {
    id: "publish",
    route: "/dashboard",
    selector: '[data-tour="publish"]',
    titleKey: "tour_publish_title",
    bodyKey: "tour_publish_body",
  },
  {
    id: "publish-ctas",
    route: "/dashboard",
    selector: '[data-tour="publish-ctas"]',
    titleKey: "tour_ctas_title",
    bodyKey: "tour_ctas_body",
  },
  {
    id: "search",
    route: "/dashboard",
    selector: '[data-tour="search"]',
    titleKey: "tour_search_title",
    bodyKey: "tour_search_body",
  },
  {
    id: "stats",
    route: "/dashboard",
    selector: '[data-tour="stats"]',
    titleKey: "tour_stats_title",
    bodyKey: "tour_stats_body",
  },
  {
    id: "activity",
    route: "/dashboard",
    selector: '[data-tour="activity"]',
    titleKey: "tour_activity_title",
    bodyKey: "tour_activity_body",
  },
  {
    id: "nav",
    route: "/dashboard",
    selector: '[data-tour="nav"]',
    titleKey: "tour_nav_title",
    bodyKey: "tour_nav_body",
  },
  {
    id: "bookings",
    route: "/bookings",
    selector: '[data-tour="bookings"]',
    titleKey: "tour_bookings_title",
    bodyKey: "tour_bookings_body",
  },
  {
    id: "messages",
    route: "/messages",
    selector: '[data-tour="messages"]',
    titleKey: "tour_messages_title",
    bodyKey: "tour_messages_body",
  },
  {
    id: "profile",
    route: "/profile",
    selector: '[data-tour="profile-trust"]',
    titleKey: "tour_profile_title",
    bodyKey: "tour_profile_body",
  },
  {
    id: "intent",
    route: "/profile",
    selector: '[data-tour="profile-intent"]',
    titleKey: "tour_intent_title",
    bodyKey: "tour_intent_body",
  },
];

export function isTourDone() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTourDone() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
    sessionStorage.removeItem(TOUR_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** Call right after a successful login/register so the tour starts on first entry. */
export function markTourPendingIfNeeded() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(TOUR_STORAGE_KEY) === "1") return;
    sessionStorage.setItem(TOUR_PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumeTourPending() {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(TOUR_PENDING_KEY) !== "1") return false;
    sessionStorage.removeItem(TOUR_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}

export function hasTourPending() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(TOUR_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function requestTourStart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TOUR_START_EVENT));
}
