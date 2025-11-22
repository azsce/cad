/**
 * Hook for automatically fitting the view to nodes
 * Triggers ONCE per circuit ID or when nodes appear (0 -> 1+)
 */

import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import type { CircuitId } from "../../types/identifiers";
import { logger } from "../../utils/logger";

interface UseAutoFitViewOptions {
  readonly circuitId: CircuitId;
  readonly enabled?: boolean;
  readonly padding?: number;
}

/**
 * Automatically fits the view to show all nodes when circuit changes or nodes appear
 * Gets nodes directly from React Flow instance
 * @param circuitId - Current circuit ID to track changes
 * @param enabled - Whether auto-fit is enabled (default: true)
 * @param padding - Padding around nodes as a fraction (default: 0.5 = 50%)
 */
export function useAutoFitView({ circuitId, enabled = true, padding = 0.5 }: UseAutoFitViewOptions) {
  const { fitView, getNodes } = useReactFlow();
  const fittedCircuits = useRef(new Set<CircuitId>());
  const lastNodeCount = useRef(0);
  const lastCircuitId = useRef<CircuitId | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const nodes = getNodes();
    const currentCount = nodes.length;
    const hadNodesNowHasNodes = lastNodeCount.current === 0 && currentCount > 0;
    const circuitChanged = lastCircuitId.current !== circuitId;
    const isNewCircuit = !fittedCircuits.current.has(circuitId);

    logger.debug({ caller: "useAutoFitView" }, "Effect triggered", {
      circuitId,
      currentCount,
      hadNodesNowHasNodes,
      circuitChanged,
      isNewCircuit,
      lastNodeCount: lastNodeCount.current,
      lastCircuitId: lastCircuitId.current,
    });

    lastNodeCount.current = currentCount;
    lastCircuitId.current = circuitId;

    if (currentCount === 0) {
      logger.debug({ caller: "useAutoFitView" }, "Skipping: no nodes");
      return;
    }

    if (!isNewCircuit && !hadNodesNowHasNodes) {
      logger.debug({ caller: "useAutoFitView" }, "Skipping: already fitted and no new nodes");
      return;
    }

    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      logger.debug({ caller: "useAutoFitView" }, "Calling fitView", { nodeCount: nodes.length });

      fitView({
        padding,
        duration: 0,
        minZoom: 0.1,
        maxZoom: 1.5,
        nodes: nodes.map(node => ({ id: node.id })),
      })
        .then(() => {
          // Only mark as fitted after successful fit with nodes
          fittedCircuits.current.add(circuitId);

          logger.debug({ caller: "useAutoFitView" }, "Fitted view to nodes SUCCESS", {
            circuitId,
            nodeCount: nodes.length,
            padding,
            reason: isNewCircuit ? "new circuit" : "nodes appeared",
          });
        })
        .catch((error: unknown) => {
          logger.warn({ caller: "useAutoFitView" }, "Error fitting view", { error });
        });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [circuitId, enabled, padding, fitView, getNodes]);
}
