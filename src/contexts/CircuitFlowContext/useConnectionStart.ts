/**
 * Hook for starting connections
 */

import { useCallback } from "react";
import { logger } from "../../utils/logger";
import { useConnectionStore } from "../../store/connectionStore";
import type { NodeId } from "../../types/identifiers";

export function useConnectionStart() {
  const startConnection = useCallback((nodeId: NodeId, handleId: string, handlePosition: { x: number; y: number }) => {
    logger.debug({ caller: "useConnectionStart" }, "Connection started - calling store.startConnecting", {
      nodeId,
      handleId,
      handlePosition,
    });

    useConnectionStore.getState().startConnecting(nodeId, handleId, handlePosition);

    // Log the state after calling startConnecting
    const newState = useConnectionStore.getState();
    logger.debug({ caller: "useConnectionStart" }, "Connection store state after startConnecting", {
      isConnecting: newState.isConnecting,
      sourceNode: newState.sourceNode,
      sourceHandle: newState.sourceHandle,
    });
  }, []);

  return { startConnection };
}
