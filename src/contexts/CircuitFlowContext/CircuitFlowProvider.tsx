/**
 * CircuitFlowProvider - Manages React Flow state independently from Zustand store.
 *
 * Strategy:
 * - Nodes/edges are maintained in local state, NOT derived from store
 * - Store is only read on initial mount to populate state
 * - All updates go through context functions that update BOTH local state AND store
 * - Position updates are batched - only sync to store when dragging stops
 */

import { useState, useCallback, useMemo, type ReactNode } from "react";
import { useReactFlow } from "@xyflow/react";
import { useApplyNodeChanges } from "../../hooks/useApplyNodeChanges";
import { useCircuitStore } from "../../store/circuitStore";
import type { CircuitId } from "../../types/identifiers";
import { CircuitFlowContext } from "../../hooks/useCircuitFlow";
import { useCircuitSync } from "./useCircuitSync";
import { useKeyboardHandler } from "./useKeyboardHandler";
import { useNodeOperations } from "./useNodeOperations";
import { useEdgeOperations } from "./useEdgeOperations";
import { useConnectionHandlers } from "./useConnectionHandlers";
import { useFlowChangeHandlers } from "./useFlowChangeHandlers";
import { useAutoFitView } from "./useAutoFitView";
import { useEdgeClickHandler } from "./useEdgeClickHandler";
import { useJunctionCleanup } from "./useJunctionCleanup";

interface CircuitFlowProviderProps {
  readonly circuitId: CircuitId;
  readonly children: ReactNode;
}

export function CircuitFlowProvider({ circuitId, children }: CircuitFlowProviderProps) {
  const reactFlowInstance = useReactFlow();

  // Helper lines state for node alignment
  const [helperLines, setHelperLines] = useState<{ horizontal?: number | undefined; vertical?: number | undefined }>(
    {}
  );

  const handleHelperLinesChange = useCallback((horizontal?: number, vertical?: number) => {
    setHelperLines({
      ...(horizontal !== undefined && { horizontal }),
      ...(vertical !== undefined && { vertical }),
    });
  }, []);

  // Sync nodes/edges with store
  const { nodes, edges, setNodes, setEdges } = useCircuitSync(circuitId);

  // Auto-fit view to nodes once per circuit
  useAutoFitView({ circuitId });

  // Apply node changes with helper lines
  const { applyNodeChanges } = useApplyNodeChanges({
    circuitId,
    onHelperLinesChange: handleHelperLinesChange,
  });

  // Handle keyboard events (Escape to cancel connection)
  useKeyboardHandler();

  // Edge CRUD operations (basic version without junction cleanup)
  const {
    addEdge,
    deleteEdges: deleteEdgesBasic,
    updateEdge,
  } = useEdgeOperations({
    circuitId,
    setEdges,
    nodes,
    deleteNodes: () => {}, // Placeholder, will be replaced
  });

  // Node CRUD operations
  const { addNode, deleteNodes, updateNodeData } = useNodeOperations({
    circuitId,
    setNodes,
    edges,
    addEdge,
    deleteEdges: deleteEdgesBasic,
  });

  // Junction cleanup hook
  const { cleanupJunctions } = useJunctionCleanup({ nodes, deleteNodes });

  // Enhanced deleteEdges that includes junction cleanup
  const deleteEdges = useCallback(
    (edgeIds: Parameters<typeof deleteEdgesBasic>[0]) => {
      // Get current edges from store to ensure we have the latest state
      const circuit = useCircuitStore.getState().circuits[circuitId];
      if (!circuit) return;

      // Delete edges
      deleteEdgesBasic(edgeIds);

      // Clean up junctions with 2 connections
      cleanupJunctions(edgeIds, circuit.edges);
    },
    [circuitId, deleteEdgesBasic, cleanupJunctions]
  );

  // Connection handlers
  const { onPaneClick, onPaneMouseMove, startConnection, onConnect } = useConnectionHandlers({
    screenToFlowPosition: reactFlowInstance.screenToFlowPosition,
    addEdge,
    addNode,
    deleteEdges,
    edges,
  });

  // Edge event handlers
  const { onEdgeClick, onEdgeMouseEnter, onEdgeMouseLeave, getEdgeStyle, isCtrlPressed, isAltPressed } =
    useEdgeClickHandler({
      screenToFlowPosition: reactFlowInstance.screenToFlowPosition,
      addNode,
      addEdge,
      updateEdge,
      deleteEdges,
      edges,
    });

  // Flow change handlers
  const { onNodesChange, onEdgesChange } = useFlowChangeHandlers({
    circuitId,
    setNodes,
    setEdges,
    applyNodeChanges,
  });

  const contextValue = useMemo(
    () => ({
      nodes,
      edges,
      helperLines,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onPaneClick,
      onPaneMouseMove,
      onEdgeClick,
      onEdgeMouseEnter,
      onEdgeMouseLeave,
      getEdgeStyle,
      isCtrlPressed,
      isAltPressed,
      startConnection,
      addNode,
      addEdge,
      updateNodeData,
      updateEdge,
      deleteNodes,
      deleteEdges,
    }),
    [
      nodes,
      edges,
      helperLines,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onPaneClick,
      onPaneMouseMove,
      onEdgeClick,
      onEdgeMouseEnter,
      onEdgeMouseLeave,
      getEdgeStyle,
      isCtrlPressed,
      isAltPressed,
      startConnection,
      addNode,
      addEdge,
      updateNodeData,
      updateEdge,
      deleteNodes,
      deleteEdges,
    ]
  );

  return <CircuitFlowContext.Provider value={contextValue}>{children}</CircuitFlowContext.Provider>;
}
