/**
 * CursorMarker component - renders cursor position marker
 */

import { memo } from "react";
import type { Position } from "../../../../types/circuit";

interface CursorMarkerProps {
  position: Position;
  radius: number;
}

export const CursorMarker = memo(({ position, radius }: CursorMarkerProps) => {
  return <circle cx={position.x} cy={position.y} r={radius} fill="#2563eb" opacity={0.5} />;
});

CursorMarker.displayName = "CursorMarker";
