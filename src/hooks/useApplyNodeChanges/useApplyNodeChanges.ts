/**
 * Hook that provides a function to apply node changes with custom logic
 * Handles position changes, dimension changes, selection changes, and removal
 * Also calculates helper lines for node alignment during drag
 *
 * IMPORTANT: Uses React Flow's applyNodeChanges directly to maintain proper node references.
 * Side effects (store sync, helper lines) are handled separately without modifying changes.
 */

import { useCallback, useMemo } from "react";
import { type NodeChange, applyNodeChanges as applyReactFlowNodeChanges } from "@xyflow/react";
import { logger } from "../../utils/logger";
import type { CircuitId } from "../../types/identifiers";
import type { CircuitNode } from "../../types/circuit";
import { createPositionChangeHandler } from "./handlePositionChange";
import { createRemovalChangeHandler } from "./handleRemovalChange";

export interface UseApplyNodeChangesProps {
  circuitId: CircuitId;
  onHelperLinesChange?: (horizontal?: number, vertical?: number) => void;
}

/**
 * Process side effects for a single change without modifying the change itself
 */
function processSideEffects(
  change: NodeChange<CircuitNode>,
  nodes: CircuitNode[],
  handlePositionChange: ReturnType<typeof createPositionChangeHandler>,
  handleRemovalChange: ReturnType<typeof createRemovalChangeHandler>
): void {
  if (change.type === "position") {
    handlePositionChange(change, nodes);
  } else if (change.type === "remove") {
    handleRemovalChange(change);
  }
}

/**
 * Hook for applying node changes with store synchronization and helper lines
 */
export const useApplyNodeChanges = ({ circuitId, onHelperLinesChange }: UseApplyNodeChangesProps) => {
  // Create stable handler functions
  const handlePositionChange = useMemo(
    () => createPositionChangeHandler(circuitId, onHelperLinesChange),
    [circuitId, onHelperLinesChange]
  );

  const handleRemovalChange = useMemo(() => createRemovalChangeHandler(circuitId), [circuitId]);

  /**
   * Main function to apply node changes with custom logic
   * Uses React Flow's applyNodeChanges directly to maintain proper node references
   */
  const applyNodeChanges = useCallback(
    (changes: NodeChange<CircuitNode>[], nodes: CircuitNode[]): CircuitNode[] => {
      if (changes.length === 0) {
        return nodes;
      }

      logger.debug({ caller: "useApplyNodeChanges" }, "Applying node changes", {
        changesCount: changes.length,
        changeTypes: changes.map(c => c.type),
        nodesBefore: nodes.length,
      });

      // Process side effects (store sync, helper lines) for non-dimension changes
      // Dimension changes don't need side effects but should still be applied to nodes
      for (const change of changes) {
        if (change.type !== "dimensions") {
          processSideEffects(change, nodes, handlePositionChange, handleRemovalChange);
        }
      }

      // Apply ALL React Flow changes directly - this maintains proper node references
      // Including dimension changes which React Flow needs for proper rendering
      const updatedNodes = applyReactFlowNodeChanges(changes, nodes);

      logger.debug({ caller: "useApplyNodeChanges" }, "Applied node changes", {
        nodesAfter: updatedNodes.length,
      });

      return updatedNodes;
    },
    [handlePositionChange, handleRemovalChange]
  );

  return {
    applyNodeChanges,
  };
};
