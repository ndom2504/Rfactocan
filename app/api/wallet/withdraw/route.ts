import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { requestHeraldWithdrawal } from "@/lib/wallet";

const bodySchema = z.object({
  force: z.boolean().optional(),
  note: z.string().max(300).optional(),
});

/** Demande retrait des commissions Héraut → mobile / banque / Stripe selon le portefeuille. */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const result = await requestHeraldWithdrawal(session.id, {
      force: body.force,
      note: body.note,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          amountCents: "amountCents" in result ? result.amountCents : undefined,
          withdrawalId:
            "withdrawalId" in result ? result.withdrawalId : undefined,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Retrait impossible";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
