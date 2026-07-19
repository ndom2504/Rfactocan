import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { consumeLoginOtp, verifyMfaToken } from "@/lib/login-otp";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().min(4).max(12),
});

const ERRORS: Record<string, string> = {
  INVALID_CODE: "Code incorrect.",
  CODE_EXPIRED: "Code expiré. Demandez un nouveau code.",
  TOO_MANY_ATTEMPTS: "Trop de tentatives. Demandez un nouveau code.",
};

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const userId = await verifyMfaToken(body.mfaToken);
    if (!userId) {
      return NextResponse.json(
        { error: "Session de vérification expirée. Reconnectez-vous." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Compte indisponible." },
        { status: 403 }
      );
    }

    const result = await consumeLoginOtp(userId, body.code);
    if (!result.ok) {
      return NextResponse.json(
        { error: ERRORS[result.error] || "Code incorrect." },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
