/**
 * ResistorSymbol component - renders the SVG resistor symbol
 */

import { memo } from "react";
import { useTheme } from "@mui/material";
import { RESISTOR_PATH, SVG_WIDTH, SVG_HEIGHT } from "./constants";

export const ResistorSymbol = memo(() => {
  const theme = useTheme();

  return (
    <svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${String(SVG_WIDTH)} ${String(SVG_HEIGHT)}`}>
      <path d={RESISTOR_PATH} stroke={theme.palette.text.primary} strokeWidth="2" fill="none" />
    </svg>
  );
});

ResistorSymbol.displayName = "ResistorSymbol";
