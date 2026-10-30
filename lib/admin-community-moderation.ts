import {
  communitySourceKey,
  parseCommunityFeedId,
  type CommunityFeedSource,
} from "@/lib/community-source";
import { prisma } from "@/lib/prisma";

type PostStatus = "OPEN" | "HIDDEN" | "REMOVED";

async function closeListing(
  source: CommunityFeedSource,
  sourceId: string
): Promise<boolean> {
  switch (source) {
    case "service": {
      const row = await prisma.serviceListing.updateMany({
        where: { id: sourceId },
        data: { status: "CLOSED" },
      });
      return row.count > 0;
    }
    case "trip": {
      const row = await prisma.trip.updateMany({
        where: { id: sourceId },
        data: { status: "CANCELLED" },
      });
      return row.count > 0;
    }
    case "parcel": {
      const row = await prisma.parcelRequest.updateMany({
        where: { id: sourceId },
        data: { status: "CANCELLED" },
      });
      return row.count > 0;
    }
    case "shop": {
      const row = await prisma.shop.updateMany({
        where: { id: sourceId },
        data: { status: "CLOSED" },
      });
      return row.count > 0;
    }
    default:
      return false;
  }
}

async function reopenListing(
  source: CommunityFeedSource,
  sourceId: string
): Promise<boolean> {
  switch (source) {
    case "service": {
      const row = await prisma.serviceListing.updateMany({
        where: { id: sourceId },
        data: { status: "OPEN" },
      });
      return row.count > 0;
    }
    case "trip": {
      const row = await prisma.trip.updateMany({
        where: { id: sourceId },
        data: { status: "OPEN" },
      });
      return row.count > 0;
    }
    case "parcel": {
      const row = await prisma.parcelRequest.updateMany({
        where: { id: sourceId },
        data: { status: "OPEN" },
      });
      return row.count > 0;
    }
    case "shop": {
      const row = await prisma.shop.updateMany({
        where: { id: sourceId },
        data: { status: "OPEN" },
      });
      return row.count > 0;
    }
    default:
      return false;
  }
}

function parseSourceKey(sourceKey: string | null | undefined) {
  if (!sourceKey || sourceKey.startsWith("virtual:")) return null;
  const asFeedId = sourceKey.startsWith("service:")
    ? `svc:${sourceKey.slice("service:".length)}`
    : sourceKey;
  return parseCommunityFeedId(asFeedId);
}

/**
 * Retire une publication native ou une annonce du fil (service/voyage/colis…).
 * Les posts HIDDEN/REMOVED sortent du feed ; les listings passent CLOSED/CANCELLED.
 */
export async function moderateCommunityItem(input: {
  postId?: string;
  feedId?: string;
  status: PostStatus;
}) {
  const status = input.status;
  let postId = input.postId?.trim() || "";
  let feedId = input.feedId?.trim() || "";
  let listingClosed = false;
  let postUpdated = false;

  if (feedId) {
    const parsed = parseCommunityFeedId(feedId);
    if (parsed) {
      if (status === "OPEN") {
        listingClosed = await reopenListing(parsed.source, parsed.sourceId);
      } else {
        listingClosed = await closeListing(parsed.source, parsed.sourceId);
      }
      const key = communitySourceKey(parsed.source, parsed.sourceId);
      const linked = await prisma.communityPost.findUnique({
        where: { sourceKey: key },
        select: { id: true },
      });
      if (linked) {
        await prisma.communityPost.update({
          where: { id: linked.id },
          data: { status },
        });
        postId = linked.id;
        postUpdated = true;
      }
      return {
        ok: true as const,
        postId: postId || null,
        feedId,
        listingClosed,
        postUpdated,
        status,
      };
    }
    // Native cuid passed as feedId
    postId = feedId;
    feedId = "";
  }

  if (!postId) {
    return { ok: false as const, error: "Identifiant manquant" };
  }

  const existing = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, sourceKey: true },
  });
  if (!existing) {
    return { ok: false as const, error: "Publication introuvable" };
  }

  await prisma.communityPost.update({
    where: { id: postId },
    data: { status },
  });
  postUpdated = true;

  const linked = parseSourceKey(existing.sourceKey);
  if (linked) {
    if (status === "OPEN") {
      listingClosed = await reopenListing(linked.source, linked.sourceId);
    } else {
      listingClosed = await closeListing(linked.source, linked.sourceId);
    }
    feedId = `${linked.source === "service" ? "svc" : linked.source}:${linked.sourceId}`;
  }

  return {
    ok: true as const,
    postId,
    feedId: feedId || null,
    listingClosed,
    postUpdated,
    status,
  };
}
