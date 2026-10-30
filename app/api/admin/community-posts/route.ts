import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { moderateCommunityItem } from "@/lib/admin-community-moderation";
import { parseAttachmentsJson } from "@/lib/community";
import { prisma } from "@/lib/prisma";
import { publishVirtualCommunityPosts } from "@/lib/virtual-community-posts";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "").trim().toUpperCase();
  const take = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 40) || 40, 1),
    100
  );

  try {
    const posts = await prisma.communityPost.findMany({
      where: {
        ...(status === "OPEN" || status === "HIDDEN" || status === "REMOVED"
          ? { status: status as "OPEN" | "HIDDEN" | "REMOVED" }
          : {}),
      },
      include: {
        author: {
          select: { id: true, displayName: true, email: true },
        },
        _count: { select: { comments: true, reports: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    const [services, trips, parcels] = await Promise.all([
      prisma.serviceListing.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          title: true,
          description: true,
          city: true,
          country: true,
          createdAt: true,
          user: { select: { id: true, displayName: true, email: true } },
        },
      }),
      prisma.trip.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          fromCity: true,
          toCity: true,
          createdAt: true,
          user: { select: { id: true, displayName: true, email: true } },
        },
      }),
      prisma.parcelRequest.findMany({
        where: { status: "OPEN", needType: "PARCEL" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          fromCity: true,
          toCity: true,
          description: true,
          createdAt: true,
          user: { select: { id: true, displayName: true, email: true } },
        },
      }),
    ]);

    const listings = [
      ...services.map((s) => ({
        feedId: `svc:${s.id}`,
        kind: "SERVICE" as const,
        title: s.title,
        body: s.description.slice(0, 200),
        place: [s.city, s.country].filter(Boolean).join(", "),
        createdAt: s.createdAt,
        author: s.user,
      })),
      ...trips.map((t) => ({
        feedId: `trip:${t.id}`,
        kind: "TRIP" as const,
        title: `${t.fromCity} → ${t.toCity}`,
        body: "Voyage",
        place: `${t.fromCity} → ${t.toCity}`,
        createdAt: t.createdAt,
        author: t.user,
      })),
      ...parcels.map((p) => ({
        feedId: `parcel:${p.id}`,
        kind: "PARCEL" as const,
        title: `${p.fromCity} → ${p.toCity}`,
        body: (p.description || "Colis").slice(0, 200),
        place: `${p.fromCity} → ${p.toCity}`,
        createdAt: p.createdAt,
        author: p.user,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        kind: p.kind,
        title: p.title,
        body: p.body.slice(0, 280),
        status: p.status,
        sourceKey: p.sourceKey,
        createdAt: p.createdAt,
        viewCount: p.viewCount,
        commentCount: p._count.comments,
        reportCount: p._count.reports,
        attachments: parseAttachmentsJson(p.attachmentsJson),
        author: p.author,
      })),
      listings,
    });
  } catch (error) {
    console.error("Admin community posts failed:", error);
    return NextResponse.json(
      { error: "Publications indisponibles (table manquante ?)", posts: [], listings: [] },
      { status: 200 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = z
    .object({
      postId: z.string().min(1).optional(),
      feedId: z.string().min(1).optional(),
      status: z.enum(["OPEN", "HIDDEN", "REMOVED"]),
      publishVirtual: z.boolean().optional(),
    })
    .parse(await request.json());

  if (body.publishVirtual) {
    const result = await publishVirtualCommunityPosts(4);
    return NextResponse.json({ virtual: result });
  }

  if (!body.postId && !body.feedId) {
    return NextResponse.json(
      { error: "postId ou feedId requis" },
      { status: 400 }
    );
  }

  const result = await moderateCommunityItem({
    postId: body.postId,
    feedId: body.feedId,
    status: body.status,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const body = z
    .object({
      postId: z.string().min(1).optional(),
      feedId: z.string().min(1).optional(),
    })
    .parse(json);

  if (!body.postId && !body.feedId) {
    return NextResponse.json(
      { error: "postId ou feedId requis" },
      { status: 400 }
    );
  }

  const result = await moderateCommunityItem({
    postId: body.postId,
    feedId: body.feedId,
    status: "REMOVED",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}
