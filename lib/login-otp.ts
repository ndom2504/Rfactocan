import { createHash, randomInt } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { emailLoginOtp, getEmailFromAddress, isEmailConfigured, isUsingResendTestSender } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

const MFA_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function hashOtpCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export async function createMfaToken(userId: string) {
  return new SignJWT({ purpose: "login_otp" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MFA_MINUTES}m`)
    .sign(getSecret());
}

export async function verifyMfaToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "login_otp" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

/**
 * Invalidate previous codes, create a new OTP, email it.
 * Returns false if email could not be sent.
 */
export async function issueLoginOtp(
  user: Pick<User, "id" | "email" | "displayName">
): Promise<
  | { ok: true }
  | { ok: false; error: string; detail?: string; from?: string }
> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "EMAIL_NOT_CONFIGURED" };
  }

  await prisma.loginOtp.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + MFA_MINUTES * 60 * 1000);

  await prisma.loginOtp.create({
    data: {
      userId: user.id,
      codeHash: hashOtpCode(code),
      expiresAt,
    },
  });

  const result = await emailLoginOtp({
    email: user.email,
    displayName: user.displayName,
    code,
    minutes: MFA_MINUTES,
  });

  const from = getEmailFromAddress();

  if (!result.ok) {
    if ("skipped" in result && result.skipped) {
      return { ok: false, error: "EMAIL_NOT_CONFIGURED", from };
    }
    if ("code" in result && result.code === "DOMAIN_NOT_VERIFIED") {
      return {
        ok: false,
        error: "DOMAIN_NOT_VERIFIED",
        detail: result.error,
        from,
      };
    }
    return {
      ok: false,
      error: "EMAIL_SEND_FAILED",
      detail: "error" in result ? result.error : undefined,
      from,
    };
  }

  return { ok: true };
}

/**
 * Start email OTP when Resend is configured.
 * Returns `skipped` if email is not configured (caller may issue session directly).
 */
export async function startEmailOtpChallenge(
  user: Pick<User, "id" | "email" | "displayName">
): Promise<
  | { ok: true; mfaToken: string; emailHint: string }
  | { ok: false; skipped: true }
  | {
      ok: false;
      skipped: false;
      error: string;
      detail?: string;
      from?: string;
    }
> {
  if (!isEmailConfigured()) {
    return { ok: false, skipped: true };
  }

  // Fail fast with a clear signal if still on Resend sandbox sender.
  if (isUsingResendTestSender()) {
    return {
      ok: false,
      skipped: false,
      error: "DOMAIN_NOT_VERIFIED",
      detail:
        "EMAIL_FROM utilise encore onboarding@resend.dev. Sur Vercel, mettez Rfacto <noreply@rfacto.com> (Production) puis Redeploy.",
      from: getEmailFromAddress(),
    };
  }

  const issued = await issueLoginOtp(user);
  if (!issued.ok) {
    return {
      ok: false,
      skipped: false,
      error: issued.error,
      detail: issued.detail,
      from: issued.from,
    };
  }

  const mfaToken = await createMfaToken(user.id);
  return {
    ok: true,
    mfaToken,
    emailHint: maskEmail(user.email),
  };
}

export async function consumeLoginOtp(
  userId: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return { ok: false, error: "INVALID_CODE" };
  }

  const otp = await prisma.loginOtp.findFirst({
    where: {
      userId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { ok: false, error: "CODE_EXPIRED" };
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.loginOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });
    return { ok: false, error: "TOO_MANY_ATTEMPTS" };
  }

  const match = otp.codeHash === hashOtpCode(normalized);
  if (!match) {
    await prisma.loginOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "INVALID_CODE" };
  }

  await prisma.loginOtp.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  return { ok: true };
}

export { MFA_MINUTES };
