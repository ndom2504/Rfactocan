import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserFromToken } from "@/lib/auth";
import {
  googleMobileErrorMessage,
  readGoogleMobileTicket,
} from "@/lib/google-mobile-oauth";

const schema = z.object({
  ticket: z.string().min(20),
});

/**
 * Exchange the short-lived Google mobile ticket (from the in-app browser
 * redirect) for a Bearer session or MFA challenge.
 */
export async function POST(request: Request) {
  try {
    const { ticket } = schema.parse(await request.json());
    const payload = await readGoogleMobileTicket(ticket);

    if (payload.error) {
      return NextResponse.json(
        { error: googleMobileErrorMessage(payload.error) },
        { status: 401 }
      );
    }

    if (payload.mfaToken) {
      return NextResponse.json({
        mfaRequired: true,
        mfaToken: payload.mfaToken,
        emailHint: payload.emailHint || "",
      });
    }

    if (!payload.token) {
      return NextResponse.json(
        { error: "Connexion Google impossible." },
        { status: 401 }
      );
    }

    const user = await getSessionUserFromToken(payload.token);
    if (!user) {
      return NextResponse.json(
        { error: "Session Google expirée. Réessayez." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      token: payload.token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        preferredCurrency: user.preferredCurrency || "CAD",
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Ticket Google requis" },
        { status: 400 }
      );
    }
    console.error("Google mobile ticket error:", error);
    return NextResponse.json(
      { error: "Session Google expirée. Réessayez." },
      { status: 401 }
    );
  }
}
