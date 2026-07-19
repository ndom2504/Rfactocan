import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { startEmailOtpChallenge } from "@/lib/login-otp";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Ce compte est suspendu." },
        { status: 403 }
      );
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    const challenge = await startEmailOtpChallenge(user);
    if (challenge.ok) {
      return NextResponse.json({
        mfaRequired: true,
        mfaToken: challenge.mfaToken,
        emailHint: challenge.emailHint,
      });
    }

    if (!challenge.skipped) {
      return NextResponse.json(
        {
          error:
            "Impossible d'envoyer le code de vérification. Réessayez dans un instant.",
        },
        { status: 502 }
      );
    }

    console.warn(
      "[login] RESEND_API_KEY missing — OTP skipped, session issued directly"
    );
    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        preferredCurrency: user.preferredCurrency || "CAD",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
