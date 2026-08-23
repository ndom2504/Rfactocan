import { NextResponse } from "next/server";
import { listPhoneCountries } from "@/lib/phone-countries";

export async function GET() {
  return NextResponse.json({ countries: listPhoneCountries() });
}
