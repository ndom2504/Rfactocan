import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AUTH_API_HEADERS,
  getSessionToken,
  getSessionUserFromToken,
  setSessionCookie,
} from "@/lib/auth";

const switchSchema = z.object({
  token: z.string().min(20),
});

export async function GET(request: Request) {
  const token = await getSessionToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Non authentifié" },
      { status: 401, headers: AUTH_API_HEADERS }
    );
  }
  const user = await getSessionUserFromToken(token);
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié" },
      { status: 401, headers: AUTH_API_HEADERS }
    );
  }
  return NextResponse.json(
    {
      token,
      user: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    },
    { headers: AUTH_API_HEADERS }
  );
}

export async function POST(request: Request) {
  const parsed = switchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const user = await getSessionUserFromToken(parsed.data.token);
  if (!user) {
    return NextResponse.json(
      { error: "Session invalide." },
      { status: 401, headers: AUTH_API_HEADERS }
    );
  }
  await setSessionCookie(parsed.data.token);
  return NextResponse.json(
    {
      ok: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    },
    { headers: AUTH_API_HEADERS }
  );
}
