export type AuthRegion = "africa" | "europe" | "america" | "asia";

export type PhonePlan = {
  code: string;
  name: string;
  nameEn: string;
  dial: string;
  min: number;
  max: number;
  region: AuthRegion;
  placeholder: string;
  /** Côte d’Ivoire / Congo-Brazza keep the national leading 0 in E.164. */
  keepTrunkZero?: boolean;
};

/** Tous les pays : email + SMS (+ Google). smsOnly n’est plus utilisé. */
export const PHONE_PLANS: PhonePlan[] = [
  // Afrique
  { code: "DZ", name: "Algérie", nameEn: "Algeria", dial: "213", min: 8, max: 10, region: "africa", placeholder: "551 23 45 67" },
  { code: "AO", name: "Angola", nameEn: "Angola", dial: "244", min: 9, max: 9, region: "africa", placeholder: "923 000 000" },
  { code: "BJ", name: "Bénin", nameEn: "Benin", dial: "229", min: 8, max: 8, region: "africa", placeholder: "97 00 00 00" },
  { code: "BW", name: "Botswana", nameEn: "Botswana", dial: "267", min: 7, max: 8, region: "africa", placeholder: "71 000 000" },
  { code: "BF", name: "Burkina Faso", nameEn: "Burkina Faso", dial: "226", min: 8, max: 8, region: "africa", placeholder: "70 00 00 00" },
  { code: "BI", name: "Burundi", nameEn: "Burundi", dial: "257", min: 8, max: 8, region: "africa", placeholder: "79 00 00 00" },
  { code: "CV", name: "Cap-Vert", nameEn: "Cabo Verde", dial: "238", min: 7, max: 7, region: "africa", placeholder: "991 00 00" },
  { code: "CM", name: "Cameroun", nameEn: "Cameroon", dial: "237", min: 9, max: 9, region: "africa", placeholder: "6 70 00 00 00" },
  { code: "CF", name: "Centrafrique", nameEn: "Central African Republic", dial: "236", min: 8, max: 8, region: "africa", placeholder: "70 00 00 00" },
  { code: "TD", name: "Tchad", nameEn: "Chad", dial: "235", min: 8, max: 8, region: "africa", placeholder: "66 00 00 00" },
  { code: "KM", name: "Comores", nameEn: "Comoros", dial: "269", min: 7, max: 7, region: "africa", placeholder: "321 00 00" },
  { code: "CG", name: "Congo-Brazzaville", nameEn: "Congo-Brazzaville", dial: "242", min: 9, max: 9, region: "africa", placeholder: "06 000 0000", keepTrunkZero: true },
  { code: "CD", name: "RDC", nameEn: "DR Congo", dial: "243", min: 9, max: 9, region: "africa", placeholder: "81 000 0000" },
  { code: "CI", name: "Côte d’Ivoire", nameEn: "Côte d'Ivoire", dial: "225", min: 10, max: 10, region: "africa", placeholder: "07 00 00 00 00", keepTrunkZero: true },
  { code: "DJ", name: "Djibouti", nameEn: "Djibouti", dial: "253", min: 8, max: 8, region: "africa", placeholder: "77 00 00 00" },
  { code: "EG", name: "Égypte", nameEn: "Egypt", dial: "20", min: 9, max: 10, region: "africa", placeholder: "10 0000 0000" },
  { code: "GQ", name: "Guinée équatoriale", nameEn: "Equatorial Guinea", dial: "240", min: 9, max: 9, region: "africa", placeholder: "222 000 000" },
  { code: "ER", name: "Érythrée", nameEn: "Eritrea", dial: "291", min: 7, max: 7, region: "africa", placeholder: "7 000 000" },
  { code: "SZ", name: "Eswatini", nameEn: "Eswatini", dial: "268", min: 8, max: 8, region: "africa", placeholder: "76 00 0000" },
  { code: "ET", name: "Éthiopie", nameEn: "Ethiopia", dial: "251", min: 9, max: 9, region: "africa", placeholder: "91 000 0000" },
  // Depuis avril 2024 : national 9 chiffres (077…), E.164 +241 + 8 chiffres (sans le 0).
  { code: "GA", name: "Gabon", nameEn: "Gabon", dial: "241", min: 8, max: 8, region: "africa", placeholder: "077 00 00 00" },
  { code: "GM", name: "Gambie", nameEn: "Gambia", dial: "220", min: 7, max: 7, region: "africa", placeholder: "301 0000" },
  { code: "GH", name: "Ghana", nameEn: "Ghana", dial: "233", min: 9, max: 9, region: "africa", placeholder: "24 000 0000" },
  { code: "GN", name: "Guinée", nameEn: "Guinea", dial: "224", min: 9, max: 9, region: "africa", placeholder: "620 00 00 00" },
  { code: "GW", name: "Guinée-Bissau", nameEn: "Guinea-Bissau", dial: "245", min: 7, max: 7, region: "africa", placeholder: "955 0000" },
  { code: "KE", name: "Kenya", nameEn: "Kenya", dial: "254", min: 9, max: 9, region: "africa", placeholder: "712 000000" },
  { code: "LS", name: "Lesotho", nameEn: "Lesotho", dial: "266", min: 8, max: 8, region: "africa", placeholder: "50 00 0000" },
  { code: "LR", name: "Liberia", nameEn: "Liberia", dial: "231", min: 7, max: 9, region: "africa", placeholder: "77 000 0000" },
  { code: "LY", name: "Libye", nameEn: "Libya", dial: "218", min: 9, max: 9, region: "africa", placeholder: "91 000 0000" },
  { code: "MG", name: "Madagascar", nameEn: "Madagascar", dial: "261", min: 9, max: 10, region: "africa", placeholder: "32 00 000 00" },
  { code: "MW", name: "Malawi", nameEn: "Malawi", dial: "265", min: 9, max: 9, region: "africa", placeholder: "99 000 0000" },
  { code: "ML", name: "Mali", nameEn: "Mali", dial: "223", min: 8, max: 8, region: "africa", placeholder: "70 00 00 00" },
  { code: "MR", name: "Mauritanie", nameEn: "Mauritania", dial: "222", min: 8, max: 8, region: "africa", placeholder: "22 00 00 00" },
  { code: "MU", name: "Maurice", nameEn: "Mauritius", dial: "230", min: 8, max: 8, region: "africa", placeholder: "5 800 0000" },
  { code: "MA", name: "Maroc", nameEn: "Morocco", dial: "212", min: 9, max: 9, region: "africa", placeholder: "6 00 00 00 00" },
  { code: "MZ", name: "Mozambique", nameEn: "Mozambique", dial: "258", min: 9, max: 9, region: "africa", placeholder: "82 000 0000" },
  { code: "NA", name: "Namibie", nameEn: "Namibia", dial: "264", min: 9, max: 9, region: "africa", placeholder: "81 000 0000" },
  { code: "NE", name: "Niger", nameEn: "Niger", dial: "227", min: 8, max: 8, region: "africa", placeholder: "90 00 00 00" },
  { code: "NG", name: "Nigeria", nameEn: "Nigeria", dial: "234", min: 10, max: 10, region: "africa", placeholder: "802 000 0000" },
  { code: "RW", name: "Rwanda", nameEn: "Rwanda", dial: "250", min: 9, max: 9, region: "africa", placeholder: "78 000 0000" },
  { code: "ST", name: "Sao Tomé", nameEn: "Sao Tome", dial: "239", min: 7, max: 7, region: "africa", placeholder: "981 0000" },
  { code: "SN", name: "Sénégal", nameEn: "Senegal", dial: "221", min: 9, max: 9, region: "africa", placeholder: "77 000 00 00" },
  { code: "SC", name: "Seychelles", nameEn: "Seychelles", dial: "248", min: 7, max: 7, region: "africa", placeholder: "2 510 000" },
  { code: "SL", name: "Sierra Leone", nameEn: "Sierra Leone", dial: "232", min: 8, max: 8, region: "africa", placeholder: "76 000000" },
  { code: "SO", name: "Somalie", nameEn: "Somalia", dial: "252", min: 8, max: 9, region: "africa", placeholder: "61 0000000" },
  { code: "ZA", name: "Afrique du Sud", nameEn: "South Africa", dial: "27", min: 9, max: 9, region: "africa", placeholder: "82 000 0000" },
  { code: "SS", name: "Soudan du Sud", nameEn: "South Sudan", dial: "211", min: 9, max: 9, region: "africa", placeholder: "92 000 0000" },
  { code: "SD", name: "Soudan", nameEn: "Sudan", dial: "249", min: 9, max: 9, region: "africa", placeholder: "91 000 0000" },
  { code: "TZ", name: "Tanzanie", nameEn: "Tanzania", dial: "255", min: 9, max: 9, region: "africa", placeholder: "71 000 0000" },
  { code: "TG", name: "Togo", nameEn: "Togo", dial: "228", min: 8, max: 8, region: "africa", placeholder: "90 00 00 00" },
  { code: "TN", name: "Tunisie", nameEn: "Tunisia", dial: "216", min: 8, max: 8, region: "africa", placeholder: "20 000 000" },
  { code: "UG", name: "Ouganda", nameEn: "Uganda", dial: "256", min: 9, max: 9, region: "africa", placeholder: "70 000 0000" },
  { code: "ZM", name: "Zambie", nameEn: "Zambia", dial: "260", min: 9, max: 9, region: "africa", placeholder: "97 000 0000" },
  { code: "ZW", name: "Zimbabwe", nameEn: "Zimbabwe", dial: "263", min: 9, max: 9, region: "africa", placeholder: "71 000 0000" },
  // Europe
  { code: "FR", name: "France", nameEn: "France", dial: "33", min: 9, max: 9, region: "europe", placeholder: "6 12 34 56 78" },
  { code: "BE", name: "Belgique", nameEn: "Belgium", dial: "32", min: 8, max: 9, region: "europe", placeholder: "470 12 34 56" },
  { code: "CH", name: "Suisse", nameEn: "Switzerland", dial: "41", min: 9, max: 9, region: "europe", placeholder: "78 000 00 00" },
  { code: "GB", name: "Royaume-Uni", nameEn: "United Kingdom", dial: "44", min: 10, max: 10, region: "europe", placeholder: "7700 900123" },
  { code: "DE", name: "Allemagne", nameEn: "Germany", dial: "49", min: 10, max: 11, region: "europe", placeholder: "1512 3456789" },
  { code: "IT", name: "Italie", nameEn: "Italy", dial: "39", min: 9, max: 10, region: "europe", placeholder: "312 345 6789" },
  { code: "ES", name: "Espagne", nameEn: "Spain", dial: "34", min: 9, max: 9, region: "europe", placeholder: "612 34 56 78" },
  { code: "PT", name: "Portugal", nameEn: "Portugal", dial: "351", min: 9, max: 9, region: "europe", placeholder: "912 345 678" },
  { code: "NL", name: "Pays-Bas", nameEn: "Netherlands", dial: "31", min: 9, max: 9, region: "europe", placeholder: "6 12345678" },
  { code: "IE", name: "Irlande", nameEn: "Ireland", dial: "353", min: 9, max: 9, region: "europe", placeholder: "85 123 4567" },
  // Amérique
  { code: "CA", name: "Canada", nameEn: "Canada", dial: "1", min: 10, max: 10, region: "america", placeholder: "514 555 0123" },
  { code: "US", name: "États-Unis", nameEn: "United States", dial: "1", min: 10, max: 10, region: "america", placeholder: "415 555 0123" },
  { code: "BR", name: "Brésil", nameEn: "Brazil", dial: "55", min: 10, max: 11, region: "america", placeholder: "11 91234 5678" },
  { code: "MX", name: "Mexique", nameEn: "Mexico", dial: "52", min: 10, max: 10, region: "america", placeholder: "55 1234 5678" },
  { code: "HT", name: "Haïti", nameEn: "Haiti", dial: "509", min: 8, max: 8, region: "america", placeholder: "34 00 0000" },
  // Asie / Océanie (dual auth)
  { code: "CN", name: "Chine", nameEn: "China", dial: "86", min: 11, max: 11, region: "asia", placeholder: "138 0000 0000" },
  { code: "IN", name: "Inde", nameEn: "India", dial: "91", min: 10, max: 10, region: "asia", placeholder: "98765 43210" },
  { code: "JP", name: "Japon", nameEn: "Japan", dial: "81", min: 10, max: 10, region: "asia", placeholder: "90 1234 5678" },
  { code: "KR", name: "Corée du Sud", nameEn: "South Korea", dial: "82", min: 9, max: 10, region: "asia", placeholder: "10 1234 5678" },
  { code: "AE", name: "Émirats", nameEn: "UAE", dial: "971", min: 9, max: 9, region: "asia", placeholder: "50 123 4567" },
  { code: "SA", name: "Arabie saoudite", nameEn: "Saudi Arabia", dial: "966", min: 9, max: 9, region: "asia", placeholder: "50 123 4567" },
  { code: "TR", name: "Turquie", nameEn: "Turkey", dial: "90", min: 10, max: 10, region: "asia", placeholder: "532 000 0000" },
  { code: "AU", name: "Australie", nameEn: "Australia", dial: "61", min: 9, max: 9, region: "asia", placeholder: "412 345 678" },
];

const BY_CODE = new Map(PHONE_PLANS.map((p) => [p.code, p]));

export function getPhonePlan(code?: string | null): PhonePlan | null {
  if (!code) return null;
  return BY_CODE.get(code.trim().toUpperCase()) ?? null;
}

/** ISO, nom FR ou nom EN → code pays du plan SMS. */
export function resolvePhoneCountry(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^[A-Za-z]{2}$/.test(v)) {
    return getPhonePlan(v)?.code ?? null;
  }
  const lower = v.toLowerCase();
  return (
    PHONE_PLANS.find(
      (p) => p.name.toLowerCase() === lower || p.nameEn.toLowerCase() === lower
    )?.code ?? null
  );
}

export function isAfricaCountry(code?: string | null): boolean {
  return getPhonePlan(code)?.region === "africa";
}

/** Conservé pour compat : plus aucun pays n’est SMS-only. */
export function isSmsOnlyCountry(_code?: string | null): boolean {
  return false;
}

export function allowWebGoogleAuth(_code?: string | null): boolean {
  return true;
}

/** Google web partout (email + SMS aussi). */
export function showWebGoogleAuth(_code?: string | null): boolean {
  return true;
}

export function listPhoneCountries() {
  return PHONE_PLANS.map((p) => ({
    code: p.code,
    name: p.name,
    nameEn: p.nameEn,
    dial: `+${p.dial}`,
    placeholder: p.placeholder,
    smsOnly: false,
    region: p.region,
  }));
}

function restLengthOk(plan: PhonePlan, restLen: number): boolean {
  const minRest = Math.max(1, plan.min - 1);
  const maxRest = plan.max + (plan.keepTrunkZero ? 0 : 1);
  return restLen >= minRest && restLen <= maxRest;
}

function nationalDigits(input: string, plan: PhonePlan): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  let national = digits;
  if (national.startsWith(`00${plan.dial}`)) {
    national = national.slice(2 + plan.dial.length);
  } else if (national.startsWith(plan.dial)) {
    const rest = national.slice(plan.dial.length);
    if (restLengthOk(plan, rest.length)) {
      national = rest;
    }
  }
  if (!plan.keepTrunkZero && national.startsWith("0")) {
    national = national.slice(1);
  }
  if (plan.keepTrunkZero && national.length === plan.min - 1 && /^[2-9]/.test(national)) {
    national = `0${national}`;
  }
  // Plan 2024 : 07 47 00 12 (7 chiffres hors 0) → 077 47 00 12.
  if (plan.code === "GA" && national.length === 7 && /^[2-9]/.test(national)) {
    national = `${national[0]}${national}`;
  }
  if (national.length < plan.min || national.length > plan.max) return null;
  return national;
}

export function normalizePhoneForCountry(
  input: string,
  country: string
): string | null {
  const plan = getPhonePlan(country);
  if (!plan) return null;
  const national = nationalDigits(input, plan);
  if (!national) return null;
  if (plan.code === "CA" || plan.code === "US") {
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null;
  }
  if (plan.code === "GA" && !/^[2-9]\d{7}$/.test(national)) return null;
  return `+${plan.dial}${national}`;
}

/** Longest dial first so +1242 is not read as +1. */
const DIAL_SORTED = [...PHONE_PLANS].sort((a, b) => b.dial.length - a.dial.length);

export function countryFromDial(e164: string): string | null {
  const digits = e164.replace(/\D/g, "");
  for (const plan of DIAL_SORTED) {
    if (digits.startsWith(plan.dial)) {
      const rest = digits.slice(plan.dial.length);
      if (restLengthOk(plan, rest.length)) {
        if (plan.dial === "1" && rest.length === 10) return plan.code === "US" ? "CA" : plan.code;
        return plan.code;
      }
    }
  }
  return null;
}
