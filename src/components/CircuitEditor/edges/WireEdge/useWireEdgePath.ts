/**
 * Hook for calculating wire edge path with orthogonal routing
 */

import { useMemo } from 'react';
import type { Position as FlowPosition } from '@xyflow/react';
import type { Waypoint } from '../../../../types/circuit';
import { buildSimplePath, buildWaypointPath } from './pathBuilders';

interface UseWireEdgePathParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: FlowPosition;
  targetPosition: FlowPosition;
  data: unknown;
}

export const useWireEdgePath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: UseWireEdgePathParams) => {
  const waypoints = useMemo(() => {
    const edgeData = data as { waypoints?: Waypoint[] } | undefined;
    return edgeData?.waypoints ?? [];
  }, [data]);

  return useMemo(() => {
    if (waypoints.length === 0) {
      return buildSimplePath({ sourceX, sourceY, targetX, targetY });
    }

    return buildWaypointPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      waypoints,
    });
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, waypoints]);
};
