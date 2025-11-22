/**
 * Hook for synchronizing circuit data between store and local state
 */

import { useState, useEffect } from "react";
import { logger } from "../../utils/logger";
import { useCircuitStore } from "../../store/circuitStore";
import type { CircuitId } from "../../types/identifiers";
import type { CircuitNode, CircuitEdge } from "../../types/circuit";
import { initializeFromCircuit } from "./helpers";

/**
 * Manages local state for nodes and edges, synchronized with the circuit store
 */
export function useCircuitSync(circuitId: CircuitId) {
  const [nodes, setNodes] = useState<CircuitNode[]>(() => {
    const circuit = useCircuitStore.getState().circuits[circuitId];
    if (!circuit) {
      logger.warn({ caller: "useCircuitSync" }, "Circuit not found during init", { circuitId });
      return [];
    }
    return initializeFromCircuit(circuit).nodes;
  });

  const [edges, setEdges] = useState<CircuitEdge[]>(() => {
    const circuit = useCircuitStore.getState().circuits[circuitId];
    if (!circuit) {
      return [];
    }
    return initializeFromCircuit(circuit).edges;
  });

  // Re-initialize when circuitId changes
  useEffect(() => {
    logger.debug({ caller: "useCircuitSync" }, "Circuit changed, re-initializing", { circuitId });

    const circuit = useCircuitStore.getState().circuits[circuitId];
    if (!circuit) {
      logger.warn({ caller: "useCircuitSync" }, "Circuit not found", { circuitId });
      return;
    }

    const { nodes: circuitNodes, edges: circuitEdges } = initializeFromCircuit(circuit);

    // Use queueMicrotask to defer state updates and avoid cascading renders
    queueMicrotask(() => {
      setNodes(circuitNodes);
      setEdges(circuitEdges);

      logger.debug({ caller: "useCircuitSync" }, "Re-initialized", {
        nodesCount: circuitNodes.length,
        edgesCount: circuitEdges.length,
      });
    });
  }, [circuitId]);

  return { nodes, edges, setNodes, setEdges };
}
