/**
 * Hook for managing waypoint interactions
 */

import { useCallback, useState, useRef, useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCircuitFlow } from "../../../../hooks/useCircuitFlow";
import type { Position, Waypoint } from "../../../../types/circuit";
import { createEdgeId } from "../../../../types/identifiers";

export const useWireEdgeWaypoints = (edgeId: string, data: unknown) => {
  const { screenToFlowPosition } = useReactFlow();
  const { updateEdge } = useCircuitFlow();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragStartPos = useRef<Position | null>(null);

  const waypoints = useMemo(() => {
    const edgeData = data as { waypoints?: Waypoint[] } | undefined;
    return edgeData?.waypoints ?? [];
  }, [data]);

  const handleWaypointPointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.stopPropagation();
      setDraggingIndex(index);
      dragStartPos.current = waypoints[index] ?? null;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [waypoints]
  );

  const handleWaypointPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex === null) return;

      const flowPosition = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const newWaypoints = [...waypoints];
      newWaypoints[draggingIndex] = flowPosition;

      updateEdge(createEdgeId(edgeId), { data: { waypoints: newWaypoints } });
    },
    [draggingIndex, waypoints, edgeId, updateEdge, screenToFlowPosition]
  );

  const handleWaypointPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex === null) return;

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const flowPosition = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const newWaypoints = [...waypoints];
      newWaypoints[draggingIndex] = flowPosition;

      updateEdge(createEdgeId(edgeId), { data: { waypoints: newWaypoints } });

      setDraggingIndex(null);
      dragStartPos.current = null;
    },
    [draggingIndex, waypoints, edgeId, updateEdge, screenToFlowPosition]
  );

  const handleWaypointDoubleClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();

      const newWaypoints = waypoints.filter((_, i) => i !== index);

      updateEdge(createEdgeId(edgeId), { data: { waypoints: newWaypoints } });
    },
    [waypoints, edgeId, updateEdge]
  );

  return {
    waypoints,
    waypointHandlers: {
      onPointerDown: handleWaypointPointerDown,
      onPointerMove: handleWaypointPointerMove,
      onPointerUp: handleWaypointPointerUp,
      onDoubleClick: handleWaypointDoubleClick,
    },
  };
};
