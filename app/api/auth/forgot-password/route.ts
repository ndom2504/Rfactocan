import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl } from "@/lib/app-url";
import { emailPasswordReset, isEmailConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Always returns a generic success message to avoid email enumeration.
 */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });

    // Generic response used in all cases
    const okResponse = NextResponse.json({
      ok: true,
      message:
        "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.",
    });

    if (!user || user.status === "SUSPENDED") {
      return okResponse;
    }

    // Google-only accounts have no password to reset
    if (!user.passwordHash) {
      return okResponse;
    }

    if (!isEmailConfigured()) {
      console.warn("[forgot-password] RESEND_API_KEY missing");
      return NextResponse.json(
        {
          error:
            "L'envoi d'email n'est pas configuré sur ce serveur. Contactez le support.",
        },
        { status: 503 }
      );
    }

    // Invalidate previous unused tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const result = await emailPasswordReset({
      email: user.email,
      displayName: user.displayName,
      resetUrl,
    });

    if (!result.ok && !("skipped" in result && result.skipped)) {
      return NextResponse.json(
        { error: "Impossible d'envoyer l'email pour le moment." },
        { status: 502 }
      );
    }

    return okResponse;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
