import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
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
