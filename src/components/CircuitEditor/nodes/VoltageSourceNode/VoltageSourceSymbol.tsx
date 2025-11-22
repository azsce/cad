/**
 * VoltageSourceSymbol component - renders the SVG voltage source symbol
 */

import { memo } from "react";
import { Tooltip, useTheme } from "@mui/material";
import { PolarityIndicators } from "./PolarityIndicators";
import { SVG_WIDTH, SVG_HEIGHT, CIRCLE_CENTER_X, CIRCLE_CENTER_Y } from "./constants";

interface VoltageSourceSymbolProps {
  direction: "up" | "down";
  onDirectionToggle: () => void;
}
// Voltage source symbol: two parallel horizontal lines (tall and short)
const lineY1 = CIRCLE_CENTER_Y - 3; // Top line
const lineY2 = CIRCLE_CENTER_Y + 3; // Bottom line
const tallLineLength = 16; // Longer line (reduced from 20)
const shortLineLength = 8; // Shorter line (reduced from 10)

// Tall line (negative terminal)
const tallLineX1 = CIRCLE_CENTER_X - tallLineLength / 2;
const tallLineX2 = CIRCLE_CENTER_X + tallLineLength / 2;

// Short line (positive terminal)
const shortLineX1 = CIRCLE_CENTER_X - shortLineLength / 2;
const shortLineX2 = CIRCLE_CENTER_X + shortLineLength / 2;

export const VoltageSourceSymbol = memo(({ direction, onDirectionToggle }: VoltageSourceSymbolProps) => {
  const theme = useTheme();
  const textColor = theme.palette.text.primary;

  // Swap lines based on polarity direction
  // "up" means positive at top (tall line at top, short at bottom)
  // "down" means positive at bottom (short line at top, tall at bottom)
  const topLineX1 = direction === "up" ? tallLineX1 : shortLineX1;
  const topLineX2 = direction === "up" ? tallLineX2 : shortLineX2;
  const bottomLineX1 = direction === "up" ? shortLineX1 : tallLineX1;
  const bottomLineX2 = direction === "up" ? shortLineX2 : tallLineX2;

  return (
    <Tooltip title="Click to toggle polarity">
      <svg
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${String(SVG_WIDTH)} ${String(SVG_HEIGHT)}`}
        onClick={onDirectionToggle}
        style={{ cursor: "pointer" }}
      >
        {/* Top connection line */}
        <line x1={CIRCLE_CENTER_X} y1="8" x2={CIRCLE_CENTER_X} y2={lineY1} stroke={textColor} strokeWidth="2" />

        {/* Top horizontal line (changes based on polarity) */}
        <line x1={topLineX1} y1={lineY1} x2={topLineX2} y2={lineY1} stroke={textColor} strokeWidth="2" />

        {/* Bottom connection line */}
        <line
          x1={CIRCLE_CENTER_X}
          y1={lineY2}
          x2={CIRCLE_CENTER_X}
          y2={SVG_HEIGHT - 8}
          stroke={textColor}
          strokeWidth="2"
        />

        {/* Bottom horizontal line (changes based on polarity) */}
        <line x1={bottomLineX1} y1={lineY2} x2={bottomLineX2} y2={lineY2} stroke={textColor} strokeWidth="2" />

        <PolarityIndicators direction={direction} />
      </svg>
    </Tooltip>
  );
});

VoltageSourceSymbol.displayName = "VoltageSourceSymbol";
