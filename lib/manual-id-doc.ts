import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { fetchPrivateBlob, isAllowedBlobUrl } from "@/lib/storage";

/** Stream a stored manual ID document (private blob or local path). */
export async function streamStoredIdDoc(storedUrl: string) {
  if (isAllowedBlobUrl(storedUrl)) {
    const result = await fetchPrivateBlob(storedUrl);
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }
    const headers = new Headers();
    headers.set(
      "Content-Type",
      result.blob.contentType || "application/octet-stream"
    );
    headers.set("Cache-Control", "private, no-store");
    return new NextResponse(result.stream, { status: 200, headers });
  }

  if (storedUrl.startsWith("/api/media?")) {
    const u = new URL(storedUrl, "http://local");
    const blob = u.searchParams.get("url");
    if (blob && isAllowedBlobUrl(blob)) {
      return streamStoredIdDoc(blob);
    }
  }

  if (
    !storedUrl.startsWith("/id-docs/") &&
    !storedUrl.startsWith("/uploads/")
  ) {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    storedUrl.replace(/^\//, "")
  );
  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === ".pdf"
      ? "application/pdf"
      : ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";

  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;
  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
