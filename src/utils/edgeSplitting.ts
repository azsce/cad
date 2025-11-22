/**
 * Utilities for splitting and merging edges at junction points.
 */

import { nanoid } from "nanoid";
import { logger } from "./logger";
import type { CircuitEdge, Waypoint, Position } from "../types/circuit";
import type { NodeId, EdgeId } from "../types/identifiers";
import { createEdgeId } from "../types/identifiers";
import { getRenderedEdgeSegments } from "./svgPathParser";

type SegmentDirection = "horizontal" | "vertical" | "diagonal";

type PathSegment = {
  start: Position;
  end: Position;
  direction: SegmentDirection;
};

/**
 * 📏 Check if point is on horizontal line segment
 */
function isPointOnHorizontalSegment(
  point: Position,
  segmentStart: Position,
  segmentEnd: Position,
  threshold: number
): boolean {
  const isOnLine = Math.abs(point.y - segmentStart.y) < threshold;
  const minX = Math.min(segmentStart.x, segmentEnd.x);
  const maxX = Math.max(segmentStart.x, segmentEnd.x);
  const isBetween = point.x >= minX - threshold && point.x <= maxX + threshold;
  return isOnLine && isBetween;
}

/**
 * 📏 Check if point is on vertical line segment
 */
function isPointOnVerticalSegment(
  point: Position,
  segmentStart: Position,
  segmentEnd: Position,
  threshold: number
): boolean {
  const isOnLine = Math.abs(point.x - segmentStart.x) < threshold;
  const minY = Math.min(segmentStart.y, segmentEnd.y);
  const maxY = Math.max(segmentStart.y, segmentEnd.y);
  const isBetween = point.y >= minY - threshold && point.y <= maxY + threshold;
  return isOnLine && isBetween;
}

/**
 * 🎯 Check if a point is ON a segment (collinear and between endpoints)
 * For orthogonal paths, this is simple:
 * - Horizontal: click.y ≈ segment.y AND click.x is between start.x and end.x
 * - Vertical: click.x ≈ segment.x AND click.y is between start.y and end.y
 */
function isPointOnSegment(point: Position, segmentStart: Position, segmentEnd: Position, threshold = 5): boolean {
  const isHorizontal = Math.abs(segmentStart.y - segmentEnd.y) < 0.1;
  const isVertical = Math.abs(segmentStart.x - segmentEnd.x) < 0.1;

  if (isHorizontal) {
    return isPointOnHorizontalSegment(point, segmentStart, segmentEnd, threshold);
  }

  if (isVertical) {
    return isPointOnVerticalSegment(point, segmentStart, segmentEnd, threshold);
  }

  return false;
}

/**
 * 🔍 Generic segment finder
 */
function findSegmentIndex(segments: PathSegment[], predicate: (segment: PathSegment) => boolean): number {
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;

    if (predicate(segment)) {
      return i;
    }
  }
  return -1;
}

/**
 * 🔍 Find which segment contains the click point
 * Uses geometric validation (point-on-segment) rather than distance
 */
function findSegmentContainingPoint(segments: PathSegment[], point: Position): number | null {
  const index = findSegmentIndex(segments, segment => isPointOnSegment(point, segment.start, segment.end));
  return index === -1 ? null : index;
}

/**
 * 📏 Check if two positions match within threshold
 */
function positionsMatch(pos1: Position, pos2: Position, threshold = 1): boolean {
  return Math.abs(pos1.x - pos2.x) < threshold && Math.abs(pos1.y - pos2.y) < threshold;
}

/**
 * 🔍 Check if a position is a waypoint
 */
function isPositionAWaypoint(position: Position, waypoints: Waypoint[], threshold = 1): boolean {
  return waypoints.some(wp => positionsMatch(position, wp, threshold));
}

/**
 * 🗺️ Get the segment boundaries (start and end points)
 * These can be waypoints, handles, or visual turn points
 */
interface SegmentBoundary {
  position: Position;
  isWaypoint: boolean;
  isHandle: boolean;
  waypointIndex: number | undefined;
  direction: SegmentDirection;
}

function getSegmentBoundaries(
  segment: PathSegment,
  segmentIndex: number,
  totalSegments: number,
  waypoints: Waypoint[]
): { start: SegmentBoundary; end: SegmentBoundary } {
  const startIsWaypoint = isPositionAWaypoint(segment.start, waypoints);
  const endIsWaypoint = isPositionAWaypoint(segment.end, waypoints);

  const startIsHandle = segmentIndex === 0;
  const endIsHandle = segmentIndex === totalSegments - 1;

  let startWaypointIndex: number | undefined;
  let endWaypointIndex: number | undefined;

  if (startIsWaypoint) {
    startWaypointIndex = waypoints.findIndex(wp => positionsMatch(segment.start, wp));
  }

  if (endIsWaypoint) {
    endWaypointIndex = waypoints.findIndex(wp => positionsMatch(segment.end, wp));
  }

  return {
    start: {
      position: segment.start,
      isWaypoint: startIsWaypoint,
      isHandle: startIsHandle,
      waypointIndex: startWaypointIndex,
      direction: segment.direction,
    },
    end: {
      position: segment.end,
      isWaypoint: endIsWaypoint,
      isHandle: endIsHandle,
      waypointIndex: endWaypointIndex,
      direction: segment.direction,
    },
  };
}

/**
 * 🏗️ Add boundary waypoints if needed (visual turns)
 * When splitting a segment, add its boundary points as waypoints if they're visual turns
 * This preserves the visual path after splitting
 *
 * ⚠️ IMPORTANT: Do NOT add waypoints at handle positions - handles should connect directly to junctions
 */
function addBoundaryWaypointsIfNeeded(boundaries: { start: SegmentBoundary; end: SegmentBoundary }): {
  beforeWaypoints: Waypoint[];
  afterWaypoints: Waypoint[];
} {
  const waypointsToAddBefore: Waypoint[] = [];
  const waypointsToAddAfter: Waypoint[] = [];

  if (!boundaries.start.isWaypoint && !boundaries.start.isHandle) {
    const finalDirection = boundaries.start.direction === "diagonal" ? "horizontal" : boundaries.start.direction;
    waypointsToAddBefore.push({
      x: boundaries.start.position.x,
      y: boundaries.start.position.y,
      direction: finalDirection,
      auto: true,
    });
  }

  if (!boundaries.end.isWaypoint && !boundaries.end.isHandle) {
    const finalDirection = boundaries.end.direction === "diagonal" ? "horizontal" : boundaries.end.direction;
    waypointsToAddAfter.push({
      x: boundaries.end.position.x,
      y: boundaries.end.position.y,
      direction: finalDirection,
      auto: true,
    });
  }

  return { beforeWaypoints: waypointsToAddBefore, afterWaypoints: waypointsToAddAfter };
}

/**
 * 🔍 Find segment index where waypoint is located
 */
function findWaypointSegmentIndex(waypoint: Waypoint, segments: PathSegment[]): number {
  return findSegmentIndex(segments, segment => positionsMatch(waypoint, segment.end));
}

/**
 * 🔍 Find segment index containing position
 */
function findPositionSegmentIndex(position: Position, segments: PathSegment[]): number {
  return findSegmentIndex(segments, segment => isPointOnSegment(position, segment.start, segment.end));
}

/**
 * 🛤️ Determine if a waypoint comes before a position in the path
 */
function isWaypointBeforePosition(waypoint: Waypoint, position: Position, allSegments: PathSegment[]): boolean {
  const waypointSegmentIndex = findWaypointSegmentIndex(waypoint, allSegments);
  const positionSegmentIndex = findPositionSegmentIndex(position, allSegments);

  if (waypointSegmentIndex === -1 || positionSegmentIndex === -1) {
    return false;
  }

  return waypointSegmentIndex < positionSegmentIndex;
}

/**
 * 📊 Classify waypoint relative to segment boundaries
 */
function classifyWaypoint(
  waypoint: Waypoint,
  waypointIndex: number,
  boundaries: { start: SegmentBoundary; end: SegmentBoundary },
  segments: PathSegment[]
): "before" | "after" | "start" | "end" {
  if (boundaries.start.isWaypoint && boundaries.start.waypointIndex === waypointIndex) {
    return "start";
  }

  if (boundaries.end.isWaypoint && boundaries.end.waypointIndex === waypointIndex) {
    return "end";
  }

  const isBeforeSegment =
    boundaries.start.waypointIndex === undefined
      ? isWaypointBeforePosition(waypoint, boundaries.start.position, segments)
      : waypointIndex < boundaries.start.waypointIndex;

  return isBeforeSegment ? "before" : "after";
}

/**
 * ✂️ Distribute waypoints based on segment boundaries
 */
function distributeWaypoints(
  waypoints: Waypoint[],
  boundaries: { start: SegmentBoundary; end: SegmentBoundary },
  segments: PathSegment[]
): { beforeWaypoints: Waypoint[]; afterWaypoints: Waypoint[] } {
  const beforeWaypoints: Waypoint[] = [];
  const afterWaypoints: Waypoint[] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const waypoint = waypoints[i];
    if (!waypoint) continue;

    const classification = classifyWaypoint(waypoint, i, boundaries, segments);

    if (classification === "before" || classification === "start") {
      beforeWaypoints.push(waypoint);
    } else {
      afterWaypoints.push(waypoint);
    }
  }

  return { beforeWaypoints, afterWaypoints };
}

/**
 * 🔍 Validate segment for waypoint insertion
 */
function validateSegmentForInsertion(
  edgeId: EdgeId,
  position: Position
): { segments: PathSegment[]; segmentIndex: number; clickedSegment: PathSegment } | null {
  const segments = getRenderedEdgeSegments(edgeId);

  if (segments.length === 0) {
    logger.error({ caller: "edgeSplitting" }, "No segments found for edge", { edgeId });
    return null;
  }

  const segmentIndex = findSegmentContainingPoint(segments, position);

  if (segmentIndex === null) {
    logger.error({ caller: "edgeSplitting" }, "Position not on any segment", { edgeId, position });
    return null;
  }

  const clickedSegment = segments[segmentIndex];
  if (!clickedSegment) {
    return null;
  }

  return { segments, segmentIndex, clickedSegment };
}

/**
 * 📊 Calculate insertion index from waypoint position
 */
function calculateInsertionIndex(
  waypoint: Waypoint,
  waypointIndex: number,
  boundaries: { start: SegmentBoundary; end: SegmentBoundary },
  segments: PathSegment[]
): { index: number; shouldBreak: boolean } {
  if (boundaries.start.isWaypoint && boundaries.start.waypointIndex === waypointIndex) {
    return { index: waypointIndex + 1, shouldBreak: true };
  }

  if (boundaries.end.isWaypoint && boundaries.end.waypointIndex === waypointIndex) {
    return { index: waypointIndex, shouldBreak: true };
  }

  const isBeforeSegment =
    boundaries.start.waypointIndex === undefined
      ? isWaypointBeforePosition(waypoint, boundaries.start.position, segments)
      : waypointIndex < boundaries.start.waypointIndex;

  if (isBeforeSegment) {
    return { index: waypointIndex + 1, shouldBreak: false };
  }

  return { index: waypointIndex, shouldBreak: true };
}

/**
 * 🔍 Find the correct waypoint insertion index for a position on an edge
 * This determines where in the waypoints array a new waypoint should be inserted
 *
 * @param edgeId - The edge ID to get the rendered path from
 * @param waypoints - The current waypoints array
 * @param position - The position where the waypoint should be inserted
 * @returns The index where the waypoint should be inserted, or null if position is invalid
 */
export function findWaypointInsertionIndex(edgeId: EdgeId, waypoints: Waypoint[], position: Position): number | null {
  const validation = validateSegmentForInsertion(edgeId, position);
  if (!validation) {
    return null;
  }

  const { segments, segmentIndex, clickedSegment } = validation;
  const boundaries = getSegmentBoundaries(clickedSegment, segmentIndex, segments.length, waypoints);

  let insertIndex = 0;
  for (let i = 0; i < waypoints.length; i++) {
    const waypoint = waypoints[i];
    if (!waypoint) continue;

    const result = calculateInsertionIndex(waypoint, i, boundaries, segments);
    insertIndex = result.index;

    if (result.shouldBreak) {
      break;
    }
  }

  logger.debug({ caller: "edgeSplitting" }, "Found waypoint insertion index", {
    edgeId,
    segmentIndex,
    insertIndex,
    totalWaypoints: waypoints.length,
  });

  return insertIndex;
}

/**
 * Split waypoints at a position along the edge path.
 * Uses the actual rendered SVG path to determine the split point.
 * Falls back to geometric distance if SVG path is not available.
 *
 * The split preserves all waypoints that come AFTER the split point,
 * ensuring the path geometry is maintained.
 *
 * @param edgeId - The edge ID to get the rendered path from
 * @param waypoints - The current waypoints array
 * @param splitPosition - The position where the split should occur
 * @returns Object with waypoints before and after the split point
 */
export function splitWaypointsAtPosition(
  edgeId: EdgeId,
  waypoints: Waypoint[],
  splitPosition: Position
): { beforeWaypoints: Waypoint[]; afterWaypoints: Waypoint[] } {
  const segments = getRenderedEdgeSegments(edgeId);

  if (segments.length === 0) {
    logger.error({ caller: "edgeSplitting" }, "No segments found for edge, cannot split", {
      edgeId,
      waypointCount: waypoints.length,
    });
    return { beforeWaypoints: [], afterWaypoints: [] };
  }

  const segmentIndex = findSegmentContainingPoint(segments, splitPosition);

  if (segmentIndex === null) {
    logger.error({ caller: "edgeSplitting" }, "Click point not on any segment, cannot split", {
      edgeId,
      splitPosition,
    });
    return { beforeWaypoints: [], afterWaypoints: [] };
  }

  const clickedSegment = segments[segmentIndex];
  if (!clickedSegment) {
    return { beforeWaypoints: [], afterWaypoints: [] };
  }

  const boundaries = getSegmentBoundaries(clickedSegment, segmentIndex, segments.length, waypoints);

  logger.debug({ caller: "edgeSplitting" }, "Segment boundaries identified", {
    edgeId,
    segmentIndex,
    startIsWaypoint: boundaries.start.isWaypoint,
    startIsHandle: boundaries.start.isHandle,
    endIsWaypoint: boundaries.end.isWaypoint,
    endIsHandle: boundaries.end.isHandle,
    startPosition: boundaries.start.position,
    endPosition: boundaries.end.position,
  });

  const { beforeWaypoints, afterWaypoints } = distributeWaypoints(waypoints, boundaries, segments);

  const { beforeWaypoints: turnsBefore, afterWaypoints: turnsAfter } = addBoundaryWaypointsIfNeeded(boundaries);

  beforeWaypoints.push(...turnsBefore);
  afterWaypoints.unshift(...turnsAfter);

  logger.debug({ caller: "edgeSplitting" }, "Waypoints split using segment detection", {
    edgeId,
    segmentIndex,
    totalSegments: segments.length,
    beforeCount: beforeWaypoints.length,
    afterCount: afterWaypoints.length,
    addedTurnsBefore: turnsBefore.length,
    addedTurnsAfter: turnsAfter.length,
  });

  return { beforeWaypoints, afterWaypoints };
}

/**
 * Split an edge at a junction point.
 * Creates two new edges and returns them with the deleted edge ID.
 * Uses the actual rendered SVG path to determine waypoint splitting.
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
}

export function splitEdge(params: SplitEdgeParams): SplitEdgeResult {
  const { originalEdge, junctionId, junctionPosition } = params;

  const originalWaypoints = originalEdge.data?.waypoints ?? [];

  logger.debug({ caller: "edgeSplitting" }, "Starting edge split", {
    originalEdge: originalEdge.id,
    originalWaypointsCount: originalWaypoints.length,
    junctionPosition,
  });

  const { beforeWaypoints, afterWaypoints } = splitWaypointsAtPosition(
    originalEdge.id,
    originalWaypoints,
    junctionPosition
  );

  logger.debug({ caller: "edgeSplitting" }, "After splitting waypoints", {
    originalEdge: originalEdge.id,
    beforeWaypointsCount: beforeWaypoints.length,
    afterWaypointsCount: afterWaypoints.length,
    beforeWaypoints,
    afterWaypoints,
  });

  const edge1: CircuitEdge = {
    id: createEdgeId(`edge-${nanoid()}`),
    type: originalEdge.type,
    source: originalEdge.source,
    sourceHandle: originalEdge.sourceHandle,
    target: junctionId,
    targetHandle: "center",
    ...(beforeWaypoints.length > 0 && { data: { waypoints: beforeWaypoints } }),
  };

  const edge2: CircuitEdge = {
    id: createEdgeId(`edge-${nanoid()}`),
    type: originalEdge.type,
    source: junctionId,
    sourceHandle: "center",
    target: originalEdge.target,
    targetHandle: originalEdge.targetHandle,
    ...(afterWaypoints.length > 0 && { data: { waypoints: afterWaypoints } }),
  };

  logger.debug({ caller: "edgeSplitting" }, "Edge split complete", {
    originalEdge: originalEdge.id,
    edge1: { id: edge1.id, waypoints: edge1.data?.waypoints?.length ?? 0 },
    edge2: { id: edge2.id, waypoints: edge2.data?.waypoints?.length ?? 0 },
  });

  return { edge1, edge2, deletedEdgeId: originalEdge.id };
}

/**
 * 🔍 Determine edge order through junction
 */
function determineEdgeOrder(
  edge1: CircuitEdge,
  edge2: CircuitEdge,
  junctionId: NodeId
): { firstEdge: CircuitEdge; secondEdge: CircuitEdge } | null {
  if (edge1.target === junctionId && edge2.source === junctionId) {
    return { firstEdge: edge1, secondEdge: edge2 };
  }

  if (edge2.target === junctionId && edge1.source === junctionId) {
    return { firstEdge: edge2, secondEdge: edge1 };
  }

  return null;
}

/**
 * 🏗️ Build merged edge from two edges
 */
function buildMergedEdge(firstEdge: CircuitEdge, secondEdge: CircuitEdge): CircuitEdge {
  const combinedWaypoints = [...(firstEdge.data?.waypoints ?? []), ...(secondEdge.data?.waypoints ?? [])];

  return {
    id: createEdgeId(`merged-${Date.now().toString()}`),
    source: firstEdge.source,
    sourceHandle: firstEdge.sourceHandle,
    target: secondEdge.target,
    targetHandle: secondEdge.targetHandle,
    data: {
      ...(combinedWaypoints.length > 0 && { waypoints: combinedWaypoints }),
    },
  };
}

/**
 * Merge two edges that connect through a junction.
 * Combines waypoints and creates a single edge.
 */
export function mergeEdges(edge1: CircuitEdge, edge2: CircuitEdge, junctionId: NodeId): CircuitEdge {
  logger.debug({ caller: "edgeSplitting" }, "Merging edges", {
    edge1: edge1.id,
    edge2: edge2.id,
    junctionId,
  });

  const edgeOrder = determineEdgeOrder(edge1, edge2, junctionId);

  if (!edgeOrder) {
    logger.error({ caller: "edgeSplitting" }, "Edges do not connect through junction", {
      edge1,
      edge2,
      junctionId,
    });
    throw new Error("Cannot merge edges that do not connect through junction");
  }

  const mergedEdge = buildMergedEdge(edgeOrder.firstEdge, edgeOrder.secondEdge);

  logger.debug({ caller: "edgeSplitting" }, "Edges merged", {
    mergedEdge: mergedEdge.id,
    totalWaypoints: mergedEdge.data?.waypoints?.length ?? 0,
  });

  return mergedEdge;
}

/**
 * Check if a position is too close to a junction (for waypoint placement).
 */
export function isTooCloseToJunction(position: Position, junctionPosition: Position, minDistance = 5): boolean {
  const distance = Math.hypot(junctionPosition.x - position.x, junctionPosition.y - position.y);
  return distance < minDistance;
}

/**
 * 🔍 Check if waypoint exists near position
 */
function hasWaypointNearPosition(waypoints: Waypoint[], position: Position, threshold = 1): boolean {
  return waypoints.some(wp => positionsMatch(position, wp, threshold));
}

/**
 * 🏗️ Create waypoint from turn point
 */
function createTurnWaypoint(turnPoint: Position, direction: SegmentDirection): Waypoint {
  const finalDirection = direction === "diagonal" ? "horizontal" : direction;
  return {
    x: turnPoint.x,
    y: turnPoint.y,
    direction: finalDirection,
    auto: true,
  };
}

/**
 * 🔄 Collect turn points from path segments
 */
function collectTurnPoints(segments: PathSegment[], existingWaypoints: Waypoint[]): Waypoint[] {
  const turnPoints: Waypoint[] = [];

  for (let i = 0; i < segments.length - 1; i++) {
    const currentSegment = segments[i];
    const nextSegment = segments[i + 1];

    if (!currentSegment || !nextSegment) continue;

    const turnPoint = currentSegment.end;

    if (currentSegment.direction === nextSegment.direction) continue;

    if (hasWaypointNearPosition(existingWaypoints, turnPoint)) continue;

    turnPoints.push(createTurnWaypoint(turnPoint, nextSegment.direction));
  }

  return turnPoints;
}

/**
 * 🔍 Find segment index for waypoint position
 */
function findSegmentIndexForWaypoint(waypoint: Waypoint, segments: PathSegment[]): number {
  return findSegmentIndex(segments, segment => positionsMatch(segment.end, waypoint));
}

/**
 * 📊 Sort waypoints by path order
 */
function sortWaypointsByPathOrder(waypoints: Waypoint[], segments: PathSegment[]): Waypoint[] {
  return waypoints.slice().sort((a, b) => {
    const aIndex = findSegmentIndexForWaypoint(a, segments);
    const bIndex = findSegmentIndexForWaypoint(b, segments);
    return aIndex - bIndex;
  });
}

/**
 * 🔗 Merge and sort waypoints with turn points
 */
function mergeWaypointsWithTurns(
  existingWaypoints: Waypoint[],
  turnPoints: Waypoint[],
  segments: PathSegment[],
  edgeId: EdgeId
): Waypoint[] {
  logger.debug({ caller: "edgeSplitting" }, "Extracting waypoints from SVG path", {
    edgeId,
    existingWaypointCount: existingWaypoints.length,
    turnPointsFound: turnPoints.length,
    segments: segments.length,
  });

  const allWaypoints = [...existingWaypoints, ...turnPoints];
  const sortedWaypoints = sortWaypointsByPathOrder(allWaypoints, segments);

  logger.debug({ caller: "edgeSplitting" }, "Waypoints extracted and sorted", {
    edgeId,
    totalWaypoints: sortedWaypoints.length,
    userWaypoints: existingWaypoints.length,
    autoWaypoints: turnPoints.length,
  });

  return sortedWaypoints;
}

/**
 * Extract waypoints from the actual rendered SVG path.
 * This ensures all visual turns are represented as waypoints.
 * Merges existing waypoints with turn points from the SVG.
 *
 * @param edgeId - The edge ID to get the rendered path from
 * @param existingWaypoints - The current waypoints array
 * @returns Array of waypoints including all turn points from the visual path
 */
export function extractWaypointsFromSvgPath(edgeId: EdgeId, existingWaypoints: Waypoint[]): Waypoint[] {
  const segments = getRenderedEdgeSegments(edgeId);

  if (segments.length === 0) {
    return existingWaypoints;
  }

  const turnPoints = collectTurnPoints(segments, existingWaypoints);

  if (turnPoints.length === 0) {
    logger.debug({ caller: "edgeSplitting" }, "No visual turns to preserve", {
      edgeId,
      existingWaypointCount: existingWaypoints.length,
    });
    return existingWaypoints;
  }

  return mergeWaypointsWithTurns(existingWaypoints, turnPoints, segments, edgeId);
}
