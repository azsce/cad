import { memo, useMemo } from "react";
import { useConnectionStore } from "../../../store/connectionStore";
import { logger } from "../../../utils/logger";
import type { ConnectionLineComponentProps } from "@xyflow/react";

/**
 * Custom connection line component that renders multi-segment path with waypoints.
 * This component is used during Phase 1 (Drawing Mode) to visualize the connection
 * being created before it becomes a persistent edge.
 *
 * Requirements:
 * - 1.4: Display temporary edge line from source handle to cursor
 * - 2.4: Render all edge segments as straight lines
 * - 5.1: Render completed edge segments with solid line style
 * - 5.2: Render temporary edge line with dashed line style
 * - 5.4: Render visual marker at waypoint positions
 */
export const WaypointConnectionLine = memo((props: ConnectionLineComponentProps) => {
  const { fromX, fromY, toX, toY } = props;

  // Subscribe to waypoints from connection store
  // Uses selector for efficient re-renders (only updates when waypoints change)
  const waypoints = useConnectionStore(state => state.waypoints);

  logger.debug({ caller: "WaypointConnectionLine" }, "Rendering connection line", {
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY },
    waypointsCount: waypoints.length,
  });

  // Build SVG path with waypoints
  // Uses M (Moveto) and L (Lineto) commands to create multi-segment polyline
  const path = useMemo(() => {
    // Start at the source handle
    let d = `M ${String(fromX)},${String(fromY)}`;

    // Add line segments for each waypoint
    for (const point of waypoints) {
      d += ` L ${String(point.x)},${String(point.y)}`;
    }

    // Final segment to cursor position
    d += ` L ${String(toX)},${String(toY)}`;

    return d;
  }, [fromX, fromY, toX, toY, waypoints]);

  return (
    <g>
      {/* Main connection line (dashed to indicate temporary drawing state) */}
      <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />

      {/* Waypoint markers - visual feedback for placed waypoints */}
      {waypoints.map(point => (
        <circle
          key={`${String(point.x)}-${String(point.y)}`}
          cx={point.x}
          cy={point.y}
          r={4}
          fill="#2563eb"
          stroke="#fff"
          strokeWidth={2}
        />
      ))}
    </g>
  );
});

WaypointConnectionLine.displayName = "WaypointConnectionLine";
