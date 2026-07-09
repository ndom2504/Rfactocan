"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  type DictKey,
  type Locale,
  t as translate,
  bookingStatusLabel,
  paymentStatusLabel,
  urgencyLabel,
} from "@/lib/i18n";

const LocaleContext = createContext<{
  locale: Locale;
  t: (key: DictKey) => string;
  setLocale: (locale: Locale) => Promise<void>;
  bookingStatus: (status: string) => string;
  paymentStatus: (status: string) => string;
  urgency: (urgency: string) => string;
} | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();

  const setLocale = useCallback(
    async (next: Locale) => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    },
    [router]
  );

  const value = useMemo(
    () => ({
      locale,
      t: (key: DictKey) => translate(locale, key),
      setLocale,
      bookingStatus: (status: string) => bookingStatusLabel(locale, status),
      paymentStatus: (status: string) => paymentStatusLabel(locale, status),
      urgency: (u: string) => urgencyLabel(locale, u),
    }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return ctx;
}
