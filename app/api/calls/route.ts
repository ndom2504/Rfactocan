import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { CALL_MEDIA_TYPES, isCallStatus } from "@/lib/call-rules";
import { createCall, listCallsForUser } from "@/lib/calls";
import type { CallStatus } from "@prisma/client";

export const runtime = "nodejs";

const createSchema = z.object({
  threadId: z.string().min(1),
  mediaType: z.enum(CALL_MEDIA_TYPES),
});

function errorJson(result: { error: string; status: number; code?: string }) {
  return NextResponse.json(
    { error: result.error, code: result.code },
    { status: result.status }
  );
}

/** GET — call history for the authenticated user. */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || "30");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 30;
  const cursor = url.searchParams.get("cursor");
  const directionParam = url.searchParams.get("direction");
  const direction =
    directionParam === "inbound" || directionParam === "outbound"
      ? directionParam
      : null;
  const statusParam = url.searchParams.get("status");
  const missed = url.searchParams.get("missed") === "1";
  const status = missed
    ? ("MISSED" as CallStatus)
    : isCallStatus(statusParam)
      ? (statusParam as CallStatus)
      : null;
  const threadId = url.searchParams.get("threadId");

  const result = await listCallsForUser({
    userId: session.id,
    limit,
    cursor,
    direction,
    status,
    threadId,
  });
  if (!result.ok) return errorJson(result);

  return NextResponse.json({
    calls: result.calls,
    nextCursor: result.nextCursor,
  });
}

/** POST — start a RINGING call on an existing DirectThread. */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const result = await createCall({
      userId: session.id,
      threadId: body.threadId,
      mediaType: body.mediaType,
    });
    if (!result.ok) return errorJson(result);
    return NextResponse.json({ call: result.call }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 }
      );
    }
    console.error("[calls] POST", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
