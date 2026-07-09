import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional(),
  country: z.string().max(80).optional(),
  avatarUrl: z
    .string()
    .max(2000)
    .refine(
      (v) =>
        v.startsWith("/uploads/") ||
        v.startsWith("/api/media?") ||
        v.startsWith("https://") ||
        v.startsWith("http://"),
      "URL de photo invalide"
    )
    .optional()
    .nullable(),
  role: z.enum(["SENDER", "TRAVELER", "BOTH"]).optional(),
  language: z.enum(["fr", "en"]).optional(),
  preferredCurrency: z.enum(["CAD", "USD", "EUR"]).optional(),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: session.id },
      data: body,
    });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
