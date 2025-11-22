import { createContext, useContext } from "react";
import { type PaletteMode } from "@mui/material";

export interface ThemeContextValue {
  mode: PaletteMode;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const THEME_STORAGE_KEY = "circuit-analysis-theme";

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Export a named constant for the hook to satisfy fast refresh
export const useThemeHook = useTheme;
