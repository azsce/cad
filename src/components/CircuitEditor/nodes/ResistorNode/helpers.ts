/**
 * Helper functions for ResistorNode component
 */

import { Position } from "@xyflow/react";

/**
 * Maps logical handle IDs to React Flow positions based on rotation.
 */
export const getHandlePosition = (handleId: "left" | "right", rotation: number): Position => {
  const positionMap: Record<number, Record<"left" | "right", Position>> = {
    0: { left: Position.Left, right: Position.Right },
    90: { left: Position.Top, right: Position.Bottom },
    180: { left: Position.Right, right: Position.Left },
    270: { left: Position.Bottom, right: Position.Top },
  };
  return positionMap[rotation]?.[handleId] ?? Position.Left;
};
