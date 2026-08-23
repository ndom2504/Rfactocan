import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { guessVoiceNoteMime, isAudioAttachment } from "@/lib/community";
import { blobAccess, isAllowedBlobUrl } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Serve private blobs with Accept-Ranges / partial responses so progressive
 * video (browser + Android MediaPlayer) can start without a full download.
 *
 * Audio must not use Range: Next/Vercel rewrites 206 → 200, so Chrome's
 * 2-byte probe becomes the whole file and <audio> stays at 0:00.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url || !isAllowedBlobUrl(url)) {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  try {
    const requestedRange = request.headers.get("range") ?? undefined;
    const ifNoneMatch = request.headers.get("if-none-match") ?? undefined;
    const access = blobAccess();
    let useRange = Boolean(requestedRange) && !isAudioAttachment("", url);

    const fetchBlob = (range?: string) =>
      get(url, {
        access,
        ifNoneMatch,
        ...(range ? { headers: { Range: range } } : {}),
      });

    let result = await fetchBlob(useRange ? requestedRange : undefined);

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

    const rawType =
      result.blob.contentType ||
      result.headers.get("content-type") ||
      "application/octet-stream";
    const audio = isAudioAttachment(rawType, url);

    if (audio && useRange) {
      result = await fetchBlob(undefined);
      useRange = false;
    }

    if (!result?.stream) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }

    const contentType = audio ? guessVoiceNoteMime(url, rawType) : rawType;
    const contentRange = useRange ? result.headers.get("content-range") : null;
    const contentLength =
      result.headers.get("content-length") ||
      (typeof result.blob.size === "number" && !contentRange
        ? String(result.blob.size)
        : null);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Accept-Ranges", audio ? "none" : "bytes");
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
