/**
 * DirectionArrow component - renders the arrow indicator showing current direction
 */

import { memo } from "react";
import { useTheme } from "@mui/material";
import { ARROW_UP_POINTS, ARROW_DOWN_POINTS } from "./constants";

interface DirectionArrowProps {
  direction: "up" | "down";
}

export const DirectionArrow = memo(({ direction }: DirectionArrowProps) => {
  const theme = useTheme();
  const arrowColor = theme.palette.success.main;

  if (direction === "up") {
    return (
      <>
        <line x1="30" y1="50" x2="30" y2="30" stroke={arrowColor} strokeWidth="3" pointerEvents="none" />
        <polygon points={ARROW_UP_POINTS} fill={arrowColor} pointerEvents="none" />
      </>
    );
  }

  return (
    <>
      <line x1="30" y1="30" x2="30" y2="50" stroke={arrowColor} strokeWidth="3" pointerEvents="none" />
      <polygon points={ARROW_DOWN_POINTS} fill={arrowColor} pointerEvents="none" />
    </>
  );
});

DirectionArrow.displayName = "DirectionArrow";
