/**
 * Handler for node position changes - side effects only
 */

import type { NodePositionChange } from "@xyflow/react";
import { logger } from "../../utils/logger";
import { useCircuitStore } from "../../store/circuitStore";
import { createNodeId } from "../../types/identifiers";
import type { CircuitId } from "../../types/identifiers";
import type { CircuitNode } from "../../types/circuit";
import { calculateHelperLines } from "./calculateHelperLines";

/**
 * Handle position changes - sync to store when drag ends, calculate helper lines during drag
 * This function only handles side effects and does not modify the change object
 */
export function createPositionChangeHandler(
  circuitId: CircuitId,
  onHelperLinesChange?: (horizontal?: number, vertical?: number) => void
) {
  return (change: NodePositionChange, nodes: CircuitNode[]): void => {
    if (!change.position) {
      return;
    }

    // Update position during drag - no store sync
    if (change.dragging) {
      logger.debug({ caller: "useApplyNodeChanges" }, "Position change during drag", {
        nodeId: change.id,
        position: change.position,
      });

      // Calculate and show helper lines
      if (onHelperLinesChange) {
        const helperLines = calculateHelperLines(change, nodes);
        onHelperLinesChange(helperLines.horizontal, helperLines.vertical);
      }

      return;
    }

    // Drag ended: sync to store and clear helper lines
    const position = change.position;
    queueMicrotask(() => {
      logger.debug({ caller: "useApplyNodeChanges" }, "Syncing position to store", {
        nodeId: change.id,
        position,
      });
      useCircuitStore.getState().updateNode(
        {
          circuitId,
          nodeId: createNodeId(change.id),
        },
        { position }
      );
    });

    // Clear helper lines
    if (onHelperLinesChange) {
      onHelperLinesChange(undefined, undefined);
    }
  };
}
