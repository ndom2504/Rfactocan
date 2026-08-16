import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  absoluteMediaUrl,
  communityOgImageUrl,
  communitySharePath,
  firstImageAttachment,
  shareExcerpt,
} from "@/lib/community-share";
import { isImageAttachment, parseAttachmentsJson } from "@/lib/community";
import { resolveSharePost } from "@/lib/og-share-image";
import { getAppUrl } from "@/lib/app-url";
import { getSessionUser } from "@/lib/auth";
import { FormattedDescription } from "@/components/formatted-description";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const post = await resolveSharePost(id);
  if (!post) {
    return {
      title: "Publication Rfacto",
      description: "Découvrez cette publication sur Rfacto.",
    };
  }

  const title = post.title?.trim() || shareExcerpt(post.body, 80);
  const description = shareExcerpt(post.body, 180);
  const url = `${getAppUrl()}${communitySharePath(post.id)}`;
  const ogImageUrl = communityOgImageUrl(post.id, post.updatedAt.getTime());
  const image = firstImageAttachment(post.attachmentsJson);
  const imageType =
    image?.contentType?.startsWith("image/") ? image.contentType : "image/jpeg";

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "Rfacto",
      title,
      description,
      locale: "fr_FR",
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl,
          type: imageType,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function CommunitySharePage({ params }: Params) {
  const { id } = await params;
  const post = await resolveSharePost(id);
  if (!post) notFound();

  const session = await getSessionUser();
  const attachments = parseAttachmentsJson(post.attachmentsJson);
  const images = attachments.filter((a) =>
    isImageAttachment(a.contentType, a.url || a.name)
  );
  const title = post.title?.trim() || null;
  const appHref = post.href || `/community/${post.id}`;

  return (
    <article className="mx-auto max-w-2xl space-y-5 px-4 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        Publication Rfacto
      </p>
      <div>
        <p className="font-semibold">{post.author.displayName}</p>
        {title && (
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--accent)]">
            {title}
          </h1>
        )}
        <FormattedDescription text={post.body} className="mt-3" />
      </div>

      {images.length > 0 && (
        <div className="space-y-2 overflow-hidden rounded-lg bg-[var(--surface-2)]">
          {images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${post.id}-share-${i}`}
              src={absoluteMediaUrl(img.url)}
              alt={img.name || title || "Publication"}
              className="block h-auto w-full"
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href={session ? appHref : "/login"}
          className="rounded-md bg-[var(--rfacto-green)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
        >
          {session ? "Ouvrir dans Rfacto" : "Se connecter pour commenter"}
        </Link>
        <Link
          href="/community"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-2)]"
        >
          Communauté
        </Link>
      </div>
    </article>
  );
}
