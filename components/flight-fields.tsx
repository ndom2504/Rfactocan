"use client";

import { useEffect, useState } from "react";
import { AIRLINES, airportsForCountry } from "@/lib/airports";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Props = {
  fromCountry?: string;
  toCountry?: string;
  airline?: string;
  flightNumber?: string;
  fromAirportCode?: string;
  toAirportCode?: string;
  airlineLabel?: string;
  flightLabel?: string;
  fromAirportLabel?: string;
  toAirportLabel?: string;
};

export function FlightFields({
  fromCountry = "CA",
  toCountry = "GA",
  airline = "",
  flightNumber = "",
  fromAirportCode = "",
  toAirportCode = "",
  airlineLabel = "Compagnie",
  flightLabel = "N° de vol",
  fromAirportLabel = "Aéroport de départ",
  toAirportLabel = "Aéroport d'arrivée",
}: Props) {
  const [fromC, setFromC] = useState(fromCountry);
  const [toC, setToC] = useState(toCountry);

  useEffect(() => {
    setFromC(fromCountry);
  }, [fromCountry]);

  useEffect(() => {
    setToC(toCountry);
  }, [toCountry]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const el = e.target as HTMLSelectElement | null;
      if (!el?.name) return;
      if (el.name === "fromCountry") setFromC(el.value);
      if (el.name === "toCountry") setToC(el.value);
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, []);

  const fromAirports = airportsForCountry(fromC);
  const toAirports = airportsForCountry(toC);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="airline">{airlineLabel}</Label>
          <Select id="airline" name="airline" defaultValue={airline}>
            <option value="">—</option>
            {AIRLINES.map((a) => (
              <option key={a.code} value={a.name}>
                {a.name}
              </option>
            ))}
            {airline && !AIRLINES.some((a) => a.name === airline) && (
              <option value={airline}>{airline}</option>
            )}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="flightNumber">{flightLabel}</Label>
          <Input
            id="flightNumber"
            name="flightNumber"
            placeholder="AC123"
            defaultValue={flightNumber}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fromAirportCode">{fromAirportLabel}</Label>
          <Select
            id="fromAirportCode"
            name="fromAirportCode"
            defaultValue={fromAirportCode}
          >
            <option value="">—</option>
            {fromAirports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="toAirportCode">{toAirportLabel}</Label>
          <Select
            id="toAirportCode"
            name="toAirportCode"
            defaultValue={toAirportCode}
          >
            <option value="">—</option>
            {toAirports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
