import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { blobAccess, isAllowedBlobUrl } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Serve private blobs with Accept-Ranges / partial responses so progressive
 * video (browser + Android MediaPlayer) can start without a full download.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url || !isAllowedBlobUrl(url)) {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  try {
    const range = request.headers.get("range") ?? undefined;
    const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;

    const result = await get(url, {
      access: blobAccess(),
      ifNoneMatch,
      ...(range ? { headers: { Range: range } } : {}),
    });

    if (!result) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Accept-Ranges": "bytes",
        },
      });
    }

    if (!result.stream) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }

    const contentType =
      result.blob.contentType ||
      result.headers.get("content-type") ||
      "application/octet-stream";

    const contentRange = result.headers.get("content-range");
    const contentLength =
      result.headers.get("content-length") ||
      (typeof result.blob.size === "number" && !contentRange
        ? String(result.blob.size)
        : null);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Accept-Ranges", "bytes");
    if (contentLength) headers.set("Content-Length", contentLength);
    if (contentRange) headers.set("Content-Range", contentRange);
    if (result.blob.etag) headers.set("ETag", result.blob.etag);

    const status = contentRange ? 206 : 200;
    return new NextResponse(result.stream, { status, headers });
  } catch (error) {
    console.error("Media proxy error:", error);
    return NextResponse.json(
      { error: "Impossible de charger le fichier" },
      { status: 500 }
    );
  }
}
