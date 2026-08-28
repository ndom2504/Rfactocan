import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";

export async function GET(request: Request) {
  const url = new URL("/google-app-return", getAppUrl());
  new URL(request.url).searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url);
}
