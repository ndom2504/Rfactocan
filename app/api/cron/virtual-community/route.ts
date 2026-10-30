import { NextResponse } from "next/server";
import { publishVirtualCommunityPosts } from "@/lib/virtual-community-posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Quotidien (Hobby Vercel) : publie plusieurs annonces d’exemple dans Communauté
 * (photo + localisation + rédaction), ciblées sur les pays des membres.
 *
 * Auth: Authorization: Bearer $CRON_SECRET.
 * Pour un rythme ~7 h sans plan Pro : cron externe → cette URL avec ?limit=2.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") || "4");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(8, Math.max(1, Math.floor(rawLimit)))
    : 4;

  try {
    const result = await publishVirtualCommunityPosts(limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron/virtual-community]", error);
    return NextResponse.json(
      { error: "Échec publication virtuelle" },
      { status: 500 }
    );
  }
}
