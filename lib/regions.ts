import { COUNTRIES } from "@/lib/corridors";

/** Geographic regions for traveler search filters. */
export const REGIONS = [
  {
    id: "north_america",
    name: "Amérique du Nord",
    codes: ["CA", "US", "MX"],
  },
  {
    id: "caribbean",
    name: "Caraïbes & Amérique centrale",
    codes: ["HT", "DO", "CU", "JM", "GP", "MQ", "GF"],
  },
  {
    id: "south_america",
    name: "Amérique du Sud",
    codes: ["BR", "AR", "CL", "CO", "PE", "VE", "EC"],
  },
  {
    id: "west_africa",
    name: "Afrique de l'Ouest",
    codes: ["SN", "CI", "ML", "BF", "GN", "BJ", "TG", "NE", "GH", "NG", "MR", "SL", "LR", "GM", "GW", "CV"],
  },
  {
    id: "central_africa",
    name: "Afrique centrale",
    codes: ["CM", "GA", "CG", "CD", "CF", "TD", "GQ", "ST", "AO"],
  },
  {
    id: "east_southern_africa",
    name: "Afrique de l'Est & Australe",
    codes: ["KE", "TZ", "UG", "ET", "RW", "BI", "MG", "MU", "SC", "RE", "ZA", "ZW", "ZM", "BW", "NA", "MZ", "MW", "DJ", "ER", "SO", "SS"],
  },
  {
    id: "north_africa",
    name: "Afrique du Nord",
    codes: ["MA", "DZ", "TN", "EG", "LY", "SD"],
  },
  {
    id: "europe",
    name: "Europe",
    codes: [
      "FR",
      "BE",
      "CH",
      "LU",
      "GB",
      "DE",
      "ES",
      "IT",
      "PT",
      "NL",
      "IE",
      "SE",
      "NO",
      "DK",
      "PL",
      "RO",
      "TR",
    ],
  },
  {
    id: "middle_east_asia",
    name: "Moyen-Orient & Asie",
    codes: [
      "AE",
      "SA",
      "QA",
      "IL",
      "IN",
      "PK",
      "BD",
      "CN",
      "HK",
      "JP",
      "KR",
      "SG",
      "MY",
      "TH",
      "VN",
      "PH",
      "ID",
    ],
  },
  {
    id: "oceania",
    name: "Océanie",
    codes: ["AU", "NZ"],
  },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export function getRegionById(id: string) {
  return REGIONS.find((r) => r.id === id);
}

export function getRegionForCountry(code: string) {
  return REGIONS.find((r) => (r.codes as readonly string[]).includes(code));
}

export function countryCodesForRegion(regionId: string): string[] {
  return [...(getRegionById(regionId)?.codes ?? [])];
}

export function citiesInRegion(regionId: string): string[] {
  const codes = countryCodesForRegion(regionId);
  const cities = new Set<string>();
  for (const c of COUNTRIES) {
    if (codes.includes(c.code)) {
      for (const city of c.cities) cities.add(city);
    }
  }
  return [...cities].sort((a, b) => a.localeCompare(b, "fr"));
}
