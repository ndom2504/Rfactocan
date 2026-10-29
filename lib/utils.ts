import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const parsed = parseFlexibleDate(date);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function parseFlexibleDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  const candidates = [
    raw,
    raw.replace(/:(\d{2})(\d{1,3})Z$/, ":$1.$2Z"),
  ];
  for (const candidate of candidates) {
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function formatRelativeTime(
  value: string | Date | null | undefined,
  locale: "fr" | "en" = "fr"
) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return "";
  const diff = Date.now() - parsed.getTime();
  if (diff < 45_000) return locale === "en" ? "Just now" : "À l'instant";
  if (diff < 60 * 60_000) {
    const n = Math.max(1, Math.floor(diff / 60_000));
    return locale === "en" ? `${n}m ago` : `Il y a ${n} min`;
  }
  if (diff < 24 * 60 * 60_000) {
    const n = Math.max(1, Math.floor(diff / 3_600_000));
    return locale === "en" ? `${n}h ago` : `Il y a ${n} h`;
  }
  if (diff < 7 * 24 * 60 * 60_000) {
    const n = Math.max(1, Math.floor(diff / 86_400_000));
    return locale === "en" ? `${n}d ago` : `Il y a ${n} j`;
  }
  return formatDate(parsed);
}

export function formatKg(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} kg`;
}

export function formatCad(value: number) {
  return formatMoney(value, "CAD");
}

/** Format a major-unit price in the given ISO currency (CAD, USD, EUR, XOF…). */
export function formatMoney(
  value: number,
  currency: string = "CAD",
  locale = "fr-CA"
) {
  const code = (currency || "CAD").toUpperCase();
  const zeroDecimal = code === "XOF" || code === "XAF";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: zeroDecimal ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(zeroDecimal ? 0 : 2)} ${code}`;
  }
}
