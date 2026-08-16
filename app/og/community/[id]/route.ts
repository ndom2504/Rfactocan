import { NextResponse } from "next/server";
import { loadShareOgImage } from "@/lib/og-share-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleaned = decodeURIComponent(id).replace(/\.jpe?g$/i, "");
  const image = await loadShareOgImage(cleaned);
  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
