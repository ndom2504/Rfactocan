import { NextResponse } from "next/server";
import { publishBarreauResources } from "@/lib/community-barreau";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Publie dans Communauté les ressources officielles du parcours du Barreau.
 * Auth: Authorization: Bearer $CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await publishBarreauResources();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    console.error("[community/barreau]", error);
    return NextResponse.json(
      { error: "Échec des ressources du Barreau" },
      { status: 500 }
    );
  }
}
