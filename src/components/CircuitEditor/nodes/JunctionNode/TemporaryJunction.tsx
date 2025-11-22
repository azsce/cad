/**
 * TemporaryJunction - Rendered during connection mode when clicking an edge.
 * Shown as dashed outline with reduced opacity.
 */

import { memo } from "react";
import { useTheme } from "@mui/material";
import type { Position } from "../../../../types/circuit";

interface TemporaryJunctionProps {
  position: Position;
}

export const TemporaryJunction = memo(({ position }: TemporaryJunctionProps) => {
  const theme = useTheme();

  const circleRadius = 8;
  const outlineWidth = 2;

  return (
    <circle
      cx={position.x}
      cy={position.y}
      r={circleRadius}
      fill="none"
      stroke={theme.palette.primary.main}
      strokeWidth={outlineWidth}
      strokeDasharray="3 3"
      opacity={0.6}
      style={{
        pointerEvents: "none",
      }}
    />
  );
});

TemporaryJunction.displayName = "TemporaryJunction";
