import * as SecureStore from "expo-secure-store";

const KEY = "rfacto_video_favorites";
let cache: Set<string> | null = null;
const listeners = new Set<() => void>();

async function load(): Promise<Set<string>> {
  if (cache) return cache;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

async function persist() {
  if (!cache) return;
  await SecureStore.setItemAsync(KEY, JSON.stringify([...cache]));
  listeners.forEach((listener) => listener());
}

export async function isCommunityVideoFavorite(url: string) {
  const set = await load();
  return set.has(url);
}

export async function toggleCommunityVideoFavorite(url: string) {
  const set = await load();
  if (set.has(url)) set.delete(url);
  else set.add(url);
  await persist();
  return set.has(url);
}

export function subscribeCommunityVideoFavorites(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}
