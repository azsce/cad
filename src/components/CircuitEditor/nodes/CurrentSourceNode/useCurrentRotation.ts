/**
 * Hook for managing current source rotation
 */

import { useCallback } from "react";
import { useCircuitFlow } from "../../../../hooks/useCircuitFlow";
import { createNodeId } from "../../../../types/identifiers";

interface UseCurrentRotationParams {
  nodeId: string;
  rotation: number;
}

export const useCurrentRotation = ({ nodeId, rotation }: UseCurrentRotationParams) => {
  const { updateNodeData } = useCircuitFlow();

  const handleRotateClockwise = useCallback(() => {
    const newRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
    updateNodeData(createNodeId(nodeId), { rotation: newRotation });
  }, [rotation, nodeId, updateNodeData]);

  const handleRotateCounterClockwise = useCallback(() => {
    const newRotation = ((rotation - 90 + 360) % 360) as 0 | 90 | 180 | 270;
    updateNodeData(createNodeId(nodeId), { rotation: newRotation });
  }, [rotation, nodeId, updateNodeData]);

  return {
    handleRotateClockwise,
    handleRotateCounterClockwise,
  };
};
