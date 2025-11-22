/**
 * Hook for handling keyboard shortcuts
 */

import { useEffect } from "react";
import type { Node, Edge } from "@xyflow/react";
import { createNodeId, createEdgeId } from "../../../types/identifiers";

interface UseKeyboardShortcutsParams {
  nodes: Node[];
  edges: Edge[];
  deleteNodes: (nodeIds: ReturnType<typeof createNodeId>[]) => void;
  deleteEdges: (edgeIds: ReturnType<typeof createEdgeId>[]) => void;
}

/**
 * Handle keyboard shortcuts for deletion.
 * Delete key or Backspace: Delete selected nodes and edges.
 */
export const useKeyboardShortcuts = ({ nodes, edges, deleteNodes, deleteEdges }: UseKeyboardShortcutsParams) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Delete or Backspace key is pressed
      if (event.key === "Delete" || event.key === "Backspace") {
        // Prevent default browser behavior (e.g., navigating back)
        event.preventDefault();

        // Get selected nodes and edges from local state
        const selectedNodeIds = nodes.filter(node => node.selected).map(n => createNodeId(n.id));
        const selectedEdgeIds = edges.filter(edge => edge.selected).map(e => createEdgeId(e.id));

        // Delete via context (updates both local state and store)
        if (selectedNodeIds.length > 0) {
          deleteNodes(selectedNodeIds);
        }
        if (selectedEdgeIds.length > 0) {
          deleteEdges(selectedEdgeIds);
        }
      }
    };

    // Add event listener
    globalThis.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [nodes, edges, deleteNodes, deleteEdges]);
};
