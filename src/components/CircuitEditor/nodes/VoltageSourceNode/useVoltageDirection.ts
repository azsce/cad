/**
 * Hook for managing voltage source direction (polarity)
 */

import { useCallback } from "react";
import { useCircuitFlow } from "../../../../hooks/useCircuitFlow";
import { createNodeId } from "../../../../types/identifiers";
import { logger } from "../../../../utils/logger";

interface UseVoltageDirectionParams {
  nodeId: string;
  direction: "up" | "down";
}

export const useVoltageDirection = ({ nodeId, direction }: UseVoltageDirectionParams) => {
  const { updateNodeData } = useCircuitFlow();

  const handleDirectionToggle = useCallback(() => {
    const newDirection = direction === "up" ? "down" : "up";
    logger.debug({ caller: "useVoltageDirection" }, "Toggling direction", {
      oldDirection: direction,
      newDirection,
    });
    updateNodeData(createNodeId(nodeId), { direction: newDirection });
  }, [direction, nodeId, updateNodeData]);

  return {
    handleDirectionToggle,
  };
};
