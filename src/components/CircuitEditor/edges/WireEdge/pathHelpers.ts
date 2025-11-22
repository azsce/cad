/**
 * Helper functions for path calculation
 */

import type { Position } from "../../../../types/circuit";

/**
 * Creates orthogonal (Manhattan-style) path between two points.
 * Lines are either horizontal or vertical, never diagonal.
 */
export function createOrthogonalSegment(from: Position, to: Position, startHorizontal: boolean): Position[] {
  // If points are already aligned on one axis, just connect directly
  if (from.x === to.x || from.y === to.y) {
    return [to];
  }

  // Create intermediate point for orthogonal routing
  if (startHorizontal) {
    // Go horizontal first, then vertical
    return [{ x: to.x, y: from.y }, to];
  }

  // Go vertical first, then horizontal
  return [{ x: from.x, y: to.y }, to];
}
