import type { CommunityPostKind } from "@prisma/client";
import {
  attachmentFromImageUrl,
  type CommunityAttachment,
} from "@/lib/community";
import { parseCommunityFeedId } from "@/lib/community-source";
import { toPublicMeetProfile } from "@/lib/meet";
import { prisma } from "@/lib/prisma";

export type ListingThread = {
  authorId: string;
  kind: CommunityPostKind;
  title: string;
  body: string;
  attachments: CommunityAttachment[];
  href: string;
};

export async function listingFromFeedId(
  source: ReturnType<typeof parseCommunityFeedId>
): Promise<ListingThread | null> {
  if (!source) return null;
  const { source: type, sourceId } = source;

  if (type === "service") {
    const s = await prisma.serviceListing.findFirst({
      where: { id: sourceId, status: "OPEN" },
      select: {
        userId: true,
        title: true,
        description: true,
        photosJson: true,
      },
    });
    if (!s) return null;
    let cover: string | null = null;
    try {
      const photos = JSON.parse(s.photosJson || "[]") as unknown;
      if (Array.isArray(photos) && typeof photos[0] === "string") {
        cover = photos[0];
      }
    } catch {
      /* ignore */
    }
    const attachment = attachmentFromImageUrl(cover, s.title);
    return {
      authorId: s.userId,
      kind: "BUSINESS",
      title: s.title,
      body: s.description,
      attachments: attachment ? [attachment] : [],
      href: `/services/listing/${sourceId}`,
    };
  }

  if (type === "shop") {
    const shop = await prisma.shop.findFirst({
      where: { id: sourceId, status: "OPEN" },
      select: {
        userId: true,
        name: true,
        description: true,
        coverUrl: true,
        logoUrl: true,
      },
    });
    if (!shop) return null;
    const cover = attachmentFromImageUrl(
      shop.coverUrl || shop.logoUrl,
      shop.name
    );
    return {
      authorId: shop.userId,
      kind: "BUSINESS",
      title: shop.name,
      body: shop.description?.trim() || shop.name,
      attachments: cover ? [cover] : [],
      href: `/shops/${sourceId}`,
    };
  }

  if (type === "trip") {
    const trip = await prisma.trip.findFirst({
      where: { id: sourceId, status: "OPEN" },
      select: {
        userId: true,
        fromCity: true,
        toCity: true,
        weightKg: true,
        departAt: true,
      },
    });
    if (!trip) return null;
    return {
      authorId: trip.userId,
      kind: "OPPORTUNITY",
      title: `${trip.fromCity} → ${trip.toCity}`,
      body:
        [
          trip.weightKg != null ? `Capacité ${trip.weightKg} kg` : null,
          trip.departAt
            ? `Départ ${new Date(trip.departAt).toLocaleDateString("fr-CA")}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Voyage publié sur Rfacto",
      attachments: [],
      href: `/trips/${sourceId}`,
    };
  }

  if (type === "parcel") {
    const req = await prisma.parcelRequest.findFirst({
      where: { id: sourceId, status: "OPEN", needType: "PARCEL" },
      select: {
        userId: true,
        fromCity: true,
        toCity: true,
        weightKg: true,
        description: true,
      },
    });
    if (!req) return null;
    return {
      authorId: req.userId,
      kind: "OPPORTUNITY",
      title: `${req.fromCity} → ${req.toCity}`,
      body: [
        req.weightKg ? `${req.weightKg} kg` : null,
        req.description?.slice(0, 280) || null,
      ]
        .filter(Boolean)
        .join(" · ") || "Besoin d’expédition",
      attachments: [],
      href: `/requests/${sourceId}`,
    };
  }

  if (type === "job") {
    const job = await prisma.parcelRequest.findFirst({
      where: { id: sourceId, status: "OPEN" },
      select: {
        userId: true,
        needType: true,
        jobTitle: true,
        jobSector: true,
        toCity: true,
        toCountry: true,
        description: true,
      },
    });
    if (!job) return null;
    const roleLabel =
      job.needType === "JOB_OFFER" ? "Offre d'emploi" : "Recherche d'emploi";
    const place = [job.toCity, job.toCountry].filter(Boolean).join(", ");
    return {
      authorId: job.userId,
      kind: "OPPORTUNITY",
      title: job.jobTitle?.trim() || roleLabel,
      body: [
        roleLabel,
        job.jobSector ? `Secteur : ${job.jobSector}` : null,
        place || null,
        job.description?.slice(0, 280) || null,
      ]
        .filter(Boolean)
        .join(" · "),
      attachments: [],
      href: `/requests/${sourceId}`,
    };
  }

  if (type !== "meet") return null;

  const profile = await prisma.meetProfile.findFirst({
    where: { id: sourceId, active: true },
    include: {
      user: { select: { id: true, displayName: true } },
    },
  });
  if (!profile) return null;
  const pub = toPublicMeetProfile(profile, {
    viewerId: profile.userId,
    matchScore: 0,
  });
  const place = [pub.city, pub.country].filter(Boolean).join(", ");
  const kindFr =
    profile.kind === "BUSINESS" ? "Rencontre affaires" : "Rencontre amour";
  return {
    authorId: profile.userId,
    kind: "COMMUNITY",
    title: pub.headline,
    body: [kindFr, place || null, pub.bio?.slice(0, 220)]
      .filter(Boolean)
      .join(" · "),
    attachments:
      pub.photoUrl && pub.photoVisible
        ? [
            {
              url: pub.photoUrl,
              name: "presentation",
              contentType: "image/jpeg",
              size: 0,
            },
          ]
        : [],
    href: `/meet/${profile.userId}`,
  };
}
