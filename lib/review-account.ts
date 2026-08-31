/** Compte App Store / TestFlight : connexion e-mail + mot de passe, sans OTP. */
export const APPLE_REVIEW_EMAIL = "review@rfacto.com";

export function isAppleReviewAccount(email: string | null | undefined) {
  return email?.trim().toLowerCase() === APPLE_REVIEW_EMAIL;
}
