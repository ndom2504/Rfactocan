import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { acceptCall } from "@/lib/calls";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** POST — callee only: RINGING → ACCEPTED. */
export async function POST(_request: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const result = await acceptCall(id, session.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status }
    );
  }
  return NextResponse.json({ call: result.call });
}
