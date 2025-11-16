/**
 * CircuitFlowProvider - Manages React Flow state independently from Zustand store.
 * 
 * Strategy:
 * - Nodes/edges are maintained in local state, NOT derived from store
 * - Store is only read on initial mount to populate state
 * - All updates go through context functions that update BOTH local state AND store
 * - Position updates are batched - only sync to store when dragging stops
 */

import { useState, useCallback, type ReactNode } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useApplyNodeChanges } from '../../hooks/useApplyNodeChanges';
import type { CircuitId } from '../../types/identifiers';
import type { CircuitEdge } from '../../types/circuit';
import { CircuitFlowContext, type CircuitFlowContextValue } from '../../hooks/useCircuitFlow';
import { useCircuitSync } from './useCircuitSync';
import { useKeyboardHandler } from './useKeyboardHandler';
import { useNodeOperations } from './useNodeOperations';
import { useEdgeOperations } from './useEdgeOperations';
import { useConnectionHandlers } from './useConnectionHandlers';
import { useFlowChangeHandlers } from './useFlowChangeHandlers';
import { useAutoFitView } from './useAutoFitView';
import { useEdgeClickHandler } from './useEdgeClickHandler';

interface CircuitFlowProviderProps {
  readonly circuitId: CircuitId;
  readonly children: ReactNode;
}

export function CircuitFlowProvider({ circuitId, children }: CircuitFlowProviderProps) {
  const reactFlowInstance = useReactFlow();
  
  // Helper lines state for node alignment
  const [helperLines, setHelperLines] = useState<{ horizontal?: number | undefined; vertical?: number| undefined }>({});

  const handleHelperLinesChange = useCallback((horizontal?: number, vertical?: number) => {
    setHelperLines({ 
      ...(horizontal !== undefined && { horizontal }),
      ...(vertical !== undefined && { vertical }),
    });
  }, []);

  // Sync nodes/edges with store
  const { nodes, edges, setNodes, setEdges } = useCircuitSync(circuitId);

  // Auto-fit view to nodes on initial render and circuit change
  useAutoFitView({ nodes });

  // Apply node changes with helper lines
  const { applyNodeChanges } = useApplyNodeChanges({ 
    circuitId,
    onHelperLinesChange: handleHelperLinesChange,
  });

  // Handle keyboard events (Escape to cancel connection)
  useKeyboardHandler();

  // Edge CRUD operations (must come before node operations)
  const { addEdge, deleteEdges, updateEdge } = useEdgeOperations({ circuitId, setEdges });

  // Node CRUD operations
  const { addNode, deleteNodes, updateNodeData } = useNodeOperations({ 
    circuitId, 
    setNodes, 
    edges, 
    addEdge, 
    deleteEdges 
  });

  // Connection handlers
  const { onPaneClick, onPaneMouseMove, startConnection, onConnect } = useConnectionHandlers({
    screenToFlowPosition: reactFlowInstance.screenToFlowPosition,
    addEdge,
    addNode,
    deleteEdges,
    edges: edges as CircuitEdge[],
    nodes,
  });

  // Edge click handler
  const { onEdgeClick } = useEdgeClickHandler({
    screenToFlowPosition: reactFlowInstance.screenToFlowPosition,
    addNode,
    addEdge,
    deleteEdges,
    edges: edges as CircuitEdge[],
  });

  // Flow change handlers
  const { onNodesChange, onEdgesChange } = useFlowChangeHandlers({
    circuitId,
    setNodes,
    setEdges,
    applyNodeChanges,
  });

  const value: CircuitFlowContextValue = {
    nodes,
    edges,
    helperLines,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onPaneClick,
    onPaneMouseMove,
    onEdgeClick,
    startConnection,
    addNode,
    addEdge,
    updateNodeData,
    updateEdge,
    deleteNodes,
    deleteEdges,
  };
  
  return (
    <CircuitFlowContext.Provider value={value}>
      {children}
    </CircuitFlowContext.Provider>
  );
}
