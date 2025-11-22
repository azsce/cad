/**
 * Hook for managing voltage value editing
 */

import { useState, useCallback } from "react";
import { useCircuitFlow } from "../../../../hooks/useCircuitFlow";
import { createNodeId } from "../../../../types/identifiers";

interface UseVoltageValueParams {
  nodeId: string;
  currentValue: number;
}

export const useVoltageValue = ({ nodeId, currentValue }: UseVoltageValueParams) => {
  const { updateNodeData } = useCircuitFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentValue.toString());

  const handleValueChange = useCallback(
    (newValue: string) => {
      const parsed = Number.parseFloat(newValue);
      if (!Number.isNaN(parsed) && parsed > 0) {
        updateNodeData(createNodeId(nodeId), { value: parsed });
      }
    },
    [nodeId, updateNodeData]
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    handleValueChange(editValue);
  }, [editValue, handleValueChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setIsEditing(false);
        handleValueChange(editValue);
      } else if (e.key === "Escape") {
        setIsEditing(false);
        setEditValue(currentValue.toString());
      }
    },
    [currentValue, editValue, handleValueChange]
  );

  return {
    isEditing,
    setIsEditing,
    editValue,
    setEditValue,
    handleBlur,
    handleKeyDown,
  };
};
