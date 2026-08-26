import { getApiUrl } from "./api";

export type PhoneCountry = {
  code: string;
  name: string;
  nameEn: string;
  dial: string;
  placeholder: string;
};

let cached: PhoneCountry[] | null = null;

export async function fetchPhoneCountries(): Promise<PhoneCountry[]> {
  if (cached) return cached;
  const res = await fetch(`${getApiUrl()}/api/auth/phone/countries`);
  const data = (await res.json()) as { countries?: PhoneCountry[] };
  cached = data.countries ?? [];
  return cached;
}
