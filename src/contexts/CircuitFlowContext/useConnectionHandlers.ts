/**
 * Hook for connection-related event handlers
 * Composes smaller, focused hooks for better maintainability
 */

import type { CircuitEdge, JunctionNode } from "../../types/circuit";
import type { EdgeId } from "../../types/identifiers";
import { usePaneHandlers } from "./usePaneHandlers";
import { useConnectionStart } from "./useConnectionStart";
import { useConnectionComplete } from "./useConnectionComplete";

interface UseConnectionHandlersProps {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  addEdge: (edge: CircuitEdge) => void;
  addNode: (node: JunctionNode) => void;
  deleteEdges: (edgeIds: EdgeId[]) => void;
  edges: CircuitEdge[];
}

/**
 * Aggregates all connection-related handlers into a single hook
 */
export function useConnectionHandlers({
  screenToFlowPosition,
  addEdge,
  addNode,
  deleteEdges,
  edges,
}: UseConnectionHandlersProps) {
  const { onPaneClick, onPaneMouseMove } = usePaneHandlers({ screenToFlowPosition });
  const { startConnection } = useConnectionStart();
  const { onConnect } = useConnectionComplete({ addEdge, addNode, deleteEdges, edges });

  return { onPaneClick, onPaneMouseMove, startConnection, onConnect };
}
