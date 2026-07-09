"use client";

import { useMemo, useState } from "react";
import { COUNTRIES } from "@/lib/corridors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  value: string;
  onChange: (countryName: string) => void;
  label?: string;
};

export function CountrySelect({
  value,
  onChange,
  label = "Pays",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...COUNTRIES];
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="relative space-y-2">
      <Label>{label}</Label>
      <Input
        value={open ? query : value}
        placeholder="Rechercher un pays…"
        onFocus={() => {
          setOpen(true);
          setQuery(value);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          // delay so click on option registers
          setTimeout(() => setOpen(false), 150);
        }}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-md">
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-[var(--muted)]">
              Aucun pays trouvé
            </li>
          )}
          {options.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c.name);
                  setQuery(c.name);
                  setOpen(false);
                }}
              >
                <span>{c.name}</span>
                <span className="text-xs text-[var(--muted)]">{c.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
