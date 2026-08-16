import { get } from "@vercel/blob";
import { readFile } from "fs/promises";
import path from "path";
import { listingFromFeedId } from "@/lib/community-listing-thread";
import {
  firstImageAttachment,
  type SharePostView,
} from "@/lib/community-share";
import {
  communitySourceKey,
  parseCommunityFeedId,
} from "@/lib/community-source";
import { prisma } from "@/lib/prisma";
import { blobAccess, isAllowedBlobUrl } from "@/lib/storage";
import { getAppUrl } from "@/lib/app-url";
import { guessImageContentType } from "@/lib/community";

const FALLBACK_OG = path.join(process.cwd(), "public", "og-communaute.jpg");

export type OgImageBytes = {
  bytes: Buffer;
  contentType: string;
};

function unwrapStoredMediaUrl(stored: string): string {
  const trimmed = stored.trim();
  try {
    if (trimmed.includes("/api/media")) {
      const abs = trimmed.startsWith("http")
        ? new URL(trimmed)
        : new URL(trimmed, "https://www.rfacto.com");
      const inner = abs.searchParams.get("url");
      if (inner) return inner;
    }
  } catch {
    /* keep original */
  }
  return trimmed;
}

function sniffImageType(bytes: Buffer, fallbackUrl: string): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 6 && bytes.toString("ascii", 0, 3) === "GIF") {
    return "image/gif";
  }
  if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(fallbackUrl)) {
    return guessImageContentType(fallbackUrl);
  }
  return null;
}

async function streamToBuffer(
  stream: ReadableStream | NodeJS.ReadableStream | null | undefined
): Promise<Buffer | null> {
  if (!stream) return null;
  if (typeof (stream as ReadableStream).getReader === "function") {
    return Buffer.from(
      await new Response(stream as ReadableStream).arrayBuffer()
    );
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream as NodeJS.ReadableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function fetchHttpImage(url: string): Promise<OgImageBytes | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  const headerType = (res.headers.get("content-type") || "")
    .split(";")[0]
    ?.trim();
  const sniffed =
    sniffImageType(bytes, url) ||
    (headerType.startsWith("image/") ? headerType : null);
  if (!sniffed) return null;
  return { bytes, contentType: sniffed };
}

async function fetchImageBytes(storedUrl: string): Promise<OgImageBytes | null> {
  const unwrapped = unwrapStoredMediaUrl(storedUrl);

  try {
    if (isAllowedBlobUrl(unwrapped)) {
      try {
        const result = await get(unwrapped, { access: blobAccess() });
        if (result?.stream) {
          const bytes = await streamToBuffer(result.stream);
          const sniffed = bytes ? sniffImageType(bytes, unwrapped) : null;
          if (bytes && sniffed) return { bytes, contentType: sniffed };
        }
      } catch {
        /* public blob URLs can be fetched directly */
      }
      return fetchHttpImage(unwrapped);
    }

    if (unwrapped.startsWith("/") && !unwrapped.startsWith("/api/")) {
      const publicFile = path.join(
        process.cwd(),
        "public",
        unwrapped.replace(/^\/+/, "")
      );
      const bytes = await readFile(publicFile);
      const sniffed = sniffImageType(bytes, unwrapped);
      if (!sniffed) return null;
      return { bytes, contentType: sniffed };
    }

    const abs = unwrapped.startsWith("http")
      ? unwrapped
      : `${getAppUrl()}${unwrapped.startsWith("/") ? "" : "/"}${unwrapped}`;
    return fetchHttpImage(abs);
  } catch {
    return null;
  }
}

async function postToShareView(post: {
  id: string;
  title: string | null;
  body: string;
  attachmentsJson: string;
  updatedAt: Date;
  author: { displayName: string; avatarUrl: string | null };
}): Promise<SharePostView> {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    attachmentsJson: post.attachmentsJson,
    updatedAt: post.updatedAt,
    href: `/community/${post.id}`,
    author: post.author,
  };
}

export async function resolveSharePost(
  rawId: string
): Promise<SharePostView | null> {
  const id = decodeURIComponent(rawId || "").trim();
  if (!id) return null;

  const authorSelect = { displayName: true, avatarUrl: true } as const;

  try {
    const byId = await prisma.communityPost.findFirst({
      where: { id, status: "OPEN" },
      include: { author: { select: authorSelect } },
    });
    if (byId) return postToShareView(byId);
  } catch {
    /* column missing or invalid id */
  }

  const feed = parseCommunityFeedId(id);
  if (feed) {
    const sourceKey = communitySourceKey(feed.source, feed.sourceId);
    try {
      const byKey = await prisma.communityPost.findFirst({
        where: { sourceKey, status: "OPEN" },
        include: { author: { select: authorSelect } },
      });
      if (byKey) return postToShareView(byKey);
    } catch {
      /* sourceKey column may be missing */
    }

    const listing = await listingFromFeedId(feed);
    if (!listing) return null;
    const author = await prisma.user.findUnique({
      where: { id: listing.authorId },
      select: authorSelect,
    });
    return {
      id,
      title: listing.title,
      body: listing.body,
      attachmentsJson: JSON.stringify(listing.attachments),
      updatedAt: new Date(),
      href: listing.href,
      author: {
        displayName: author?.displayName || "Rfacto",
        avatarUrl: author?.avatarUrl ?? null,
      },
    };
  }

  return null;
}

export async function loadShareOgImage(rawId: string): Promise<OgImageBytes> {
  const post = await resolveSharePost(rawId);
  const image = post ? firstImageAttachment(post.attachmentsJson) : null;
  if (image) {
    const loaded = await fetchImageBytes(image.url);
    if (loaded) return loaded;
  }

  const fallback = await readFile(FALLBACK_OG);
  return { bytes: fallback, contentType: "image/jpeg" };
}
