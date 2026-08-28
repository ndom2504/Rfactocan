export const lightColors = {
  background: "#f3f5ef",
  foreground: "#1b3b14",
  muted: "#5a6754",
  surface: "#ffffff",
  surface2: "#e8ede3",
  border: "#c5cebc",
  accent: "#28541d",
  accentHover: "#5d8443",
  accentSoft: "#e4ede0",
  gold: "#d8b24c",
  greenDark: "#1b3b14",
  panelDark: "#404d35",
  danger: "#b42318",
  white: "#ffffff",
};

export const darkColors: typeof lightColors = {
  background: "#121510",
  foreground: "#f3f5ef",
  muted: "#b7c2ad",
  surface: "#1c2218",
  surface2: "#262e22",
  border: "#3d4a34",
  accent: "#8BC34A",
  accentHover: "#a5d36a",
  accentSoft: "#2a3824",
  gold: "#d8b24c",
  greenDark: "#0f160c",
  panelDark: "#2a3226",
  danger: "#ef9a9a",
  white: "#ffffff",
};

/** Default light palette — screens should prefer `useTheme().colors`. */
export const colors = lightColors;

export type ThemeColors = typeof lightColors;
export type ThemeMode = "system" | "light" | "dark";
