/**
 * Hook for managing current source direction
 */

import { useCallback } from "react";
import { useCircuitFlow } from "../../../../hooks/useCircuitFlow";
import { createNodeId } from "../../../../types/identifiers";
import { logger } from "../../../../utils/logger";

interface UseCurrentDirectionParams {
  nodeId: string;
  direction: "up" | "down";
}

export const useCurrentDirection = ({ nodeId, direction }: UseCurrentDirectionParams) => {
  const { updateNodeData } = useCircuitFlow();

  const handleDirectionToggle = useCallback(() => {
    const newDirection = direction === "up" ? "down" : "up";
    logger.debug({ caller: "useCurrentDirection" }, "Toggling direction", {
      oldDirection: direction,
      newDirection,
    });
    updateNodeData(createNodeId(nodeId), { direction: newDirection });
  }, [direction, nodeId, updateNodeData]);

  return {
    handleDirectionToggle,
  };
};
