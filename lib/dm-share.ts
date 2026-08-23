const PLACEHOLDER_BODIES = new Set([
  "Pièce jointe",
  "Attachment",
  "📎",
  "Note vocale",
  "Voice note",
]);

export function dmShareCaption(body?: string | null): string | undefined {
  const text = (body ?? "").trim();
  if (!text || PLACEHOLDER_BODIES.has(text)) return undefined;
  return text;
}

export function dmAbsoluteMediaUrl(
  attachmentUrl?: string | null
): string | null {
  if (!attachmentUrl) return null;
  if (
    attachmentUrl.startsWith("http://") ||
    attachmentUrl.startsWith("https://")
  ) {
    return attachmentUrl;
  }
  if (typeof window === "undefined") return attachmentUrl;
  return new URL(attachmentUrl, window.location.origin).toString();
}

export function dmShareFileName(url: string, mime?: string): string {
  try {
    const parsed = new URL(
      url,
      typeof window !== "undefined" ? window.location.origin : "https://www.rfacto.com"
    );
    const blob = parsed.searchParams.get("url");
    const source = blob || parsed.pathname;
    const last = source.split("/").pop()?.split("?")[0];
    if (last && last.includes(".")) return last.slice(0, 80);
  } catch {
    /* ignore */
  }
  if (mime?.startsWith("audio/")) return "note-vocale.m4a";
  if (mime?.startsWith("image/")) {
    const ext = mime.split("/")[1]?.split("+")[0] || "jpg";
    return `image.${ext === "jpeg" ? "jpg" : ext}`;
  }
  if (mime === "application/pdf") return "document.pdf";
  if (mime?.startsWith("video/")) return "video.mp4";
  return "rfacto-fichier";
}

export type DmShareResult =
  | "shared"
  | "downloaded"
  | "cancelled"
  | "copied"
  | "failed";

function isAbort(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
}

/** Share a DM/In attachment (or text) to WhatsApp, Telegram, Contacts, etc. */
export async function shareDirectMessageContent(opts: {
  body?: string | null;
  attachmentUrl?: string | null;
}): Promise<DmShareResult> {
  const caption = dmShareCaption(opts.body);
  const abs = dmAbsoluteMediaUrl(opts.attachmentUrl);
  let file: File | undefined;

  if (abs) {
    try {
      const res = await fetch(abs, { credentials: "include" });
      if (!res.ok) throw new Error("fetch");
      const blob = await res.blob();
      const mime = blob.type || "application/octet-stream";
      file = new File([blob], dmShareFileName(abs, mime), { type: mime });
    } catch {
      return "failed";
    }
  }

  const nav = typeof navigator !== "undefined" ? navigator : undefined;

  if (file && nav?.share && nav.canShare) {
    try {
      const data: ShareData = { files: [file], title: "Rfacto" };
      if (caption) data.text = caption;
      if (nav.canShare(data)) {
        await nav.share(data);
        return "shared";
      }
    } catch (error) {
      if (isAbort(error)) return "cancelled";
    }
  }

  if (nav?.share && (caption || (!file && abs))) {
    try {
      await nav.share({
        title: "Rfacto",
        text: caption,
        url: abs ?? undefined,
      });
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
    }
  }

  if (file && typeof document !== "undefined") {
    const objectUrl = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = file.name;
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    return "downloaded";
  }

  if (caption) {
    try {
      await navigator.clipboard.writeText(caption);
      return "copied";
    } catch {
      return "failed";
    }
  }

  return "failed";
}

export function dmForwardPayload(opts: {
  body?: string | null;
  attachmentUrl?: string | null;
}): { body: string; attachmentUrl?: string } | null {
  const caption = (opts.body ?? "").trim();
  const attachmentUrl = opts.attachmentUrl?.trim() || undefined;
  if (!caption && !attachmentUrl) return null;
  return {
    body: caption || " ",
    ...(attachmentUrl ? { attachmentUrl } : {}),
  };
}
