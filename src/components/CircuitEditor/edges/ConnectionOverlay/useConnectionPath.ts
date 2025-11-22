/**
 * Hook for building connection path with waypoints
 */

import { useMemo } from "react";
import type { Position, Waypoint } from "../../../../types/circuit";
import {
  createHorizontalFirstPath,
  createVerticalFirstPath,
  shouldStartHorizontal,
  appendPathSegment,
} from "./pathBuilders";

type Direction = "horizontal" | "vertical";

interface UseConnectionPathParams {
  sourcePosition: Position | null;
  cursorPosition: Position | null;
  waypoints: Waypoint[];
  lastDirection: Direction | null;
}

/**
 * Build path through waypoints
 */
function buildPathThroughWaypoints(
  sourcePosition: Position,
  waypoints: Waypoint[],
  cursorPosition: Position,
  lastDirection: Direction | null
): string {
  let path = "";
  let currentPos = sourcePosition;

  for (const waypoint of waypoints) {
    const useHorizontal = shouldStartHorizontal(currentPos, waypoint);
    const segment = useHorizontal
      ? createHorizontalFirstPath(currentPos, waypoint)
      : createVerticalFirstPath(currentPos, waypoint);

    path = appendPathSegment(path, segment);
    currentPos = waypoint;
  }

  // Final segment to cursor
  const useFinalHorizontal = determineFinalDirection(currentPos, cursorPosition, lastDirection);
  const finalSegment = useFinalHorizontal
    ? createHorizontalFirstPath(currentPos, cursorPosition)
    : createVerticalFirstPath(currentPos, cursorPosition);

  return appendPathSegment(path, finalSegment);
}

/**
 * Determine direction for final segment
 */
function determineFinalDirection(from: Position, to: Position, lastDirection: Direction | null): boolean {
  if (lastDirection) {
    return lastDirection === "vertical";
  }

  const deltaX = Math.abs(to.x - from.x);
  const deltaY = Math.abs(to.y - from.y);
  return deltaX >= deltaY;
}

/**
 * Build simple path without waypoints
 */
function buildSimplePath(sourcePosition: Position, cursorPosition: Position, lastDirection: Direction | null): string {
  const useHorizontal =
    lastDirection === null ? shouldStartHorizontal(sourcePosition, cursorPosition) : lastDirection === "horizontal";

  return useHorizontal
    ? createHorizontalFirstPath(sourcePosition, cursorPosition)
    : createVerticalFirstPath(sourcePosition, cursorPosition);
}

export const useConnectionPath = ({
  sourcePosition,
  cursorPosition,
  waypoints,
  lastDirection,
}: UseConnectionPathParams) => {
  return useMemo(() => {
    if (!sourcePosition || !cursorPosition) {
      return "";
    }

    if (waypoints.length > 0) {
      return buildPathThroughWaypoints(sourcePosition, waypoints, cursorPosition, lastDirection);
    }

    return buildSimplePath(sourcePosition, cursorPosition, lastDirection);
  }, [sourcePosition, waypoints, cursorPosition, lastDirection]);
};
