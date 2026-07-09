"use client";

import { useEffect, useMemo, useState } from "react";
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
  toCountry = "FR",
  airline = "",
  flightNumber = "",
  fromAirportCode = "",
  toAirportCode = "",
  airlineLabel = "Compagnie",
  flightLabel = "N° de vol",
  fromAirportLabel = "Aéroport de départ",
  toAirportLabel = "Aéroport d'arrivée",
}: Props) {
  const fromAirports = useMemo(
    () => airportsForCountry(fromCountry),
    [fromCountry]
  );
  const toAirports = useMemo(
    () => airportsForCountry(toCountry),
    [toCountry]
  );

  const [fromAirport, setFromAirport] = useState(() =>
    fromAirportCode &&
    airportsForCountry(fromCountry).some((a) => a.code === fromAirportCode)
      ? fromAirportCode
      : ""
  );
  const [toAirport, setToAirport] = useState(() =>
    toAirportCode &&
    airportsForCountry(toCountry).some((a) => a.code === toAirportCode)
      ? toAirportCode
      : ""
  );

  useEffect(() => {
    setFromAirport((prev) => {
      if (prev && fromAirports.some((a) => a.code === prev)) return prev;
      if (
        fromAirportCode &&
        fromAirports.some((a) => a.code === fromAirportCode)
      ) {
        return fromAirportCode;
      }
      return "";
    });
  }, [fromCountry, fromAirports, fromAirportCode]);

  useEffect(() => {
    setToAirport((prev) => {
      if (prev && toAirports.some((a) => a.code === prev)) return prev;
      if (toAirportCode && toAirports.some((a) => a.code === toAirportCode)) {
        return toAirportCode;
      }
      return "";
    });
  }, [toCountry, toAirports, toAirportCode]);

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
            placeholder="AF123"
            defaultValue={flightNumber}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fromAirportCode">{fromAirportLabel}</Label>
          <Select
            key={`from-${fromCountry}`}
            id="fromAirportCode"
            name="fromAirportCode"
            value={fromAirport}
            onChange={(e) => setFromAirport(e.target.value)}
          >
            <option value="">—</option>
            {fromAirports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </Select>
          {fromAirports.length === 0 && (
            <p className="text-xs text-[var(--muted)]">
              Aucun aéroport listé pour ce pays.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="toAirportCode">{toAirportLabel}</Label>
          <Select
            key={`to-${toCountry}`}
            id="toAirportCode"
            name="toAirportCode"
            value={toAirport}
            onChange={(e) => setToAirport(e.target.value)}
          >
            <option value="">—</option>
            {toAirports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </Select>
          {toAirports.length === 0 && (
            <p className="text-xs text-[var(--muted)]">
              Aucun aéroport listé pour ce pays.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
