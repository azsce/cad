/**
 * Handler for node removal changes - side effects only
 */

import type { NodeChange } from "@xyflow/react";
import { logger } from "../../utils/logger";
import { useCircuitStore } from "../../store/circuitStore";
import { createNodeId } from "../../types/identifiers";
import type { CircuitId } from "../../types/identifiers";

/**
 * Handle removal changes - sync to store immediately
 * This function only handles side effects and does not modify the change object
 */
export function createRemovalChangeHandler(circuitId: CircuitId) {
  return (change: NodeChange): void => {
    if (change.type === "remove") {
      logger.debug({ caller: "useApplyNodeChanges" }, "Removing node", {
        nodeId: change.id,
      });
      useCircuitStore.getState().deleteNode({
        circuitId,
        nodeId: createNodeId(change.id),
      });
    }
  };
}
