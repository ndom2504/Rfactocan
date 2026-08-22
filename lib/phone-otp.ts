import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, hashOtpCode, MFA_MINUTES } from "@/lib/login-otp";
import { maskAuthPhone } from "@/lib/phone-auth";
import {
  checkPhoneVerification,
  isSmsConfigured,
  startPhoneVerification,
} from "@/lib/sms";

const OTP_MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const MAX_PER_PHONE_HOUR = 6;
/** Marker in PhoneOtp.codeHash when Twilio Verify holds the real code. */
const VERIFY_SENTINEL = hashOtpCode("twilio-verify");

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createPhoneOtpToken(phone: string) {
  return new SignJWT({ purpose: "phone_otp" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(phone)
    .setIssuedAt()
    .setExpirationTime(`${MFA_MINUTES}m`)
    .sign(getSecret());
}

export async function verifyPhoneOtpToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "phone_otp" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function issuePhoneOtp(phone: string): Promise<
  | { ok: true; mfaToken: string; phoneHint: string }
  | { ok: false; error: string; retryAfterSec?: number }
> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.phoneOtp.count({
    where: { phone, createdAt: { gt: hourAgo } },
  });
  if (recentCount >= MAX_PER_PHONE_HOUR) {
    return { ok: false, error: "RATE_LIMITED" };
  }

  const last = await prisma.phoneOtp.findFirst({
    where: { phone, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (last) {
    const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_SECONDS) {
      return {
        ok: false,
        error: "TOO_SOON",
        retryAfterSec: Math.ceil(RESEND_SECONDS - elapsed),
      };
    }
  }

  await prisma.phoneOtp.updateMany({
    where: { phone, usedAt: null },
    data: { usedAt: new Date() },
  });

  const useVerify = isSmsConfigured();
  if (!useVerify && process.env.NODE_ENV === "production") {
    return { ok: false, error: "SMS_NOT_CONFIGURED" };
  }

  const localCode = useVerify ? null : generateOtpCode();
  const expiresAt = new Date(Date.now() + MFA_MINUTES * 60 * 1000);

  if (useVerify) {
    const sent = await startPhoneVerification(phone);
    if (!sent.ok) {
      if ("skipped" in sent && sent.skipped) {
        return { ok: false, error: "SMS_NOT_CONFIGURED" };
      }
      if (sent.error === "TWILIO_21608") {
        return { ok: false, error: "SMS_TRIAL_UNVERIFIED" };
      }
      return { ok: false, error: "SMS_SEND_FAILED" };
    }
  }

  await prisma.phoneOtp.create({
    data: {
      phone,
      codeHash: localCode ? hashOtpCode(localCode) : VERIFY_SENTINEL,
      expiresAt,
    },
  });

  if (!useVerify) {
    console.warn(`[phone-otp] DEV code for ${phone}: ${localCode}`);
  }

  return {
    ok: true,
    mfaToken: await createPhoneOtpToken(phone),
    phoneHint: maskAuthPhone(phone),
  };
}

export async function consumePhoneOtp(
  phone: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{4,10}$/.test(normalized)) {
    return { ok: false, error: "INVALID_CODE" };
  }

  const otp = await prisma.phoneOtp.findFirst({
    where: {
      phone,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { ok: false, error: "CODE_EXPIRED" };

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.phoneOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });
    return { ok: false, error: "TOO_MANY_ATTEMPTS" };
  }

  const viaVerify = otp.codeHash === VERIFY_SENTINEL;
  if (viaVerify) {
    const checked = await checkPhoneVerification(phone, normalized);
    if (checked.ok) {
      await prisma.phoneOtp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
      return { ok: true };
    }
    await prisma.phoneOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    if ("skipped" in checked && checked.skipped) {
      return { ok: false, error: "SMS_NOT_CONFIGURED" };
    }
    const twilioErr = checked.error || "INVALID_CODE";
    if (twilioErr === "TWILIO_404") {
      return { ok: false, error: "CODE_EXPIRED" };
    }
    return { ok: false, error: "INVALID_CODE" };
  }

  if (otp.codeHash !== hashOtpCode(normalized)) {
    await prisma.phoneOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "INVALID_CODE" };
  }

  await prisma.phoneOtp.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });
  return { ok: true };
}

export { RESEND_SECONDS };
