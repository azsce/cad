/**
 * Utilities for splitting and merging edges at junction points.
 */

import { logger } from './logger';
import type { CircuitEdge, Waypoint, Position } from '../types/circuit';
import type { NodeId, EdgeId } from '../types/identifiers';
import { createEdgeId } from '../types/identifiers';

/**
 * Calculate distance between two positions.
 */
function distance(p1: Position, p2: Position): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Find the closest point on a line segment to a given point.
 */
function closestPointOnSegment(
  segmentStart: Position,
  segmentEnd: Position,
  point: Position
): Position {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;

  if (dx === 0 && dy === 0) {
    return segmentStart;
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / (dx * dx + dy * dy)
    )
  );

  return {
    x: segmentStart.x + t * dx,
    y: segmentStart.y + t * dy,
  };
}

/**
 * Split waypoints at a position along the edge path.
 * Finds the closest segment and distributes waypoints accordingly.
 */
export function splitWaypointsAtPosition(
  sourcePos: Position,
  targetPos: Position,
  waypoints: Waypoint[],
  splitPosition: Position
): { beforeWaypoints: Waypoint[]; afterWaypoints: Waypoint[] } {
  // Build complete path: source -> waypoints -> target
  const pathPoints: Position[] = [sourcePos, ...waypoints, targetPos];

  if (pathPoints.length === 2) {
    // No waypoints - simple case
    return { beforeWaypoints: [], afterWaypoints: [] };
  }

  // Find closest segment to split position
  let closestSegmentIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const segmentStart = pathPoints[i];
    const segmentEnd = pathPoints[i + 1];

    if (!segmentStart || !segmentEnd) continue;

    const closestPoint = closestPointOnSegment(segmentStart, segmentEnd, splitPosition);
    const dist = distance(closestPoint, splitPosition);

    if (dist < minDistance) {
      minDistance = dist;
      closestSegmentIndex = i;
    }
  }

  logger.debug({ caller: 'edgeSplitting' }, 'Found closest segment', {
    segmentIndex: closestSegmentIndex,
    minDistance,
    totalSegments: pathPoints.length - 1,
  });

  // Split waypoints at the closest segment
  // closestSegmentIndex is in pathPoints (includes source/target)
  // Convert to waypoint indices (subtract 1 for source)
  const waypointSplitIndex = closestSegmentIndex;

  return {
    beforeWaypoints: waypoints.slice(0, waypointSplitIndex),
    afterWaypoints: waypoints.slice(waypointSplitIndex),
  };
}

/**
 * Split an edge at a junction point.
 * Creates two new edges and returns them with the deleted edge ID.
 */
export interface SplitEdgeResult {
  edge1: CircuitEdge;
  edge2: CircuitEdge;
  deletedEdgeId: EdgeId;
}

export interface SplitEdgeParams {
  originalEdge: CircuitEdge;
  junctionId: NodeId;
  junctionPosition: Position;
  sourceNodePosition: Position;
  targetNodePosition: Position;
}

export function splitEdge(params: SplitEdgeParams): SplitEdgeResult {
  const { originalEdge, junctionId, junctionPosition, sourceNodePosition, targetNodePosition } =
    params;
  logger.debug({ caller: 'edgeSplitting' }, 'Splitting edge', {
    edgeId: originalEdge.id,
    junctionId,
    junctionPosition,
  });

  // Split waypoints
  const { beforeWaypoints, afterWaypoints } = splitWaypointsAtPosition(
    sourceNodePosition,
    targetNodePosition,
    originalEdge.waypoints ?? [],
    junctionPosition
  );

  // Create edge from source to junction
  const edge1: CircuitEdge = {
    id: createEdgeId(`${originalEdge.id}-before-${Date.now().toString()}`),
    source: originalEdge.source,
    sourceHandle: originalEdge.sourceHandle,
    target: junctionId,
    targetHandle: 'center',
    ...(beforeWaypoints.length > 0 && { waypoints: beforeWaypoints }),
  };

  // Create edge from junction to target
  const edge2: CircuitEdge = {
    id: createEdgeId(`${originalEdge.id}-after-${Date.now().toString()}`),
    source: junctionId,
    sourceHandle: 'center',
    target: originalEdge.target,
    targetHandle: originalEdge.targetHandle,
    ...(afterWaypoints.length > 0 && { waypoints: afterWaypoints }),
  };

  logger.debug({ caller: 'edgeSplitting' }, 'Edge split complete', {
    edge1: edge1.id,
    edge2: edge2.id,
    beforeWaypoints: beforeWaypoints.length,
    afterWaypoints: afterWaypoints.length,
  });

  return {
    edge1,
    edge2,
    deletedEdgeId: originalEdge.id,
  };
}

/**
 * Merge two edges that connect through a junction.
 * Combines waypoints and creates a single edge.
 */
export function mergeEdges(edge1: CircuitEdge, edge2: CircuitEdge, junctionId: NodeId): CircuitEdge {
  logger.debug({ caller: 'edgeSplitting' }, 'Merging edges', {
    edge1: edge1.id,
    edge2: edge2.id,
    junctionId,
  });

  // Determine which edge comes first
  let firstEdge: CircuitEdge;
  let secondEdge: CircuitEdge;

  if (edge1.target === junctionId && edge2.source === junctionId) {
    firstEdge = edge1;
    secondEdge = edge2;
  } else if (edge2.target === junctionId && edge1.source === junctionId) {
    firstEdge = edge2;
    secondEdge = edge1;
  } else {
    logger.error({ caller: 'edgeSplitting' }, 'Edges do not connect through junction', {
      edge1,
      edge2,
      junctionId,
    });
    throw new Error('Cannot merge edges that do not connect through junction');
  }

  // Combine waypoints
  const combinedWaypoints = [...(firstEdge.waypoints ?? []), ...(secondEdge.waypoints ?? [])];

  // Create merged edge
  const mergedEdge: CircuitEdge = {
    id: createEdgeId(`merged-${Date.now().toString()}`),
    source: firstEdge.source,
    sourceHandle: firstEdge.sourceHandle,
    target: secondEdge.target,
    targetHandle: secondEdge.targetHandle,
    ...(combinedWaypoints.length > 0 && { waypoints: combinedWaypoints }),
  };

  logger.debug({ caller: 'edgeSplitting' }, 'Edges merged', {
    mergedEdge: mergedEdge.id,
    totalWaypoints: combinedWaypoints.length,
  });

  return mergedEdge;
}

/**
 * Check if a position is too close to a junction (for waypoint placement).
 */
export function isTooCloseToJunction(
  position: Position,
  junctionPosition: Position,
  minDistance = 5
): boolean {
  return distance(position, junctionPosition) < minDistance;
}
