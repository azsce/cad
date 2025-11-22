/**
 * Hook for calculating wire edge path with orthogonal routing
 */

import { useMemo, useEffect, useRef } from "react";
import type { Waypoint, CircuitNode } from "../../../../types/circuit";
import { buildSimplePath, buildWaypointPath } from "./pathBuilders";
import { useCircuitFlow } from "../../../../hooks/useCircuitFlow";
import { createEdgeId } from "../../../../types/identifiers";

interface UseWireEdgePathParams {
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  data: unknown;
  edgeId: string;
}

/**
 * 📍 Get final position for node (junction uses true position, others use React Flow position)
 */
function getFinalPosition(node: CircuitNode | undefined, flowX: number, flowY: number): { x: number; y: number } {
  if (node?.type === "junction") {
    return { x: node.position.x, y: node.position.y };
  }
  return { x: flowX, y: flowY };
}

/**
 * 🛤️ Build path based on waypoints
 */
function buildPath(params: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  waypoints: Waypoint[];
}) {
  const { sourceX, sourceY, targetX, targetY, waypoints } = params;

  if (waypoints.length === 0) {
    return buildSimplePath({ sourceX, sourceY, targetX, targetY });
  }

  return buildWaypointPath({ sourceX, sourceY, targetX, targetY, waypoints });
}

export const useWireEdgePath = ({
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  edgeId,
}: UseWireEdgePathParams) => {
  const { updateEdge, nodes } = useCircuitFlow();
  const hasInitializedWaypoints = useRef(false);

  const waypoints = useMemo(() => {
    const edgeData = data as { waypoints?: Waypoint[] } | undefined;
    return edgeData?.waypoints ?? [];
  }, [data]);

  const pathResult = useMemo(() => {
    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);

    const sourcePos = getFinalPosition(sourceNode, sourceX, sourceY);
    const targetPos = getFinalPosition(targetNode, targetX, targetY);

    return buildPath({
      sourceX: sourcePos.x,
      sourceY: sourcePos.y,
      targetX: targetPos.x,
      targetY: targetPos.y,
      waypoints,
    });
  }, [source, target, sourceX, sourceY, targetX, targetY, waypoints, nodes]);

  // Auto-save generated waypoints from buildSimplePath
  useEffect(() => {
    if (hasInitializedWaypoints.current) return;
    if (waypoints.length > 0) return;
    if (!pathResult.waypoints) return;
    if (pathResult.waypoints.length === 0) return;

    hasInitializedWaypoints.current = true;
    updateEdge(createEdgeId(edgeId), { data: { waypoints: pathResult.waypoints } });
  }, [pathResult.waypoints, waypoints.length, edgeId, updateEdge]);

  return pathResult;
};
