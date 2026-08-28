import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { assertThreadParticipant } from "@/lib/dm";
import { persistTyping } from "@/lib/dm-typing";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  typing: z.boolean(),
});

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const thread = await assertThreadParticipant(id, session.id);
  if (!thread) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  await persistTyping(id, session.id, parsed.data.typing);
  return NextResponse.json({ ok: true });
}
