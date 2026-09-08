/** Compte App Store / TestFlight : e-mail + mot de passe, ou SMS + code fixe. */
export const APPLE_REVIEW_EMAIL = "review@rfacto.com";

/** Gabon (pays par défaut dans l’app) : 077 00 20 26 */
export const APPLE_REVIEW_PHONE_GA = "+24177002026";
/** Canada (numéro 555 réservé) : 514 555 0123 */
export const APPLE_REVIEW_PHONE_CA = "+15145550123";

export const APPLE_REVIEW_PHONES = [
  APPLE_REVIEW_PHONE_GA,
  APPLE_REVIEW_PHONE_CA,
] as const;

/** Code SMS fixe pour les testeurs TestFlight / la revue Apple. */
export const APPLE_REVIEW_SMS_OTP =
  process.env.REVIEW_SMS_OTP?.trim() || "202026";

const REVIEW_PHONE_DIGITS = new Set(
  APPLE_REVIEW_PHONES.map((phone) => phone.replace(/\D/g, ""))
);

export function isAppleReviewAccount(email: string | null | undefined) {
  return email?.trim().toLowerCase() === APPLE_REVIEW_EMAIL;
}

export function isAppleReviewPhone(phone: string | null | undefined) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return false;
  if (REVIEW_PHONE_DIGITS.has(digits)) return true;
  if (digits === "5145550123") return true;
  if (digits === "77002026" || digits === "077002026") return true;
  if (digits === "241077002026" || digits === "24107002026") return true;
  return false;
}
