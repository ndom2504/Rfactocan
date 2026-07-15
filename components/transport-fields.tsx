"use client";

import { useEffect, useMemo, useState } from "react";
import { AIRLINES, airportsForCountry } from "@/lib/airports";
import {
  TRANSPORT_MODES,
  carrierFieldLabels,
  defaultTransportType,
  normalizeTransportType,
  transportTypesForMode,
  type TransportMode,
} from "@/lib/transport";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/locale-provider";

type Props = {
  fromCountry?: string;
  toCountry?: string;
  transportMode?: TransportMode | string;
  transportType?: string;
  airline?: string;
  flightNumber?: string;
  fromAirportCode?: string;
  toAirportCode?: string;
  onModeChange?: (mode: TransportMode) => void;
  /** When false, hide airline/airport detail fields (e.g. Commander form). */
  showCarrierDetails?: boolean;
};

export function TransportFields({
  fromCountry = "CA",
  toCountry = "FR",
  transportMode = "AIR",
  transportType = "",
  airline = "",
  flightNumber = "",
  fromAirportCode = "",
  toAirportCode = "",
  onModeChange,
  showCarrierDetails = true,
}: Props) {
  const { locale, t } = useI18n();
  const [mode, setMode] = useState<TransportMode>(
    (transportMode as TransportMode) || "AIR"
  );
  const typeOptions = transportTypesForMode(mode);
  const [type, setType] = useState(() =>
    normalizeTransportType(mode, transportType || defaultTransportType(mode))
  );
  const labels = carrierFieldLabels(mode, locale === "en" ? "en" : "fr");

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
      : fromAirportCode || ""
  );
  const [toAirport, setToAirport] = useState(() =>
    toAirportCode &&
    airportsForCountry(toCountry).some((a) => a.code === toAirportCode)
      ? toAirportCode
      : toAirportCode || ""
  );

  useEffect(() => {
    setMode((transportMode as TransportMode) || "AIR");
  }, [transportMode]);

  useEffect(() => {
    setType((prev) => normalizeTransportType(mode, transportType || prev));
  }, [mode, transportType]);

  useEffect(() => {
    if (mode !== "AIR") return;
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
  }, [mode, fromCountry, fromAirports, fromAirportCode]);

  useEffect(() => {
    if (mode !== "AIR") return;
    setToAirport((prev) => {
      if (prev && toAirports.some((a) => a.code === prev)) return prev;
      if (toAirportCode && toAirports.some((a) => a.code === toAirportCode)) {
        return toAirportCode;
      }
      return "";
    });
  }, [mode, toCountry, toAirports, toAirportCode]);

  function changeMode(next: TransportMode) {
    setMode(next);
    setType(defaultTransportType(next));
    onModeChange?.(next);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="transportMode">{t("transport_mode")}</Label>
        <Select
          id="transportMode"
          name="transportMode"
          value={mode}
          onChange={(e) => changeMode(e.target.value as TransportMode)}
        >
          {TRANSPORT_MODES.map((m) => (
            <option key={m.code} value={m.code}>
              {locale === "en" ? m.labelEn : m.labelFr}
            </option>
          ))}
        </Select>
        <p className="text-xs text-[var(--muted)]">{t("transport_mode_hint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="transportType">{t("transport_type")}</Label>
        <Select
          id="transportType"
          name="transportType"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {typeOptions.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {locale === "en" ? opt.labelEn : opt.labelFr}
            </option>
          ))}
        </Select>
        <p className="text-xs text-[var(--muted)]">{t("transport_type_hint")}</p>
      </div>

      {showCarrierDetails && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="airline">{labels.carrier}</Label>
              {mode === "AIR" ? (
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
              ) : (
                <Input
                  id="airline"
                  name="airline"
                  defaultValue={airline}
                  placeholder={labels.carrier}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="flightNumber">{labels.reference}</Label>
              <Input
                id="flightNumber"
                name="flightNumber"
                placeholder={mode === "AIR" ? "AF123" : labels.reference}
                defaultValue={flightNumber}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fromAirportCode">{labels.fromHub}</Label>
              {mode === "AIR" ? (
                <>
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
                </>
              ) : (
                <Input
                  id="fromAirportCode"
                  name="fromAirportCode"
                  defaultValue={fromAirportCode}
                  placeholder={labels.fromHub}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="toAirportCode">{labels.toHub}</Label>
              {mode === "AIR" ? (
                <>
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
                </>
              ) : (
                <Input
                  id="toAirportCode"
                  name="toAirportCode"
                  defaultValue={toAirportCode}
                  placeholder={labels.toHub}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** @deprecated Use TransportFields */
export { TransportFields as FlightFields };
