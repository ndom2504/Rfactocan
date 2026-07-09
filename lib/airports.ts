export type Airline = { code: string; name: string };

export const AIRLINES: Airline[] = [
  { code: "AC", name: "Air Canada" },
  { code: "TS", name: "Air Transat" },
  { code: "WS", name: "WestJet" },
  { code: "AF", name: "Air France" },
  { code: "TK", name: "Turkish Airlines" },
  { code: "ET", name: "Ethiopian Airlines" },
  { code: "KQ", name: "Kenya Airways" },
  { code: "AT", name: "Royal Air Maroc" },
  { code: "TU", name: "Tunisair" },
  { code: "AH", name: "Air Algérie" },
  { code: "SN", name: "Brussels Airlines" },
  { code: "LH", name: "Lufthansa" },
  { code: "BA", name: "British Airways" },
  { code: "EK", name: "Emirates" },
  { code: "QR", name: "Qatar Airways" },
  { code: "EY", name: "Etihad" },
  { code: "DL", name: "Delta Air Lines" },
  { code: "UA", name: "United Airlines" },
  { code: "AA", name: "American Airlines" },
  { code: "KL", name: "KLM" },
  { code: "IB", name: "Iberia" },
  { code: "TP", name: "TAP Air Portugal" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "QR2", name: "Royal Jordanian" },
  { code: "WB", name: "RwandAir" },
  { code: "SA", name: "South African Airways" },
  { code: "MS", name: "EgyptAir" },
  { code: "OTHER", name: "Autre / Other" },
].sort((a, b) => a.name.localeCompare(b.name, "fr"));

export type Airport = {
  code: string;
  name: string;
  city: string;
  country: string;
};

export const AIRPORTS: Airport[] = [
  { code: "YUL", name: "Montréal-Trudeau", city: "Montréal", country: "CA" },
  { code: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "CA" },
  { code: "YVR", name: "Vancouver", city: "Vancouver", country: "CA" },
  { code: "YOW", name: "Ottawa", city: "Ottawa", country: "CA" },
  { code: "YYC", name: "Calgary", city: "Calgary", country: "CA" },
  { code: "JFK", name: "New York JFK", city: "New York", country: "US" },
  { code: "EWR", name: "Newark", city: "New York", country: "US" },
  { code: "ORD", name: "Chicago O'Hare", city: "Chicago", country: "US" },
  { code: "ATL", name: "Atlanta", city: "Atlanta", country: "US" },
  { code: "MIA", name: "Miami", city: "Miami", country: "US" },
  { code: "LAX", name: "Los Angeles", city: "Los Angeles", country: "US" },
  { code: "CDG", name: "Paris Charles de Gaulle", city: "Paris", country: "FR" },
  { code: "ORY", name: "Paris Orly", city: "Paris", country: "FR" },
  { code: "LYS", name: "Lyon", city: "Lyon", country: "FR" },
  { code: "MRS", name: "Marseille", city: "Marseille", country: "FR" },
  { code: "BRU", name: "Bruxelles", city: "Bruxelles", country: "BE" },
  { code: "GVA", name: "Genève", city: "Genève", country: "CH" },
  { code: "ZRH", name: "Zurich", city: "Zurich", country: "CH" },
  { code: "LHR", name: "Londres Heathrow", city: "Londres", country: "GB" },
  { code: "FRA", name: "Francfort", city: "Francfort", country: "DE" },
  { code: "AMS", name: "Amsterdam", city: "Amsterdam", country: "NL" },
  { code: "MAD", name: "Madrid", city: "Madrid", country: "ES" },
  { code: "BCN", name: "Barcelone", city: "Barcelone", country: "ES" },
  { code: "FCO", name: "Rome Fiumicino", city: "Rome", country: "IT" },
  { code: "LIS", name: "Lisbonne", city: "Lisbonne", country: "PT" },
  { code: "DXB", name: "Dubaï", city: "Dubaï", country: "AE" },
  { code: "DOH", name: "Doha", city: "Doha", country: "QA" },
  { code: "IST", name: "Istanbul", city: "Istanbul", country: "TR" },
  { code: "ADD", name: "Addis-Abeba", city: "Addis-Abeba", country: "ET" },
  { code: "NBO", name: "Nairobi", city: "Nairobi", country: "KE" },
  { code: "JNB", name: "Johannesburg", city: "Johannesburg", country: "ZA" },
  { code: "CPT", name: "Le Cap", city: "Le Cap", country: "ZA" },
  { code: "CMN", name: "Casablanca", city: "Casablanca", country: "MA" },
  { code: "RAK", name: "Marrakech", city: "Marrakech", country: "MA" },
  { code: "TUN", name: "Tunis", city: "Tunis", country: "TN" },
  { code: "ALG", name: "Alger", city: "Alger", country: "DZ" },
  { code: "CAI", name: "Le Caire", city: "Le Caire", country: "EG" },
  { code: "DKR", name: "Dakar", city: "Dakar", country: "SN" },
  { code: "ABJ", name: "Abidjan", city: "Abidjan", country: "CI" },
  { code: "DLA", name: "Douala", city: "Douala", country: "CM" },
  { code: "NSI", name: "Yaoundé", city: "Yaoundé", country: "CM" },
  { code: "LBV", name: "Libreville", city: "Libreville", country: "GA" },
  { code: "BZV", name: "Brazzaville", city: "Brazzaville", country: "CG" },
  { code: "FIH", name: "Kinshasa", city: "Kinshasa", country: "CD" },
  { code: "LOS", name: "Lagos", city: "Lagos", country: "NG" },
  { code: "ACC", name: "Accra", city: "Accra", country: "GH" },
  { code: "BKO", name: "Bamako", city: "Bamako", country: "ML" },
  { code: "OUA", name: "Ouagadougou", city: "Ouagadougou", country: "BF" },
  { code: "LFW", name: "Lomé", city: "Lomé", country: "TG" },
  { code: "COO", name: "Cotonou", city: "Cotonou", country: "BJ" },
  { code: "KGL", name: "Kigali", city: "Kigali", country: "RW" },
].sort((a, b) => a.city.localeCompare(b.city, "fr"));

export function airportsForCountry(countryCode: string) {
  return AIRPORTS.filter((a) => a.country === countryCode);
}

export function airlineLabel(codeOrName?: string | null) {
  if (!codeOrName) return "";
  const found = AIRLINES.find(
    (a) => a.code === codeOrName || a.name === codeOrName
  );
  return found ? `${found.name} (${found.code})` : codeOrName;
}
