/**
 * Hook for handling edge deletion
 */

import { useCallback } from "react";
import { useCircuitFlow } from "../../../../hooks/useCircuitFlow";
import { createEdgeId } from "../../../../types/identifiers";

export const useWireEdgeDelete = (edgeId: string) => {
  const { deleteEdges } = useCircuitFlow();

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteEdges([createEdgeId(edgeId)]);
    },
    [edgeId, deleteEdges]
  );

  return { handleDelete };
};
