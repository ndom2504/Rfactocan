import type { MemberStatusAuthor, MemberStatusItem } from "@/lib/member-status";

export type StoryFeedItem = {
  id: string;
  mediaUrl: string;
  mediaType?: string | null;
  caption?: string | null;
  viewCount?: number;
  createdAt?: string;
};

export type StoryFeed = {
  userId: string;
  mine: boolean;
  author?: MemberStatusAuthor;
  items: StoryFeedItem[];
  startIndex: number;
};

let feed: StoryFeed | null = null;

export function setStoryFeed(next: StoryFeed) {
  feed = next;
}

export function getStoryFeed() {
  return feed;
}

export function clearStoryFeed() {
  feed = null;
}

export function toStoryFeedItems(items: MemberStatusItem[]): StoryFeedItem[] {
  return items
    .filter((it) => Boolean(it.mediaUrl))
    .map((it) => ({
      id: it.id,
      mediaUrl: it.mediaUrl!,
      mediaType: it.mediaType,
      caption: it.caption,
      viewCount: it.viewCount,
      createdAt: it.createdAt,
    }));
}
