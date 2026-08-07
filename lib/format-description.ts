/**
 * Lightweight paste-friendly text structure for product/service descriptions.
 * Preserves blank lines, bullets (- * •), and numbered lists (1. 2)).
 */

export type DescriptionBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

const BULLET_RE = /^[\t \u00a0]*([•●○▪▸►·]|[-–—*])\s+(.*)$/;
const NUMBERED_RE = /^[\t \u00a0]*(\d{1,3})[.)]\s+(.*)$/;

function normalizePastedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, "  ")
    // Word/Google Docs sometimes dump double spaces before bullets after paste
    .replace(/[ \t]+\n/g, "\n");
}

export function parseDescription(raw: string | null | undefined): DescriptionBlock[] {
  if (!raw?.trim()) return [];
  const text = normalizePastedText(raw);
  const lines = text.split("\n");
  const blocks: DescriptionBlock[] = [];

  let para: string[] = [];
  let ul: string[] | null = null;
  let ol: string[] | null = null;

  const flushPara = () => {
    if (para.length === 0) return;
    blocks.push({ type: "paragraph", lines: para });
    para = [];
  };
  const flushUl = () => {
    if (!ul?.length) {
      ul = null;
      return;
    }
    blocks.push({ type: "ul", items: ul });
    ul = null;
  };
  const flushOl = () => {
    if (!ol?.length) {
      ol = null;
      return;
    }
    blocks.push({ type: "ol", items: ol });
    ol = null;
  };
  const flushAll = () => {
    flushPara();
    flushUl();
    flushOl();
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushAll();
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      flushPara();
      flushOl();
      if (!ul) ul = [];
      ul.push((bullet[2] ?? "").trimEnd());
      continue;
    }

    const numbered = line.match(NUMBERED_RE);
    if (numbered) {
      flushPara();
      flushUl();
      if (!ol) ol = [];
      ol.push((numbered[2] ?? "").trimEnd());
      continue;
    }

    flushUl();
    flushOl();
    para.push(line.trimEnd());
  }
  flushAll();
  return blocks;
}
