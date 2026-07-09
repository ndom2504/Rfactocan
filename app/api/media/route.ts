import { NextResponse } from "next/server";
import { fetchPrivateBlob, isAllowedBlobUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url || !isAllowedBlobUrl(url)) {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  try {
    const result = await fetchPrivateBlob(url);
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      result.blob.contentType || "application/octet-stream"
    );
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(result.stream, { status: 200, headers });
  } catch (error) {
    console.error("Media proxy error:", error);
    return NextResponse.json(
      { error: "Impossible de charger le fichier" },
      { status: 500 }
    );
  }
}
