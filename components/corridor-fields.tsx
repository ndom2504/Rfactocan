"use client";

import { useEffect, useMemo, useState } from "react";
import { getCities } from "@/lib/corridors";
import { CountryCodeSelect } from "@/components/country-select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Props = {
  defaults?: {
    fromCountry?: string;
    fromCity?: string;
    toCountry?: string;
    toCity?: string;
  };
  onFromCountryChange?: (code: string) => void;
  onToCountryChange?: (code: string) => void;
};

export function CorridorFields({
  defaults,
  onFromCountryChange,
  onToCountryChange,
}: Props) {
  const [fromCountry, setFromCountry] = useState(defaults?.fromCountry ?? "CA");
  const [toCountry, setToCountry] = useState(defaults?.toCountry ?? "FR");
  const [fromCity, setFromCity] = useState(defaults?.fromCity ?? "Montréal");
  const [toCity, setToCity] = useState(defaults?.toCity ?? "Paris");

  useEffect(() => {
    if (defaults?.fromCountry) setFromCountry(defaults.fromCountry);
    if (defaults?.toCountry) setToCountry(defaults.toCountry);
    if (defaults?.fromCity) setFromCity(defaults.fromCity);
    if (defaults?.toCity) setToCity(defaults.toCity);
  }, [
    defaults?.fromCountry,
    defaults?.toCountry,
    defaults?.fromCity,
    defaults?.toCity,
  ]);

  const fromCities = useMemo(() => getCities(fromCountry), [fromCountry]);
  const toCities = useMemo(() => getCities(toCountry), [toCountry]);

  useEffect(() => {
    if (fromCities.length && !fromCities.includes(fromCity)) {
      setFromCity(fromCities[0] ?? "");
    }
  }, [fromCities, fromCity]);

  useEffect(() => {
    if (toCities.length && !toCities.includes(toCity)) {
      setToCity(toCities[0] ?? "");
    }
  }, [toCities, toCity]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CountryCodeSelect
        name="fromCountry"
        label="Pays de départ"
        value={fromCountry}
        onChange={(code) => {
          setFromCountry(code);
          onFromCountryChange?.(code);
        }}
      />
      <div className="space-y-2">
        <Label htmlFor="fromCity">Ville de départ</Label>
        <Input
          id="fromCity"
          name="fromCity"
          list="fromCity-suggestions"
          value={fromCity}
          onChange={(e) => setFromCity(e.target.value)}
          placeholder="Ville ou aéroport"
          required
        />
        <datalist id="fromCity-suggestions">
          {fromCities.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </div>
      <CountryCodeSelect
        name="toCountry"
        label="Pays d'arrivée"
        value={toCountry}
        onChange={(code) => {
          setToCountry(code);
          onToCountryChange?.(code);
        }}
      />
      <div className="space-y-2">
        <Label htmlFor="toCity">Ville d&apos;arrivée</Label>
        <Input
          id="toCity"
          name="toCity"
          list="toCity-suggestions"
          value={toCity}
          onChange={(e) => setToCity(e.target.value)}
          placeholder="Ville ou aéroport"
          required
        />
        <datalist id="toCity-suggestions">
          {toCities.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

export function DateField({
  name,
  label,
  required,
  defaultValue,
  type = "datetime-local",
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  type?: "datetime-local" | "date" | "time";
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
      />
    </div>
  );
}

/** Combine HTML date + time into an ISO string (local → Date). */
export function combineDateAndTime(date: string, time: string): Date | null {
  const d = date.trim();
  const t = (time.trim() || "00:00").slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  if (!/^\d{2}:\d{2}$/.test(t)) return null;
  const parsed = new Date(`${d}T${t}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toTimeInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}
