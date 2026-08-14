/**
 * Split plain text into text / URL / email / in-app path segments for rendering.
 */

export type LinkifyPart =
  | { type: "text"; value: string }
  | { type: "url"; value: string; href: string }
  | { type: "email"; value: string; href: string }
  | { type: "internal"; value: string; href: string };

const TOKEN_RE =
  /((?:https?:\/\/|www\.)[^\s<]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|(\/(?:services|shops|community|trips|requests|bookings|meet|projects|profile|dashboard)[^\s<]*)/gi;

const TRAILING_PUNCT_RE = /[.,;:!?)}\]'"»]+$/;

function stripTrailingPunct(raw: string) {
  const match = raw.match(TRAILING_PUNCT_RE);
  if (!match) return { core: raw, tail: "" };
  return { core: raw.slice(0, -match[0].length), tail: match[0] };
}

function toHref(raw: string): string {
  if (raw.startsWith("/")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  return `https://${raw}`;
}

export function splitLinkify(text: string): LinkifyPart[] {
  if (!text) return [];
  const parts: LinkifyPart[] = [];
  const re = new RegExp(TOKEN_RE.source, TOKEN_RE.flags);
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", value: text.slice(last, m.index) });
    }
    const raw = m[0];
    const { core, tail } = stripTrailingPunct(raw);
    if (!core) {
      parts.push({ type: "text", value: raw });
    } else if (m[2]) {
      parts.push({ type: "email", value: core, href: `mailto:${core}` });
    } else if (m[3] || core.startsWith("/")) {
      parts.push({ type: "internal", value: core, href: core });
    } else {
      parts.push({ type: "url", value: core, href: toHref(core) });
    }
    if (tail) parts.push({ type: "text", value: tail });
    last = m.index + raw.length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  return parts.length ? parts : [{ type: "text", value: text }];
}
