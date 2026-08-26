import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toPublicMeetProfile } from "@/lib/meet";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { userId } = await params;

  try {
    const profile = await prisma.meetProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            kycStatus: true,
            ratingAvg: true,
            ratingCount: true,
            status: true,
          },
        },
      },
    });

    if (!profile || profile.user.status === "SUSPENDED") {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }
    if (!profile.active && profile.userId !== session.id) {
      return NextResponse.json({ error: "Profil masqué" }, { status: 404 });
    }

    const pub = toPublicMeetProfile(profile, { viewerId: session.id });

    let contactStatus: string | null = null;
    let contactId: string | null = null;
    let threadId: string | null = null;
    if (userId !== session.id) {
      const [sent, received] = await Promise.all([
        prisma.meetContact.findUnique({
          where: {
            fromUserId_toUserId: {
              fromUserId: session.id,
              toUserId: userId,
            },
          },
        }),
        prisma.meetContact.findUnique({
          where: {
            fromUserId_toUserId: {
              fromUserId: userId,
              toUserId: session.id,
            },
          },
        }),
      ]);
      if (sent?.status === "ACCEPTED" || received?.status === "ACCEPTED") {
        contactStatus = "ACCEPTED";
        contactId = sent?.id ?? received?.id ?? null;
        const [low, high] =
          session.id < userId ? [session.id, userId] : [userId, session.id];
        const thread = await prisma.directThread.findUnique({
          where: {
            userLowId_userHighId_channel: {
              userLowId: low,
              userHighId: high,
              channel: "APP",
            },
          },
        });
        threadId = thread?.id ?? null;
      } else if (sent?.status === "PENDING") {
        contactStatus = "SENT";
        contactId = sent.id;
      } else if (received?.status === "PENDING") {
        contactStatus = "INCOMING";
        contactId = received.id;
      }
    }

    const showUserAvatar =
      profile.userId === session.id || profile.photoVisible
        ? profile.photoUrl || profile.user.avatarUrl
        : null;

    return NextResponse.json({
      profile: pub,
      user: {
        id: profile.user.id,
        displayName: profile.user.displayName,
        avatarUrl: showUserAvatar,
        verified: profile.user.kycStatus === "VERIFIED",
        ratingAvg: profile.user.ratingAvg,
        ratingCount: profile.user.ratingCount,
      },
      contactStatus,
      contactId,
      threadId,
      canContact: Boolean(
        (await prisma.meetProfile.findUnique({
          where: { userId: session.id },
          select: { active: true },
        }))?.active
      ),
    });
  } catch (error) {
    console.error("Meet profile view failed:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
