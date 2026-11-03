export type ParsedChatReply = {
  quoteId: string | null;
  quoteName: string | null;
  quoteExcerpt: string | null;
  body: string;
};

const HEADER =
  /^(?:⟦|\[)\s*rf?-reply(?:\|([^\n⟧\]]*))?(?:⟧|\])?\s*(?:\n([\s\S]*))?$/i;

export function parseChatReply(raw?: string | null): ParsedChatReply {
  const text = raw || "";
  const match = HEADER.exec(text.trim());
  if (!match) {
    return { quoteId: null, quoteName: null, quoteExcerpt: null, body: text };
  }
  const inner = match[1] || "";
  const rest = match[2] || "";
  const parts = inner.split("|");
  let name = parts[1]?.trim() || null;
  let excerpt = parts.slice(2).join("|").trim() || null;
  let body = rest.trim();
  if (!name && rest.includes("|")) {
    const line = rest.split("\n")[0] || "";
    const split = line.split("|");
    name = split[0]?.trim() || null;
    excerpt = split.slice(1).join("|").trim() || null;
    body = rest.split("\n").slice(1).join("\n").trim();
  }
  return {
    quoteId: parts[0]?.trim() || null,
    quoteName: name,
    quoteExcerpt: excerpt,
    body,
  };
}

function clip(text: string) {
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function chatReplyListPreview(
  body?: string | null,
  attachmentUrl?: string | null,
  empty = ""
) {
  const parsed = parseChatReply(body);
  const text = parsed.body.trim();
  if (text && !/rf?-reply/i.test(text)) return clip(text);
  const stripped = (body || "")
    .split("\n")
    .filter((line) => !/rf?-reply/i.test(line))
    .join("\n")
    .trim();
  if (stripped && !/rf?-reply/i.test(stripped)) return clip(stripped);
  if (attachmentUrl) return "📎";
  if (parsed.quoteExcerpt?.trim()) return clip(parsed.quoteExcerpt.trim());
  return empty;
}

function looksLikeReplyMarkup(text: string) {
  return /rf?-reply|⟦|⟧/i.test(text) || /^cm[a-z0-9]{18,}/i.test(text.trim());
}

/** Human text for a push or in-app notification. Never the swipe-reply marker. */
export function messageNotificationText(
  body?: string | null,
  attachmentUrl?: string | null,
  fallback = "Nouveau message"
) {
  const preview = chatReplyListPreview(body, attachmentUrl, "")
    .replace(/\s+/g, " ")
    .trim();
  if (preview === "📎" || preview === "🎥") return "Pièce jointe";
  if (preview && !looksLikeReplyMarkup(preview)) return preview.slice(0, 140);
  const cleaned = (body || "")
    .split("\n")
    .map((line) => line.replace(/⟦|⟧|\[|\]/g, "").trim())
    .filter((line) => line && !looksLikeReplyMarkup(line) && !line.includes("|"))
    .join(" ")
    .trim();
  if (cleaned) return cleaned.slice(0, 140);
  if (attachmentUrl) return "Pièce jointe";
  return fallback;
}
