/**
 * CurrentSourceSymbol component - renders the SVG current source symbol
 */

import { memo } from "react";
import { Tooltip, useTheme } from "@mui/material";
import { DirectionArrow } from "./DirectionArrow";
import { SVG_WIDTH, SVG_HEIGHT, SVG_VIEW_BOX, CIRCLE_CENTER_X, CIRCLE_CENTER_Y, CIRCLE_RADIUS } from "./constants";

interface CurrentSourceSymbolProps {
  direction: "up" | "down";
  onDirectionToggle: () => void;
}

export const CurrentSourceSymbol = memo(({ direction, onDirectionToggle }: CurrentSourceSymbolProps) => {
  const theme = useTheme();
  const textColor = theme.palette.text.primary;

  return (
    <Tooltip title="Click to toggle direction">
      <svg
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={SVG_VIEW_BOX}
        onClick={onDirectionToggle}
        style={{ cursor: "pointer" }}
      >
        <line x1="30" y1="0" x2="30" y2="20" stroke={textColor} strokeWidth="2" />
        <line x1="30" y1="60" x2="30" y2="80" stroke={textColor} strokeWidth="2" />

        <circle
          cx={CIRCLE_CENTER_X}
          cy={CIRCLE_CENTER_Y}
          r={CIRCLE_RADIUS}
          stroke={textColor}
          strokeWidth="2"
          fill={theme.palette.background.paper}
        />

        <DirectionArrow direction={direction} />
      </svg>
    </Tooltip>
  );
});

CurrentSourceSymbol.displayName = "CurrentSourceSymbol";
