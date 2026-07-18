import { findCountryByName, getCountryName } from "@/lib/corridors";

export type DetectedCountry = {
  code: string;
  name: string;
  source: "ip-header" | "ip-lookup" | "sim" | "network" | "none";
};

/** Resolve profil (nom ou code ISO) → code ISO. */
export function resolveCountryCode(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return findCountryByName(v)?.code ?? null;
}

export function resolveCountryName(value?: string | null): string | null {
  if (!value) return null;
  const code = resolveCountryCode(value);
  if (code) return getCountryName(code);
  return value.trim() || null;
}

/** Client: fetch suggestion depuis /api/geo/country. */
export async function fetchSuggestedCountry(): Promise<DetectedCountry | null> {
  try {
    const res = await fetch("/api/geo/country", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code?: string | null;
      name?: string | null;
      source?: DetectedCountry["source"];
    };
    if (!data.code) return null;
    return {
      code: data.code.toUpperCase(),
      name: data.name || getCountryName(data.code),
      source: data.source ?? "ip-lookup",
    };
  } catch {
    return null;
  }
}
