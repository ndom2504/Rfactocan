import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  darkColors,
  lightColors,
  type ThemeColors,
  type ThemeMode,
} from "@/lib/theme";

const THEME_KEY = "rfacto_theme_mode";

type ThemeValue = {
  mode: ThemeMode;
  setMode: (next: ThemeMode) => void;
  isDark: boolean;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    void SecureStore.getItemAsync(THEME_KEY)
      .then((stored) => {
        if (stored === "system" || stored === "light" || stored === "dark") {
          setModeState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});
  }, []);

  const isDark =
    mode === "dark" || (mode === "system" && system === "dark");
  const palette = isDark ? darkColors : lightColors;
  const value = useMemo(
    () => ({ mode, setMode, isDark, colors: palette }),
    [mode, setMode, isDark, palette]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function useOptionalTheme() {
  return useContext(ThemeContext);
}
