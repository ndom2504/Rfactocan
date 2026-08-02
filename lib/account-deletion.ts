import { prisma } from "@/lib/prisma";

const BLOCKING_BOOKING_STATUSES = [
  "PROPOSED",
  "AWAITING_PAYMENT",
  "ACCEPTED",
  "HANDED_OVER",
  "IN_TRANSIT",
] as const;

/**
 * Anonymize and suspend a user account (GDPR-style soft delete).
 * Blocks if the user still has active bookings or open disputes.
 */
export async function deleteUserAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, email: true },
  });
  if (!user) return { error: "NOT_FOUND" as const };
  if (user.role === "ADMIN") return { error: "ADMIN_FORBIDDEN" as const };
  if (user.status === "SUSPENDED") return { error: "ALREADY_DELETED" as const };

  const [activeAsSender, activeAsTraveler, openDisputes] = await Promise.all([
    prisma.booking.count({
      where: {
        senderId: userId,
        status: { in: [...BLOCKING_BOOKING_STATUSES] },
      },
    }),
    prisma.booking.count({
      where: {
        trip: { userId },
        status: { in: [...BLOCKING_BOOKING_STATUSES] },
      },
    }),
    prisma.dispute.count({
      where: {
        status: { in: ["OPEN", "IN_REVIEW"] },
        OR: [{ openedById: userId }, { againstUserId: userId }],
      },
    }),
  ]);

  if (activeAsSender + activeAsTraveler > 0) {
    return { error: "ACTIVE_BOOKINGS" as const };
  }
  if (openDisputes > 0) {
    return { error: "OPEN_DISPUTES" as const };
  }

  const stamp = Date.now().toString(36);
  const anonymizedEmail = `deleted+${userId.slice(0, 8)}.${stamp}@deleted.rfacto.invalid`;

  await prisma.$transaction([
    prisma.deviceToken.deleteMany({ where: { userId } }),
    prisma.loginOtp.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.userConnection.deleteMany({
      where: { OR: [{ followerId: userId }, { followingId: userId }] },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "SUSPENDED",
        email: anonymizedEmail,
        passwordHash: null,
        googleId: null,
        displayName: "Compte supprimé",
        avatarUrl: null,
        bannerUrl: null,
        bio: null,
        phone: null,
        country: null,
        stripeCustomerId: null,
        stripeConnectAccountId: null,
        stripeConnectChargesEnabled: false,
        stripeConnectPayoutsEnabled: false,
        kycSessionId: null,
        manualIdDocUrl: null,
        manualIdDocStatus: "NONE",
        manualIdDocNote: null,
        lastLat: null,
        lastLng: null,
        lastLocationAt: null,
        nearbyAlertsEnabled: false,
        isAmbassador: false,
        agentCode: null,
        ambassadorRequestStatus: "NONE",
        ambassadorWhatsapp: null,
        publicationCharterAcceptedAt: null,
      },
    }),
  ]);

  return { ok: true as const };
}
