/** Shared DM media detection (web + helpers). Blob URLs often omit extensions. */

export function isOpaqueBlobFileName(name?: string | null) {
  const n = (name || "").trim();
  if (n.length < 24 || /[\s/\\]/.test(n)) return false;
  if (
    /\.(jpe?g|png|gif|webp|heic|heif|pdf|mp4|mov|webm|m4v|mkv|m4a|aac|mp3|ogg|wav)$/i.test(
      n
    )
  ) {
    return false;
  }
  return !n.includes(".") || /^[a-z0-9]{20,}[-_].+/i.test(n);
}

function mediaHaystack(url: string) {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

function pathSegment(url: string) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split("/").pop() || "");
    const nested = u.searchParams.get("url");
    if (nested) {
      try {
        return (
          decodeURIComponent(new URL(nested).pathname.split("/").pop() || "") ||
          last
        );
      } catch {
        return last;
      }
    }
    return last;
  } catch {
    try {
      return decodeURIComponent(url.split("?")[0].split("/").pop() || "");
    } catch {
      return "";
    }
  }
}

export function isDmPdfUrl(url?: string | null) {
  if (!url) return false;
  return /\.pdf(\?|#|$)/i.test(mediaHaystack(url));
}

export function isDmImageUrl(url?: string | null) {
  if (!url) return false;
  const hay = mediaHaystack(url);
  if (/\.(m4a|aac|mp3|ogg|oga|wav|amr|3gpp|weba|mp4|webm|mov|pdf)(\?|#|$)/i.test(hay)) {
    return false;
  }
  return /\.(jpe?g|png|gif|webp|heic|heif)(\?|#|$)/i.test(hay);
}

export function isDmVideoUrl(url?: string | null, body?: string | null) {
  if (body?.includes("🎥") || /\[video\]/i.test(body || "")) return true;
  if (!url) return false;
  const hay = mediaHaystack(url);
  if (/\.(mp4|mov|webm|m4v|mkv)(\?|#|$)/i.test(hay)) return true;
  if (isDmImageUrl(url) || isDmPdfUrl(url)) return false;
  return isOpaqueBlobFileName(pathSegment(url));
}
