/**
 * Helper functions for VoltageSourceNode component
 */

import { Position } from "@xyflow/react";

/**
 * Maps logical handle IDs to React Flow positions based on rotation.
 */
export const getHandlePosition = (handleId: "top" | "bottom", rotation: number): Position => {
  const positionMap: Record<number, Record<"top" | "bottom", Position>> = {
    0: { top: Position.Top, bottom: Position.Bottom },
    90: { top: Position.Right, bottom: Position.Left },
    180: { top: Position.Bottom, bottom: Position.Top },
    270: { top: Position.Left, bottom: Position.Right },
  };
  return positionMap[rotation]?.[handleId] ?? Position.Top;
};
