import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertUserFromAppleProfile } from "@/lib/apple-auth-user";
import { verifyAppleIdentityToken } from "@/lib/apple-oauth";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  identityToken: z.string().min(20),
  nonce: z.string().min(8).max(128).optional(),
  email: z.string().email().optional(),
  fullName: z
    .object({
      givenName: z.string().max(80).nullable().optional(),
      familyName: z.string().max(80).nullable().optional(),
    })
    .optional(),
  ref: z.string().max(32).optional(),
});

/**
 * Native Sign in with Apple (iOS / iPadOS).
 * Apple already verified the identity — issue a session, no email OTP.
 */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const profile = await verifyAppleIdentityToken(
      body.identityToken,
      body.nonce
    );
    if (!profile.email && body.email) {
      profile.email = body.email.toLowerCase();
    }

    const result = await upsertUserFromAppleProfile(profile, {
      fullName: body.fullName,
      ref: body.ref,
    });

    if (!result.ok) {
      if (result.error === "suspended") {
        return NextResponse.json(
          { error: "Ce compte est suspendu." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Échec de la connexion Apple." },
        { status: 500 }
      );
    }

    const { user } = result;
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email.endsWith("@apple.rfacto.local") ? null : user.email,
        displayName: user.displayName,
        role: user.role,
        preferredCurrency: user.preferredCurrency || "CAD",
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Jeton Apple manquant ou invalide." },
        { status: 400 }
      );
    }
    console.error("Apple auth error:", error);
    return NextResponse.json(
      { error: "Échec de la connexion avec Apple." },
      { status: 401 }
    );
  }
}
