/**
 * PolarityIndicators component - renders + and - symbols based on direction
 */

import { memo } from "react";
import { CIRCLE_CENTER_X, PLUS_TEXT_Y, MINUS_TEXT_Y } from "./constants";

interface PolarityIndicatorsProps {
  direction: "up" | "down";
}

export const PolarityIndicators = memo(({ direction }: PolarityIndicatorsProps) => {
  if (direction === "up") {
    return (
      <>
        <text
          x={CIRCLE_CENTER_X}
          y={PLUS_TEXT_Y}
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill="#E74C3C"
          pointerEvents="none"
        >
          +
        </text>
        <text
          x={CIRCLE_CENTER_X}
          y={MINUS_TEXT_Y}
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill="#3498DB"
          pointerEvents="none"
        >
          −
        </text>
      </>
    );
  }

  return (
    <>
      <text
        x={CIRCLE_CENTER_X}
        y={PLUS_TEXT_Y}
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fill="#3498DB"
        pointerEvents="none"
      >
        −
      </text>
      <text
        x={CIRCLE_CENTER_X}
        y={MINUS_TEXT_Y}
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fill="#E74C3C"
        pointerEvents="none"
      >
        +
      </text>
    </>
  );
});

PolarityIndicators.displayName = "PolarityIndicators";
