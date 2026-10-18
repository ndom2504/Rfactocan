import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { emailAppTesterInvite, isEmailConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  PLAY_STORE_URL,
  androidTesterUrl,
  iosTesterUrl,
} from "@/lib/store-testing";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Pause between sends to stay under Resend rate limits. */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Temporary admin action: email all active users the Google Play test invite links.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY manquant. Configurez Resend sur Vercel pour envoyer des e-mails.",
      },
      { status: 503 }
    );
  }

  let confirm = false;
  try {
    const body = (await req.json()) as { confirm?: boolean };
    confirm = Boolean(body?.confirm);
  } catch {
    confirm = false;
  }
  if (!confirm) {
    return NextResponse.json(
      { error: "Confirmez l'envoi (confirm: true)." },
      { status: 400 }
    );
  }

  const users = await prisma.user.findMany({
    where: {
      email: { not: "" },
      status: { not: "SUSPENDED" },
    },
    select: {
      email: true,
      displayName: true,
    },
    orderBy: { email: "asc" },
  });

  const seen = new Set<string>();
  const recipients: { email: string; displayName: string }[] = [];
  for (const u of users) {
    const email = (u.email || "").trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      email,
      displayName: u.displayName || "membre Rfacto",
    });
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const result = await emailAppTesterInvite({
      email: recipient.email,
      displayName: recipient.displayName,
      testingUrl: androidTesterUrl(),
      storeUrl: PLAY_STORE_URL,
      iosUrl: iosTesterUrl(),
    });

    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      const detail =
        "skipped" in result && result.skipped
          ? result.reason
          : "error" in result
            ? result.error
            : "erreur inconnue";
      if (errors.length < 8) {
        errors.push(`${recipient.email}: ${detail}`);
      }
    }

    await sleep(350);
  }

  return NextResponse.json({
    ok: failed === 0,
    total: recipients.length,
    sent,
    failed,
    testingUrl: androidTesterUrl(),
    storeUrl: PLAY_STORE_URL,
    iosUrl: iosTesterUrl(),
    errors: errors.length ? errors : undefined,
  });
}
