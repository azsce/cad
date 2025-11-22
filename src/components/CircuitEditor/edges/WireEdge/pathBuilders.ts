/**
 * Path building functions for wire edges
 */

import type { Position, Waypoint } from "../../../../types/circuit";
import { createOrthogonalSegment } from "./pathHelpers";

interface PathResult {
  path: string;
  labelPosition: Position;
  waypoints?: Waypoint[]; // Generated waypoints for auto-routing
}

interface BuildSimplePathParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

interface BuildWaypointPathParams extends BuildSimplePathParams {
  waypoints: Waypoint[];
}

interface BuildPointsParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  waypoints: Waypoint[];
}

/**
 * Build a simple orthogonal path without waypoints.
 * Automatically generates waypoints at all turn points and marks them as auto-generated.
 */
export function buildSimplePath({ sourceX, sourceY, targetX, targetY }: BuildSimplePathParams): PathResult {
  const points = createOrthogonalSegment({ x: sourceX, y: sourceY }, { x: targetX, y: targetY }, true);

  // Convert turn points to auto-generated waypoints
  const autoWaypoints: Waypoint[] = [];

  // createOrthogonalSegment returns intermediate points (turns) and the target
  // The last point is the target, so we only create waypoints for intermediate points
  for (let i = 0; i < points.length - 1; i++) {
    const point = points[i];
    if (point) {
      // Determine direction based on the segment leading TO this waypoint
      const prevPoint = i === 0 ? { x: sourceX, y: sourceY } : points[i - 1];
      const isHorizontal = prevPoint && prevPoint.y === point.y;

      autoWaypoints.push({
        x: point.x,
        y: point.y,
        auto: true,
        direction: isHorizontal ? "horizontal" : "vertical",
      });
    }
  }

  const allPoints = [{ x: sourceX, y: sourceY }, ...points];
  let d = `M ${sourceX.toString()},${sourceY.toString()}`;
  for (const point of points) {
    d += ` L ${point.x.toString()},${point.y.toString()}`;
  }

  const labelPosition = calculateLabelPosition({
    points: allPoints,
    fallback: { x: sourceX, y: sourceY },
    waypoints: autoWaypoints,
    source: { x: sourceX, y: sourceY },
    target: { x: targetX, y: targetY },
  });

  return {
    path: d,
    labelPosition,
    waypoints: autoWaypoints,
  };
}

interface BuildPointsParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  waypoints: Waypoint[];
}

/**
 * Build all points for path with waypoints
 */
function buildPointsWithWaypoints({ sourceX, sourceY, targetX, targetY, waypoints }: BuildPointsParams): Position[] {
  const allPoints: Position[] = [{ x: sourceX, y: sourceY }];
  let currentPos = { x: sourceX, y: sourceY };

  // Route through each waypoint with orthogonal segments
  for (const waypoint of waypoints) {
    const startHorizontal = determineDirection(currentPos, waypoint);
    const segment = createOrthogonalSegment(currentPos, waypoint, startHorizontal);
    allPoints.push(...segment);
    currentPos = waypoint;
  }

  // Final segment to target
  const finalStartHorizontal = determineDirection(currentPos, { x: targetX, y: targetY });
  const finalSegment = createOrthogonalSegment(currentPos, { x: targetX, y: targetY }, finalStartHorizontal);
  allPoints.push(...finalSegment);

  return allPoints;
}

/**
 * Determine routing direction based on waypoint or distance
 */
function determineDirection(from: Position, to: Waypoint | Position): boolean {
  // Check if 'to' is a Waypoint with a direction property
  const waypoint = to as Waypoint;
  if (waypoint.direction !== undefined) {
    return waypoint.direction === "horizontal";
  }

  // Fallback: determine from distance
  const deltaX = Math.abs(to.x - from.x);
  const deltaY = Math.abs(to.y - from.y);
  return deltaX >= deltaY;
}

/**
 * Convert points array to SVG path string
 */
function pointsToSvgPath(points: Position[]): string {
  const firstPoint = points[0];
  if (!firstPoint) return "";

  let d = `M ${firstPoint.x.toString()},${firstPoint.y.toString()}`;
  for (const point of points.slice(1)) {
    d += ` L ${point.x.toString()},${point.y.toString()}`;
  }

  return d;
}

/**
 * Calculate distance between two positions
 */
function calculateDistance(pos1: Position, pos2: Position): number {
  return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
}

/**
 * Check if a position is too close to any waypoint
 */
function isTooCloseToWaypoint(pos: Position, waypoints: Waypoint[], threshold = 30): boolean {
  return waypoints.some(wp => calculateDistance(pos, wp) < threshold);
}

/**
 * Parameters for handle proximity check
 */
interface HandleProximityParams {
  pos: Position;
  source: Position;
  target: Position;
  threshold?: number;
}

/**
 * Check if a position is too close to source or target (handles)
 */
function isTooCloseToHandles({ pos, source, target, threshold = 40 }: HandleProximityParams): boolean {
  const distToSource = calculateDistance(pos, source);
  const distToTarget = calculateDistance(pos, target);
  return distToSource < threshold || distToTarget < threshold;
}

/**
 * Generate candidate positions for label placement
 */
function generateCandidatePositions(points: Position[]): Position[] {
  const candidates: Position[] = [];

  // Add midpoint of each segment
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1 && p2) {
      candidates.push({
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      });
    }
  }

  // Add overall midpoint as fallback
  const midIndex = Math.floor(points.length / 2);
  const midPoint = points[midIndex];
  if (midPoint) {
    candidates.push(midPoint);
  }

  return candidates;
}

/**
 * Find candidate furthest from waypoints
 */
function findFurthestFromWaypoints(candidates: Position[], waypoints: Waypoint[], fallback: Position): Position {
  let bestCandidate = candidates[0] ?? fallback;
  let maxMinDistance = 0;

  for (const candidate of candidates) {
    const minDistToWaypoint =
      waypoints.length > 0 ? Math.min(...waypoints.map(wp => calculateDistance(candidate, wp))) : Infinity;

    if (minDistToWaypoint > maxMinDistance) {
      maxMinDistance = minDistToWaypoint;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

/**
 * Parameters for label position calculation
 */
interface LabelPositionParams {
  points: Position[];
  fallback: Position;
  waypoints?: Waypoint[];
  source?: Position;
  target?: Position;
}

/**
 * Calculate label position avoiding waypoints and handles
 * Tries to find a position on the path that is:
 * 1. Not too close to any waypoint
 * 2. Not too close to source or target handles
 * 3. Preferably in the middle of a segment
 */
function calculateLabelPosition({ points, fallback, waypoints = [], source, target }: LabelPositionParams): Position {
  if (points.length === 0) return fallback;

  const candidates = generateCandidatePositions(points);

  // Find the best candidate (not near waypoints or handles)
  if (source && target) {
    for (const candidate of candidates) {
      const notNearWaypoints = !isTooCloseToWaypoint(candidate, waypoints);
      const notNearHandles = !isTooCloseToHandles({ pos: candidate, source, target });

      if (notNearWaypoints && notNearHandles) {
        return candidate;
      }
    }
  }

  // If all candidates are too close, return the one furthest from waypoints
  return findFurthestFromWaypoints(candidates, waypoints, fallback);
}

/**
 * Build custom smooth step path using waypoints for turns
 */
function buildCustomSmoothPath({ sourceX, sourceY, targetX, targetY, waypoints }: BuildPointsParams): PathResult {
  // If no waypoints, create automatic turn waypoints
  const autoWaypoints: Waypoint[] = [];
  if (waypoints.length === 0) {
    const midX = sourceX + (targetX - sourceX) / 2;
    autoWaypoints.push(
      {
        x: midX,
        y: sourceY,
        direction: "horizontal",
        auto: true,
      },
      {
        x: midX,
        y: targetY,
        direction: "vertical",
        auto: true,
      }
    );
    waypoints = autoWaypoints;
  }

  const allPoints = buildPointsWithWaypoints({ sourceX, sourceY, targetX, targetY, waypoints });
  const path = pointsToSvgPath(allPoints);
  const labelPosition = calculateLabelPosition({
    points: allPoints,
    fallback: { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 },
    waypoints,
    source: { x: sourceX, y: sourceY },
    target: { x: targetX, y: targetY },
  });

  return {
    path,
    labelPosition,
    waypoints: autoWaypoints.length > 0 ? autoWaypoints : [],
  };
}

/**
 * Build orthogonal path with waypoints
 */
export function buildWaypointPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  waypoints,
}: BuildWaypointPathParams): PathResult {
  const allPoints = buildPointsWithWaypoints({ sourceX, sourceY, targetX, targetY, waypoints });

  // Fallback to custom smooth step if no points generated
  if (allPoints.length === 0) {
    return buildCustomSmoothPath({ sourceX, sourceY, targetX, targetY, waypoints });
  }

  const path = pointsToSvgPath(allPoints);
  const labelPosition = calculateLabelPosition({
    points: allPoints,
    fallback: { x: sourceX, y: sourceY },
    waypoints,
    source: { x: sourceX, y: sourceY },
    target: { x: targetX, y: targetY },
  });

  return {
    path,
    labelPosition,
    // Don't return waypoints here since they already exist (not auto-generated)
  };
}
