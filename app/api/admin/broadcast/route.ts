import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  emailAdminBroadcast,
  isEmailConfigured,
  personalizeBroadcastText,
} from "@/lib/email";
import { getOrCreateDirectThread } from "@/lib/dm";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const attachmentUrlSchema = z
  .string()
  .max(2000)
  .refine((value) => {
    if (value.startsWith("/api/media") || value.startsWith("/uploads/") || value.startsWith("/broadcast/")) {
      return true;
    }
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  });

const bodySchema = z.object({
  confirm: z.literal(true),
  subject: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(4000),
  sendEmail: z.boolean().optional().default(true),
  sendInbox: z.boolean().optional().default(true),
  attachmentUrl: attachmentUrlSchema.optional().nullable(),
  attachmentName: z.string().max(200).optional().nullable(),
});

/**
 * Admin broadcast: custom message to every active (non-suspended) user.
 * Channels: Resend email + DirectMessage (messagerie interne) + notification.
 */
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Données invalides." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const sendEmail = parsed.sendEmail !== false;
  const sendInbox = parsed.sendInbox !== false;
  if (!sendEmail && !sendInbox) {
    return NextResponse.json(
      { error: "Choisissez au moins un canal : e-mail ou messagerie interne." },
      { status: 400 }
    );
  }

  if (sendEmail && !isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY manquant. Configurez Resend sur Vercel pour envoyer des e-mails.",
      },
      { status: 503 }
    );
  }

  const users = await prisma.user.findMany({
    where: { status: { not: "SUSPENDED" } },
    select: {
      id: true,
      email: true,
      displayName: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const attachmentUrl = parsed.attachmentUrl?.trim() || null;
  const attachmentName = parsed.attachmentName?.trim() || null;

  let emailSent = 0;
  let emailFailed = 0;
  let inboxSent = 0;
  let inboxFailed = 0;
  const errors: string[] = [];

  for (const user of users) {
    const displayName = user.displayName?.trim() || "membre Rfacto";
    const subject = personalizeBroadcastText(parsed.subject, displayName);
    const text = personalizeBroadcastText(parsed.body, displayName);

    if (sendInbox && user.id !== admin.id) {
      try {
        const thread = await getOrCreateDirectThread({
          meId: admin.id,
          peerId: user.id,
        });
        const message = await prisma.directMessage.create({
          data: {
            threadId: thread.id,
            senderId: admin.id,
            body: text,
            attachmentUrl,
          },
        });
        await prisma.directThread.update({
          where: { id: thread.id },
          data: { lastMessageAt: message.createdAt },
        });
        await notifyUser({
          userId: user.id,
          type: "ADMIN_BROADCAST",
          title: subject,
          body: text.slice(0, 180),
          href: `/messages/dm/${thread.id}`,
        });
        inboxSent += 1;
      } catch (error) {
        inboxFailed += 1;
        if (errors.length < 10) {
          errors.push(
            `messagerie ${user.email}: ${
              error instanceof Error ? error.message : "échec"
            }`
          );
        }
      }
    }

    if (sendEmail) {
      const email = (user.email || "").trim().toLowerCase();
      if (!email.includes("@")) {
        emailFailed += 1;
        continue;
      }
      const result = await emailAdminBroadcast({
        email,
        displayName,
        subject: parsed.subject,
        body: parsed.body,
        attachmentUrl,
        attachmentName,
      });
      if (result.ok) {
        emailSent += 1;
      } else {
        emailFailed += 1;
        const detail =
          "skipped" in result && result.skipped
            ? result.reason
            : "error" in result
              ? result.error
              : "erreur inconnue";
        if (errors.length < 10) {
          errors.push(`${email}: ${detail}`);
        }
      }
      await sleep(350);
    }
  }

  return NextResponse.json({
    ok: emailFailed === 0 && inboxFailed === 0,
    total: users.length,
    emailSent,
    emailFailed,
    inboxSent,
    inboxFailed,
    errors: errors.length ? errors : undefined,
  });
}
