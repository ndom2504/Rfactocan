import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { endCall } from "@/lib/calls";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const endSchema = z
  .object({
    endReason: z.string().max(80).optional(),
  })
  .optional();

async function readBody(request: Request) {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}

/** POST — participant only: ACCEPTED → ENDED. */
export async function POST(request: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = endSchema.parse(await readBody(request));
    const result = await endCall(id, session.id, body?.endReason);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status }
      );
    }
    return NextResponse.json({ call: result.call });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 }
      );
    }
    console.error("[calls] end", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
