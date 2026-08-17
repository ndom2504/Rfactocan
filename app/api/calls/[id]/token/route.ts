import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { issueCallLivekitToken } from "@/lib/calls";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET — LiveKit join token for an ACCEPTED 1-to-1 call.
 * Never returns LIVEKIT_API_SECRET. Room name is always taken from the Call row.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const result = await issueCallLivekitToken(id, session.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status }
    );
  }

  return NextResponse.json({
    livekitUrl: result.livekitUrl,
    token: result.token,
    roomName: result.roomName,
  });
}
