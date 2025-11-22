/**
 * WaypointHandles component - renders draggable waypoint handles
 */

import { memo } from "react";
import { useTheme } from "@mui/material";
import type { Waypoint } from "../../../../types/circuit";

interface WaypointHandlersType {
  onPointerDown: (e: React.PointerEvent, index: number) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onDoubleClick: (e: React.MouseEvent, index: number) => void;
}

interface WaypointHandlesProps {
  waypoints: Waypoint[];
  handlers: WaypointHandlersType;
}

export const WaypointHandles = memo(({ waypoints, handlers }: WaypointHandlesProps) => {
  const theme = useTheme();

  return (
    <>
      {waypoints.map((point, index) => (
        <circle
          key={`${String(point.x)}-${String(point.y)}-${String(index)}`}
          cx={point.x}
          cy={point.y}
          r={6}
          fill={theme.palette.primary.main}
          stroke={theme.palette.background.paper}
          strokeWidth={2}
          style={{ cursor: "move", pointerEvents: "all" }}
          onPointerDown={e => {
            handlers.onPointerDown(e, index);
          }}
          onPointerMove={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          onDoubleClick={e => {
            handlers.onDoubleClick(e, index);
          }}
        />
      ))}
    </>
  );
});

WaypointHandles.displayName = "WaypointHandles";
