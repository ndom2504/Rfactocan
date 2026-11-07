import { NextResponse } from "next/server";
import { publishCommunityTrends } from "@/lib/community-trends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Publie dans Communauté des emplois, opportunités et produits
 * issus de flux officiels. Chaque carte garde la photo et le lien source.
 *
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
    const result = await publishCommunityTrends();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    console.error("[community/trends]", error);
    return NextResponse.json(
      { error: "Échec des tendances" },
      { status: 500 }
    );
  }
}
