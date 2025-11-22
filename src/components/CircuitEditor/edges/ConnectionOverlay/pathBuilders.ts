/**
 * Path building functions for connection overlay
 */

import type { Position, Waypoint } from "../../../../types/circuit";

/**
 * Creates orthogonal path starting with horizontal segment.
 * Returns both the path and the turn point (waypoint).
 */
export function createHorizontalFirstPath(from: Position, to: Position): string {
  // If already aligned, no turn needed
  if (from.x === to.x || from.y === to.y) {
    return `M ${from.x.toString()},${from.y.toString()} L ${to.x.toString()},${to.y.toString()}`;
  }

  // Create turn at (to.x, from.y)
  return `M ${from.x.toString()},${from.y.toString()} L ${to.x.toString()},${from.y.toString()} L ${to.x.toString()},${to.y.toString()}`;
}

/**
 * Creates orthogonal path starting with vertical segment.
 * Returns both the path and the turn point (waypoint).
 */
export function createVerticalFirstPath(from: Position, to: Position): string {
  // If already aligned, no turn needed
  if (from.x === to.x || from.y === to.y) {
    return `M ${from.x.toString()},${from.y.toString()} L ${to.x.toString()},${to.y.toString()}`;
  }

  // Create turn at (from.x, to.y)
  return `M ${from.x.toString()},${from.y.toString()} L ${from.x.toString()},${to.y.toString()} L ${to.x.toString()},${to.y.toString()}`;
}

/**
 * Determine if path should start horizontally based on waypoint or distance
 */
export function shouldStartHorizontal(from: Position, to: Waypoint | Position): boolean {
  const waypoint = to as Waypoint;
  if (waypoint.direction !== undefined) {
    return waypoint.direction === "horizontal";
  }

  const deltaX = Math.abs(to.x - from.x);
  const deltaY = Math.abs(to.y - from.y);
  return deltaX >= deltaY;
}

/**
 * Append path segment without the initial M command
 */
export function appendPathSegment(existingPath: string, newSegment: string): string {
  if (existingPath === "") {
    return newSegment;
  }
  const segmentWithoutMove = newSegment.substring(newSegment.indexOf("L"));
  return existingPath + segmentWithoutMove;
}
