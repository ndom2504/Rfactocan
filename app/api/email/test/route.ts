import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isEmailConfigured, sendTestEmail } from "@/lib/email";

const schema = z.object({
  to: z.string().email().optional(),
});

/** Admin-only smoke test: POST /api/email/test { "to": "you@example.com" } */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = schema.parse(await request.json().catch(() => ({})));
  const to = body.to ?? session.email;

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error:
          "RESEND_API_KEY manquant. Ajoutez-le sur Vercel (Environment Variables) puis redeploy.",
      },
      { status: 503 }
    );
  }

  const result = await sendTestEmail(to);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        to,
        from: process.env.EMAIL_FROM ?? "Rfacto <onboarding@resend.dev>",
        error: "skipped" in result && result.skipped ? result.reason : result.error,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    to,
    from: process.env.EMAIL_FROM ?? "Rfacto <onboarding@resend.dev>",
    resendId: result.id,
  });
}

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  return NextResponse.json({
    configured: isEmailConfigured(),
    from: process.env.EMAIL_FROM ?? "Rfacto <onboarding@resend.dev>",
  });
}
