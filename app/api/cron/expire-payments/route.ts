import { NextResponse } from "next/server";
import { releaseExpiredPayments } from "@/lib/payments/expiry";

export const runtime = "nodejs";

/**
 * Daily cron (Hobby plan): expire unpaid AWAITING_PAYMENT bookings past 24h.
 * Lazy expiry on GET booking / POST checkout still covers most cases.
 * Protect with Authorization: Bearer $CRON_SECRET (Vercel Cron).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const expired = await releaseExpiredPayments();
  return NextResponse.json({ ok: true, expired });
}
