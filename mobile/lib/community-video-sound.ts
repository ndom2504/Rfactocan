import { useSyncExternalStore } from "react";

let muted = true;
let reelOpen = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getCommunityVideoMuted() {
  return muted;
}

export function setCommunityVideoMuted(next: boolean) {
  if (muted === next) return;
  muted = next;
  emit();
}

export function getCommunityVideoReelOpen() {
  return reelOpen;
}

export function setCommunityVideoReelOpen(open: boolean) {
  if (reelOpen === open) return;
  reelOpen = open;
  emit();
}

export function toggleCommunityVideoMuted() {
  setCommunityVideoMuted(!muted);
}

export function subscribeCommunityVideoMuted(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function useCommunityVideoMuted() {
  return useSyncExternalStore(
    subscribeCommunityVideoMuted,
    getCommunityVideoMuted,
    getCommunityVideoMuted
  );
}

export function useCommunityVideoReelOpen() {
  return useSyncExternalStore(
    subscribeCommunityVideoMuted,
    getCommunityVideoReelOpen,
    getCommunityVideoReelOpen
  );
}
