import { NextResponse } from "next/server";
import { z } from "zod";
import { issueLoginOtp, maskEmail, verifyMfaToken } from "@/lib/login-otp";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  mfaToken: z.string().min(1),
});

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

    const issued = await issueLoginOtp(user);
    if (!issued.ok) {
      return NextResponse.json(
        {
          error:
            "Impossible d'envoyer le code. Réessayez dans un instant.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      emailHint: maskEmail(user.email),
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
