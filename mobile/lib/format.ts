function parseFlexibleDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  const candidates = [raw, raw.replace(/:(\d{2})(\d{1,3})Z$/, ":$1.$2Z")];
  for (const candidate of candidates) {
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function formatDate(value: string | Date) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return "";
  try {
    return new Intl.DateTimeFormat("fr-CA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(parsed);
  } catch {
    return String(value);
  }
}

export function formatRelativeTime(value: string | Date | null | undefined) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return "";
  const diff = Date.now() - parsed.getTime();
  if (diff < 45_000) return "À l'instant";
  if (diff < 60 * 60_000) {
    const n = Math.max(1, Math.floor(diff / 60_000));
    return `Il y a ${n} min`;
  }
  if (diff < 24 * 60 * 60_000) {
    const n = Math.max(1, Math.floor(diff / 3_600_000));
    return `Il y a ${n} h`;
  }
  if (diff < 7 * 24 * 60 * 60_000) {
    const n = Math.max(1, Math.floor(diff / 86_400_000));
    return `Il y a ${n} j`;
  }
  return formatDate(parsed);
}

export function formatMoney(amount: number, currency = "CAD") {
  const code = currency.toUpperCase();
  const zero = code === "XOF" || code === "XAF";
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: code,
      maximumFractionDigits: zero ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

export function formatMoneyFromCents(units: number, currency = "CAD") {
  const code = currency.toUpperCase();
  const zero = code === "XOF" || code === "XAF";
  const major = zero ? units : units / 100;
  return formatMoney(major, code);
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function calendarDaysBetween(a: Date, b: Date) {
  const ms =
    startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime();
  return Math.round(ms / 86_400_000);
}

/** WhatsApp-style time on conversation list rows (fr-CA). */
export function formatChatListTime(value: string | Date | null | undefined) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return "";
  const now = new Date();
  const days = calendarDaysBetween(now, parsed);
  try {
    if (days === 0) {
      return new Intl.DateTimeFormat("fr-CA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(parsed);
    }
    if (days === 1) return "Hier";
    if (days > 1 && days < 7) {
      return new Intl.DateTimeFormat("fr-CA", { weekday: "long" }).format(
        parsed
      );
    }
    return new Intl.DateTimeFormat("fr-CA", {
      day: "numeric",
      month: "short",
      year: parsed.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(parsed);
  } catch {
    return formatDate(parsed);
  }
}

/** Day chip label in a chat thread (fr-CA): Aujourd'hui / Hier / full date. */
export function formatChatDayLabel(value: string | Date | null | undefined) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return "";
  const days = calendarDaysBetween(new Date(), parsed);
  try {
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    return new Intl.DateTimeFormat("fr-CA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(parsed);
  } catch {
    return formatDate(parsed);
  }
}

/** Same calendar day (local). */
export function isSameChatDay(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined
) {
  const da = parseFlexibleDate(a);
  const db = parseFlexibleDate(b);
  if (!da || !db) return false;
  return calendarDaysBetween(da, db) === 0;
}
