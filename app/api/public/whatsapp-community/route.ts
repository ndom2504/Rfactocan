import { NextResponse } from "next/server";
import { getWhatsAppCommunityUrl } from "@/lib/whatsapp-community";

export const dynamic = "force-dynamic";

/** Public invite URL for site + Android FAB (no auth). */
export async function GET() {
  const url = await getWhatsAppCommunityUrl();
  return NextResponse.json({ url });
}
