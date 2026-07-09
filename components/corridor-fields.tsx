"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTRIES } from "@/lib/corridors";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Props = {
  defaults?: {
    fromCountry?: string;
    fromCity?: string;
    toCountry?: string;
    toCity?: string;
  };
};

export function CorridorFields({ defaults }: Props) {
  const [fromCountry, setFromCountry] = useState(defaults?.fromCountry ?? "CA");
  const [toCountry, setToCountry] = useState(defaults?.toCountry ?? "GA");
  const [fromCity, setFromCity] = useState(defaults?.fromCity ?? "Montréal");
  const [toCity, setToCity] = useState(defaults?.toCity ?? "Libreville");

  const fromCities = useMemo(
    () =>
      (COUNTRIES.find((c) => c.code === fromCountry)?.cities ?? []).map(String),
    [fromCountry]
  );
  const toCities = useMemo(
    () =>
      (COUNTRIES.find((c) => c.code === toCountry)?.cities ?? []).map(String),
    [toCountry]
  );

  useEffect(() => {
    if (!fromCities.includes(fromCity)) setFromCity(fromCities[0] ?? "");
  }, [fromCities, fromCity]);

  useEffect(() => {
    if (!toCities.includes(toCity)) setToCity(toCities[0] ?? "");
  }, [toCities, toCity]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Pays de départ</Label>
        <Select
          name="fromCountry"
          value={fromCountry}
          onChange={(e) => setFromCountry(e.target.value)}
          required
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Ville de départ</Label>
        <Select
          name="fromCity"
          value={fromCity}
          onChange={(e) => setFromCity(e.target.value)}
          required
        >
          {fromCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Pays d&apos;arrivée</Label>
        <Select
          name="toCountry"
          value={toCountry}
          onChange={(e) => setToCountry(e.target.value)}
          required
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Ville d&apos;arrivée</Label>
        <Select
          name="toCity"
          value={toCity}
          onChange={(e) => setToCity(e.target.value)}
          required
        >
          {toCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function DateField({
  name,
  label,
  required,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="datetime-local" required={required} />
    </div>
  );
}
