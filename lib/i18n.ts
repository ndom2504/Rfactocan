export type Locale = "fr" | "en";

export const LOCALES: Locale[] = ["fr", "en"];
export const LOCALE_COOKIE = "rfacto_locale";

const dict = {
  fr: {
    nav_dashboard: "Tableau de bord",
    nav_trips: "Voyages",
    nav_requests: "Demandes",
    nav_bookings: "Réservations",
    nav_messages: "Messages",
    nav_profile: "Profil",
    nav_admin: "Admin",
    nav_login: "Connexion",
    nav_signup: "Créer un compte",
    verified: "Vérifié",
    logout: "Déconnexion",
    notifications: "Notifications",
    no_notifications: "Aucune notification",
    mark_all_read: "Tout marquer lu",
    language: "Langue",
    currency: "Devise",
    search_travelers: "Recherche rapide de voyageurs",
    publish_trip: "Publier un voyage",
    publish_request: "Publier une demande",
    recent_activity: "Activité récente",
    open_trips: "Voyages ouverts",
    open_requests: "Demandes ouvertes",
    avg_rating: "Note moyenne",
    airline: "Compagnie",
    flight_number: "N° de vol",
    airport_from: "Aéroport de départ",
    airport_to: "Aéroport d'arrivée",
    price_per_kg: "Prix / kg",
    payment_checklist: "Parcours paiement",
    payment_ready: "Prêt à recevoir des paiements",
    payment_steps_needed: "Étapes restantes pour encaisser",
  },
  en: {
    nav_dashboard: "Dashboard",
    nav_trips: "Trips",
    nav_requests: "Requests",
    nav_bookings: "Bookings",
    nav_messages: "Messages",
    nav_profile: "Profile",
    nav_admin: "Admin",
    nav_login: "Log in",
    nav_signup: "Sign up",
    verified: "Verified",
    logout: "Log out",
    notifications: "Notifications",
    no_notifications: "No notifications",
    mark_all_read: "Mark all read",
    language: "Language",
    currency: "Currency",
    search_travelers: "Quick traveler search",
    publish_trip: "Post a trip",
    publish_request: "Post a request",
    recent_activity: "Recent activity",
    open_trips: "Open trips",
    open_requests: "Open requests",
    avg_rating: "Average rating",
    airline: "Airline",
    flight_number: "Flight number",
    airport_from: "Departure airport",
    airport_to: "Arrival airport",
    price_per_kg: "Price / kg",
    payment_checklist: "Payment readiness",
    payment_ready: "Ready to receive payments",
    payment_steps_needed: "Steps left to get paid",
  },
} as const;

export type DictKey = keyof typeof dict.fr;

export function t(locale: Locale, key: DictKey): string {
  return dict[locale][key] ?? dict.fr[key] ?? key;
}

export function normalizeLocale(value?: string | null): Locale {
  return value === "en" ? "en" : "fr";
}
