/**
 * Hook for edge CRUD operations
 */

import { useCallback } from "react";
import { logger } from "../../utils/logger";
import { useCircuitStore } from "../../store/circuitStore";
import type { CircuitEdge, CircuitNode } from "../../types/circuit";
import type { CircuitId, EdgeId, NodeId } from "../../types/identifiers";

interface UseEdgeOperationsProps {
  circuitId: CircuitId;
  setEdges: React.Dispatch<React.SetStateAction<CircuitEdge[]>>;
  nodes: CircuitNode[];
  deleteNodes: (nodeIds: NodeId[]) => void;
}

export function useEdgeOperations({ circuitId, setEdges }: UseEdgeOperationsProps) {
  const addEdge = useCallback(
    (edge: CircuitEdge) => {
      logger.debug({ caller: "useEdgeOperations" }, "addEdge", { edgeId: edge.id });

      const edgeWithType: CircuitEdge = {
        ...edge,
        type: edge.type ?? "default",
      };
      setEdges(current => [...current, edgeWithType]);
      useCircuitStore.getState().addEdge(circuitId, edge);
    },
    [circuitId, setEdges]
  );

  const deleteEdges = useCallback(
    (edgeIds: EdgeId[]) => {
      logger.debug({ caller: "useEdgeOperations" }, "deleteEdges", { count: edgeIds.length });

      // Delete edges from local state
      setEdges(current => current.filter(edge => !edgeIds.includes(edge.id)));

      // Delete edges from store
      for (const edgeId of edgeIds) {
        useCircuitStore.getState().deleteEdge({ circuitId, edgeId });
      }
    },
    [circuitId, setEdges]
  );

  const updateEdge = useCallback(
    (edgeId: EdgeId, updates: Partial<CircuitEdge>) => {
      logger.debug({ caller: "useEdgeOperations" }, "updateEdge", { edgeId, updates });

      setEdges(current =>
        current.map(edge =>
          edge.id === edgeId ? { ...edge, ...updates, data: { ...edge.data, ...updates.data } } : edge
        )
      );

      useCircuitStore.getState().updateEdge({ circuitId, edgeId }, updates);
    },
    [circuitId, setEdges]
  );

  return { addEdge, deleteEdges, updateEdge };
}
