import { NextResponse } from "next/server";
import { AUTH_API_HEADERS, getSessionUser } from "@/lib/auth";
import { ensureMemberCode, publicDisplayName } from "@/lib/member-code";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { user: null },
      { status: 401, headers: AUTH_API_HEADERS }
    );
  }
  const memberCode = await ensureMemberCode(user.id);
  return NextResponse.json(
    {
      user: {
        ...user,
        memberCode,
        displayName: publicDisplayName(user.displayName, memberCode),
      },
    },
    { headers: AUTH_API_HEADERS }
  );
}
