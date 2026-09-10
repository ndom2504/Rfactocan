import { NextResponse } from "next/server";
import { AUTH_API_HEADERS, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { user: null },
      { status: 401, headers: AUTH_API_HEADERS }
    );
  }
  return NextResponse.json({ user }, { headers: AUTH_API_HEADERS });
}
