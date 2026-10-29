import type { CommunityPost } from "@/lib/community";
import { attachmentIsVideo } from "@/lib/community";
import { mediaUrl } from "@/lib/api";

export type CommunityFeedVideo = {
  url: string;
  authorName: string;
  caption: string;
  postId: string;
};

let queue: CommunityFeedVideo[] = [];
let startIndex = 0;

export function collectCommunityVideos(posts: CommunityPost[]): CommunityFeedVideo[] {
  const out: CommunityFeedVideo[] = [];
  const seen = new Set<string>();
  for (const post of posts) {
    for (const att of post.attachments ?? []) {
      if (!attachmentIsVideo(att)) continue;
      const url = mediaUrl(att.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        authorName: post.author?.displayName || "",
        caption: (post.title || post.body || "").trim().slice(0, 140),
        postId: post.id,
      });
    }
  }
  return out;
}

export function setCommunityVideoFeed(videos: CommunityFeedVideo[], startUrl: string) {
  queue = videos;
  const idx = videos.findIndex((v) => v.url === startUrl);
  startIndex = idx >= 0 ? idx : 0;
}

export function getCommunityVideoFeed() {
  return { videos: queue, startIndex };
}
