import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { maskAuthPhone } from "@/lib/phone-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      phone: true,
      status: true,
    },
  });
  if (!user || user.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte indisponible" }, { status: 403 });
  }

  return NextResponse.json({
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    phoneMasked: user.phone ? maskAuthPhone(user.phone) : null,
    ready: Boolean(user.phone),
  });
}
