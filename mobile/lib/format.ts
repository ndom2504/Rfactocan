export function formatDate(value: string | Date) {
  try {
    return new Intl.DateTimeFormat("fr-CA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
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
