import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isExpoPushToken } from "@/lib/expo-push";
import { sendFcmToUsers } from "@/lib/fcm";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Send a test push to the signed-in user's registered devices (debug iOS). */
export async function POST() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const tokens = await prisma.deviceToken.findMany({
    where: { userId: session.id },
    select: { id: true, token: true, platform: true, updatedAt: true },
  });

  if (tokens.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Aucun jeton push enregistré. Ouvrez l’app iPhone, acceptez les notifications, puis réessayez.",
        tokens: [],
      },
      { status: 400 }
    );
  }

  const title = "Test Rfacto";
  const body = "Si vous voyez ceci, les notifications iPhone fonctionnent.";
  const result = await sendFcmToUsers({
    userIds: [session.id],
    title,
    body,
    data: { type: "PUSH_TEST", href: "/messages" },
  });

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    result,
    tokens: tokens.map((t) => ({
      platform: t.platform,
      expo: isExpoPushToken(t.token),
      preview: `${t.token.slice(0, 28)}…`,
      updatedAt: t.updatedAt,
    })),
    hint:
      result.sent === 0
        ? "Aucun push envoyé. Vérifiez qu’un ExponentPushToken est enregistré et qu’une Apple Push Key est configurée dans EAS (eas credentials)."
        : "Push accepté par Expo/FCM. Si rien n’apparaît sur l’iPhone : Réglages → Rfacto → Notifications activées, et Apple Push Key valide dans EAS.",
  });
}
