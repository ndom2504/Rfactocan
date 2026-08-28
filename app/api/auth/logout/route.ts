import { NextResponse } from "next/server";
import { COOKIE_NAME, clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}
