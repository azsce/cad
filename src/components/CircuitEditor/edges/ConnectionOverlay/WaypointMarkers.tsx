/**
 * WaypointMarkers component - renders waypoint markers
 */

import { memo } from "react";
import type { Waypoint } from "../../../../types/circuit";

interface WaypointMarkersProps {
  waypoints: Waypoint[];
  radius: number;
  strokeWidth: number;
}

export const WaypointMarkers = memo(({ waypoints, radius, strokeWidth }: WaypointMarkersProps) => {
  return (
    <>
      {waypoints.map(point => (
        <circle
          key={`${point.x.toString()}-${point.y.toString()}`}
          cx={point.x}
          cy={point.y}
          r={radius}
          fill="#2563eb"
          stroke="#fff"
          strokeWidth={strokeWidth}
        />
      ))}
    </>
  );
});

WaypointMarkers.displayName = "WaypointMarkers";
