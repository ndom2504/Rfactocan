import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = new URL(request.url).searchParams.get("role") ?? "buyer";

  if (role === "seller") {
    const orders = await prisma.shopOrder.findMany({
      where: { shop: { userId: session.id } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        product: { select: { id: true, title: true, photoUrl: true } },
        shop: { select: { id: true, name: true } },
        buyer: { select: { id: true, displayName: true, email: true } },
      },
    });
    return NextResponse.json({ orders });
  }

  const orders = await prisma.shopOrder.findMany({
    where: { buyerId: session.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      product: { select: { id: true, title: true, photoUrl: true } },
      shop: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ orders });
}
