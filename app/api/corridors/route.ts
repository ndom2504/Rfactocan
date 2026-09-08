import { NextResponse } from "next/server";
import { COUNTRIES, getCities } from "@/lib/corridors";
import { REGIONS } from "@/lib/regions";

const REGION_EN: Record<string, string> = {
  north_america: "North America",
  caribbean: "Caribbean & Central America",
  south_america: "South America",
  west_africa: "West Africa",
  central_africa: "Central Africa",
  east_southern_africa: "East & Southern Africa",
  north_africa: "North Africa",
  europe: "Europe",
  middle_east_asia: "Middle East & Asia",
  oceania: "Oceania",
};

export async function GET() {
  return NextResponse.json(
    {
      countries: COUNTRIES.map((c) => ({
        code: c.code,
        name: c.name,
        cities: getCities(c.code),
      })),
      regions: REGIONS.map((r) => ({
        id: r.id,
        name: r.name,
        nameEn: REGION_EN[r.id] ?? r.name,
        codes: [...r.codes],
      })),
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
