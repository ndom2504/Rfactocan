import { NextResponse } from "next/server";
import { publishCommunityNews } from "@/lib/community-news";
import { publishCommunityTrends } from "@/lib/community-trends";
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
    const news = await publishCommunityNews().catch((error) => {
      console.error("[cron/community-news]", error);
      return { ok: false as const, error: "Échec des actus" };
    });
    const trends = await publishCommunityTrends().catch((error) => {
      console.error("[cron/community-trends]", error);
      return { ok: false as const, error: "Échec des tendances" };
    });
    return NextResponse.json({ ...result, news, trends });
  } catch (error) {
    console.error("[cron/virtual-community]", error);
    return NextResponse.json(
      { error: "Échec publication virtuelle" },
      { status: 500 }
    );
  }
}
