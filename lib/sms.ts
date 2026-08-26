/**
 * Twilio Verify (SMS OTP). No TWILIO_FROM — Verify owns the sender and the code.
 * Local/dev without credentials: caller may fall back to a console-logged code.
 */
import { toTwilioE164 } from "@/lib/phone-auth";

function twilioAuthHeader() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return null;
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

export function isSmsConfigured() {
  const service =
    process.env.TWILIO_VERIFY_SERVICE_SID?.trim() ||
    process.env.TWILIO_SERVICE_SID?.trim();
  return Boolean(twilioAuthHeader() && service);
}

function verifyServiceSid() {
  return (
    process.env.TWILIO_VERIFY_SERVICE_SID?.trim() ||
    process.env.TWILIO_SERVICE_SID?.trim() ||
    ""
  );
}

type TwilioResult =
  | { ok: true }
  | { ok: false; skipped: true }
  | { ok: false; skipped: false; error: string };

async function twilioForm(
  path: string,
  params: URLSearchParams
): Promise<TwilioResult & { status?: number; body?: string }> {
  const auth = twilioAuthHeader();
  const service = verifyServiceSid();
  if (!auth || !service) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, skipped: true };
    }
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${service}/${path}`,
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[sms] Twilio Verify error", res.status, text.slice(0, 400));
      let twilioCode: number | undefined;
      try {
        twilioCode = (JSON.parse(text) as { code?: number }).code;
      } catch {
        /* keep HTTP status only */
      }
      return {
        ok: false,
        skipped: false,
        error: twilioCode ? `TWILIO_${twilioCode}` : `TWILIO_${res.status}`,
        status: res.status,
        body: text,
      };
    }
    if (path === "Verifications") {
      console.info(
        "[sms] Twilio Verify started",
        params.get("To")?.replace(/\d(?=\d{2})/g, "•")
      );
    }
    return { ok: true, body: text };
  } catch (e) {
    console.error("[sms] Twilio Verify request failed", e);
    return {
      ok: false,
      skipped: false,
      error: e instanceof Error ? e.message : "SMS_SEND_FAILED",
    };
  }
}

/** Ask Twilio Verify to SMS a code to this E.164 number. */
export async function startPhoneVerification(
  toE164: string
): Promise<TwilioResult> {
  if (!isSmsConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, skipped: true };
    }
    console.warn(`[sms] Twilio Verify unset — would start SMS to ${toE164}`);
    return { ok: false, skipped: true };
  }

  const to = toTwilioE164(toE164);
  const params = new URLSearchParams();
  params.set("To", to);
  params.set("Channel", "sms");
  params.set("Locale", to.startsWith("+1") ? "en" : "fr");
  return twilioForm("Verifications", params);
}

/** Check the code Twilio Verify sent. */
export async function checkPhoneVerification(
  toE164: string,
  code: string
): Promise<
  | { ok: true }
  | { ok: false; skipped: true }
  | { ok: false; skipped: false; error: string }
> {
  if (!isSmsConfigured()) {
    return { ok: false, skipped: true };
  }

  const params = new URLSearchParams();
  params.set("To", toTwilioE164(toE164));
  params.set("Code", code);
  const result = await twilioForm("VerificationCheck", params);
  if (!result.ok) return result;

  try {
    const parsed = JSON.parse(result.body || "{}") as { status?: string };
    if (parsed.status === "approved") return { ok: true };
    return { ok: false, skipped: false, error: "INVALID_CODE" };
  } catch {
    return { ok: false, skipped: false, error: "INVALID_CODE" };
  }
}
