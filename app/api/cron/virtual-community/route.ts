import { NextResponse } from "next/server";
import { publishVirtualCommunityPosts } from "@/lib/virtual-community-posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Toutes les ~7 h : publie 1–2 annonces d’exemple dans Communauté
 * (photo + localisation + rédaction), ciblées sur les pays des membres.
 *
 * Auth: Authorization: Bearer $CRON_SECRET (Vercel Cron ou cron externe).
 * Sur plan Hobby, si Vercel n’accepte qu’1 cron/jour, pointer un cron
 * externe (cron-job.org) vers cette URL toutes les 7 h.
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
    const result = await publishVirtualCommunityPosts(2);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron/virtual-community]", error);
    return NextResponse.json(
      { error: "Échec publication virtuelle" },
      { status: 500 }
    );
  }
}
