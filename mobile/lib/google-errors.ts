const MAP: Record<string, string> = {
  access_denied: "Connexion Google annulée.",
  google_email_required: "Google n'a pas fourni d'email.",
  google_email_unverified: "Votre email Google n'est pas vérifié.",
  account_suspended: "Ce compte est suspendu.",
  google_auth_failed: "Échec de la connexion Google.",
  otp_send_failed: "Impossible d'envoyer le code de vérification.",
  otp_domain_not_verified: "Vérification email indisponible (domaine Resend).",
  invalid_oauth_state: "Session Google expirée. Réessayez.",
};

export function googleMobileErrorMessage(code: string) {
  return MAP[code] || "Échec de la connexion Google.";
}
