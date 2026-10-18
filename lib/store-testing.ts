import { isApplePlaceholderEmail } from "@/lib/apple-oauth";
import {
  emailAppTesterInvite,
  isEmailConfigured,
} from "@/lib/email";
import { isPhonePlaceholderEmail } from "@/lib/phone-auth";

export const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() ||
  "https://play.google.com/store/apps/details?id=com.rfacto.app";

export const PLAY_TESTING_URL =
  process.env.NEXT_PUBLIC_PLAY_TESTING_URL?.trim() || PLAY_STORE_URL;

export const TESTFLIGHT_URL =
  process.env.NEXT_PUBLIC_TESTFLIGHT_URL?.trim() ||
  "https://testflight.apple.com/join/PUTu9x4W";

export function iosTesterUrl() {
  return TESTFLIGHT_URL;
}

export function androidTesterUrl() {
  return PLAY_STORE_URL;
}

export function canEmailTester(email?: string | null) {
  const value = (email ?? "").trim().toLowerCase();
  if (!value.includes("@")) return false;
  if (isPhonePlaceholderEmail(value) || isApplePlaceholderEmail(value)) {
    return false;
  }
  return true;
}

/** Fire-and-forget: new members get iPhone TestFlight + Android Play links. */
export function queueTesterInvite(user: {
  email?: string | null;
  displayName?: string | null;
}) {
  if (!isEmailConfigured() || !canEmailTester(user.email)) return;
  void emailAppTesterInvite({
    email: user.email!.trim().toLowerCase(),
    displayName: user.displayName || "membre Rfacto",
    testingUrl: androidTesterUrl(),
    storeUrl: PLAY_STORE_URL,
    iosUrl: iosTesterUrl(),
  }).catch((error) => {
    console.error("[tester-invite]", error);
  });
}
