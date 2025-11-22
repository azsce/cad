/**
 * Hook for React Flow change handlers
 */

import { useCallback } from "react";
import { applyEdgeChanges, type NodeChange, type EdgeChange } from "@xyflow/react";
import { logger } from "../../utils/logger";
import { useCircuitStore } from "../../store/circuitStore";
import type { CircuitId } from "../../types/identifiers";
import type { CircuitNode, CircuitEdge } from "../../types/circuit";
import { createEdgeId } from "../../types/identifiers";

interface UseFlowChangeHandlersProps {
  circuitId: CircuitId;
  setNodes: React.Dispatch<React.SetStateAction<CircuitNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<CircuitEdge[]>>;
  applyNodeChanges: (changes: NodeChange<CircuitNode>[], nodes: CircuitNode[]) => CircuitNode[];
}

export function useFlowChangeHandlers({ circuitId, setNodes, setEdges, applyNodeChanges }: UseFlowChangeHandlersProps) {
  const onNodesChange = useCallback(
    (changes: NodeChange<CircuitNode>[]) => {
      // Access current nodes from state updater to avoid dependency on nodes
      setNodes(currentNodes => applyNodeChanges(changes, currentNodes));
    },
    [applyNodeChanges, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<CircuitEdge>[]) => {
      logger.debug({ caller: "useFlowChangeHandlers" }, "onEdgesChange", {
        changesCount: changes.length,
        changeTypes: changes.map(c => c.type),
      });

      setEdges(currentEdges => {
        const updatedEdges = applyEdgeChanges(changes, currentEdges);

        for (const change of changes) {
          if (change.type === "remove") {
            useCircuitStore.getState().deleteEdge({
              circuitId,
              edgeId: createEdgeId(change.id),
            });
          }
        }

        return updatedEdges;
      });
    },
    [circuitId, setEdges]
  );

  return { onNodesChange, onEdgesChange };
}
