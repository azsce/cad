/**
 * Hook for handling edge clicks:
 * - Ctrl+Click (NOT in connection mode): Start connection from edge
 * - Click (IN connection mode): End connection at edge
 */

import { useCallback, useState, useMemo, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Theme } from '@mui/material';
import { useConnectionStore } from '../../../../store/connectionStore';
import { useCircuitFlow } from '../../../../hooks/useCircuitFlow';
import { logger } from '../../../../utils/logger';
import { createNodeId, createEdgeId } from '../../../../types/identifiers';
import type { EdgeId, NodeId } from '../../../../types/identifiers';
import { splitEdge } from '../../../../utils/edgeSplitting';
import type { JunctionNode, CircuitEdge, CircuitNode } from '../../../../types/circuit';

/**
 * 🏗️ Creates a junction node at the specified position
 */
function createJunctionNode(position: { x: number; y: number }): JunctionNode {
  const junctionId = createNodeId(`junction-${Date.now().toString()}`);
  return {
    id: junctionId,
    type: 'junction',
    position,
    data: {},
  };
}

interface SplitEdgeParams {
  edgeId: EdgeId;
  junctionId: NodeId;
  junctionPosition: { x: number; y: number };
  edges: CircuitEdge[];
  nodes: CircuitNode[];
  deleteEdges: (ids: EdgeId[]) => void;
  addEdge: (edge: CircuitEdge) => void;
}

/**
 * ✂️ Splits an edge at a junction point
 */
function splitEdgeAtJunction(params: SplitEdgeParams): void {
  const { edgeId, junctionId, junctionPosition, edges, nodes, deleteEdges, addEdge } = params;
  
  const edgeToSplit = edges.find(e => e.id === edgeId);
  if (!edgeToSplit) return;

  const sourceNodeObj = nodes.find(n => n.id === edgeToSplit.source);
  const targetNodeObj = nodes.find(n => n.id === edgeToSplit.target);

  if (!sourceNodeObj || !targetNodeObj) return;

  const { edge1, edge2, deletedEdgeId } = splitEdge({
    originalEdge: edgeToSplit,
    junctionId,
    junctionPosition,
    sourceNodePosition: sourceNodeObj.position,
    targetNodePosition: targetNodeObj.position,
  });

  deleteEdges([deletedEdgeId]);
  addEdge(edge1);
  addEdge(edge2);
}

interface ConnectionEdgeParams {
  sourceNode: NodeId;
  sourceHandle: string;
  targetJunctionId: NodeId;
  waypoints: Array<{ x: number; y: number }>;
}

/**
 * 🔗 Creates a connection edge from source to junction
 */
function createConnectionEdge(params: ConnectionEdgeParams): CircuitEdge {
  const { sourceNode, sourceHandle, targetJunctionId, waypoints } = params;
  return {
    id: createEdgeId(`edge-${Date.now().toString()}-${crypto.randomUUID().substring(0, 8)}`),
    source: sourceNode,
    sourceHandle,
    target: targetJunctionId,
    targetHandle: 'center',
    ...(waypoints.length > 0 && { waypoints }),
  };
}

interface EdgeClickLogParams {
  isConnecting: boolean;
  edgeId: EdgeId;
  clientX: number;
  clientY: number;
}

/**
 * 📝 Logs edge click event
 */
function logEdgeClick(params: EdgeClickLogParams): void {
  logger.info({ caller: 'useWireEdgeClick' }, '🖱️ EDGE CLICKED', params);
}

/**
 * 📝 Logs connection completion
 */
function logConnectionComplete(
  junctionId: NodeId,
  splitEdgeId: EdgeId,
  newEdgeId: EdgeId
): void {
  logger.info({ caller: 'useWireEdgeClick' }, '✅ Junction created and connection completed', {
    junctionId,
    splitEdge: splitEdgeId,
    newEdgeId,
  });
}

/**
 * 🎯 Handle Ctrl+Click to start connection from edge
 */
function handleCtrlClickOnEdge(params: {
  edgeId: EdgeId;
  clickPosition: { x: number; y: number };
  edges: CircuitEdge[];
  nodes: CircuitNode[];
  addNode: (node: JunctionNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  deleteEdges: (ids: EdgeId[]) => void;
}): void {
  const { edgeId, clickPosition, edges, nodes, addNode, addEdge, deleteEdges } = params;

  logger.info({ caller: 'useWireEdgeClick' }, '🎯 Ctrl+Click on edge - Starting connection from edge', {
    edgeId,
    clickPosition,
  });

  // Create junction node at click position
  const junctionNode = createJunctionNode(clickPosition);
  addNode(junctionNode);

  // Split edge at junction
  splitEdgeAtJunction({
    edgeId,
    junctionId: junctionNode.id,
    junctionPosition: clickPosition,
    edges,
    nodes,
    deleteEdges,
    addEdge,
  });

  // Start connection FROM the junction
  useConnectionStore.getState().startConnecting(
    junctionNode.id,
    'center',
    clickPosition
  );

  logger.info({ caller: 'useWireEdgeClick' }, '✅ Connection started from junction on edge', {
    junctionId: junctionNode.id,
  });
}

/**
 * 🎯 Processes edge click to create junction and complete connection
 */
function processEdgeConnection(params: {
  edgeId: EdgeId;
  clickPosition: { x: number; y: number };
  sourceNode: NodeId;
  sourceHandle: string;
  waypoints: Array<{ x: number; y: number }>;
  edges: CircuitEdge[];
  nodes: CircuitNode[];
  addNode: (node: JunctionNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  deleteEdges: (ids: EdgeId[]) => void;
}): { junctionId: NodeId; newEdgeId: EdgeId } {
  const { edgeId, clickPosition, sourceNode, sourceHandle, waypoints, edges, nodes, addNode, addEdge, deleteEdges } = params;

  // Create and add junction node
  const junctionNode = createJunctionNode(clickPosition);
  addNode(junctionNode);

  // Split the clicked edge at junction
  splitEdgeAtJunction({
    edgeId,
    junctionId: junctionNode.id,
    junctionPosition: clickPosition,
    edges,
    nodes,
    deleteEdges,
    addEdge,
  });

  // Create and add connection edge
  const newEdge = createConnectionEdge({
    sourceNode,
    sourceHandle,
    targetJunctionId: junctionNode.id,
    waypoints,
  });
  addEdge(newEdge);

  return { junctionId: junctionNode.id, newEdgeId: newEdge.id };
}

/**
 * 🎹 Hook to track Ctrl/Cmd key state
 */
function useCtrlKeyTracking() {
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return isCtrlPressed;
}

/**
 * ✅ Check if Ctrl/Cmd key is pressed
 */
function isCtrlOrMetaPressed(event: React.MouseEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

/**
 * 🎨 Get base edge style
 */
function getBaseEdgeStyle(selected: boolean, theme: Theme) {
  return {
    strokeWidth: selected ? 3 : 2,
    stroke: selected ? theme.palette.primary.main : theme.palette.text.primary,
  };
}

/**
 * 🎨 Get highlighted edge style
 */
function getHighlightedStyle(theme: Theme, cursor: string) {
  return {
    strokeWidth: 4,
    stroke: theme.palette.success.main,
    cursor,
  };
}

/**
 * 🎨 Check if edge should be highlighted in connection mode
 */
function shouldHighlightForConnection(isConnecting: boolean, isHovered: boolean): boolean {
  return isConnecting && isHovered;
}

/**
 * 🎨 Check if edge should be highlighted for Ctrl+hover
 */
function shouldHighlightForCtrlHover(
  isConnecting: boolean,
  isCtrlPressed: boolean,
  isHovered: boolean
): boolean {
  if (isConnecting) return false;
  if (!isCtrlPressed) return false;
  return isHovered;
}

/**
 * 🎨 Generate edge style based on state
 */
function getEdgeStyle(params: {
  selected: boolean;
  theme: Theme;
  isConnecting: boolean;
  isHovered: boolean;
  isCtrlPressed: boolean;
}) {
  const { selected, theme, isConnecting, isHovered, isCtrlPressed } = params;
  
  const baseStyle = getBaseEdgeStyle(selected, theme);

  if (shouldHighlightForConnection(isConnecting, isHovered)) {
    return { ...baseStyle, ...getHighlightedStyle(theme, 'pointer') };
  }

  if (shouldHighlightForCtrlHover(isConnecting, isCtrlPressed, isHovered)) {
    return { ...baseStyle, ...getHighlightedStyle(theme, 'crosshair') };
  }

  return baseStyle;
}

/**
 * 🔗 Handle connection mode edge click
 */
function handleConnectionModeClick(params: {
  event: React.MouseEvent;
  edgeId: EdgeId;
  clickPosition: { x: number; y: number };
  edges: CircuitEdge[];
  nodes: CircuitNode[];
  addNode: (node: JunctionNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  deleteEdges: (ids: EdgeId[]) => void;
}): void {
  const { event, edgeId, clickPosition, edges, nodes, addNode, addEdge, deleteEdges } = params;
  
  logger.info({ caller: 'useWireEdgeClick' }, '✅ In connection mode, processing edge click');
  event.stopPropagation();

  const storeState = useConnectionStore.getState();
  const { sourceNode, sourceHandle, waypoints } = storeState;

  if (!sourceNode || !sourceHandle) {
    logger.error({ caller: 'useWireEdgeClick' }, 'No source for edge connection');
    return;
  }

  const result = processEdgeConnection({
    edgeId,
    clickPosition,
    sourceNode,
    sourceHandle,
    waypoints,
    edges,
    nodes,
    addNode,
    addEdge,
    deleteEdges,
  });

  useConnectionStore.getState().endConnecting();
  logConnectionComplete(result.junctionId, edgeId, result.newEdgeId);
}

export const useWireEdgeClick = (edgeId: EdgeId, selected: boolean, theme: Theme) => {
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const { screenToFlowPosition } = useReactFlow();
  const { nodes, edges, addNode, addEdge, deleteEdges } = useCircuitFlow();
  const [isHovered, setIsHovered] = useState(false);
  const isCtrlPressed = useCtrlKeyTracking();

  const handleEdgeClick = useCallback((event: React.MouseEvent) => {
    logEdgeClick({ isConnecting, edgeId, clientX: event.clientX, clientY: event.clientY });

    const clickPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const isCtrlClick = isCtrlOrMetaPressed(event);

    // CASE 1: Ctrl+Click when NOT in connection mode - START connection from edge
    if (!isConnecting && isCtrlClick) {
      event.stopPropagation();
      handleCtrlClickOnEdge({
        edgeId,
        clickPosition,
        edges: edges as CircuitEdge[],
        nodes: nodes as CircuitNode[],
        addNode,
        addEdge,
        deleteEdges,
      });
      return;
    }

    // CASE 2: Click during connection mode - END connection at edge
    if (isConnecting) {
      handleConnectionModeClick({
        event,
        edgeId,
        clickPosition,
        edges: edges as CircuitEdge[],
        nodes: nodes as CircuitNode[],
        addNode,
        addEdge,
        deleteEdges,
      });
      return;
    }

    // CASE 3: Normal click (not Ctrl, not connecting) - do nothing
    logger.debug({ caller: 'useWireEdgeClick' }, '❌ Normal edge click, ignoring');
  }, [isConnecting, edgeId, screenToFlowPosition, nodes, edges, addNode, addEdge, deleteEdges]);

  const edgeStyle = useMemo(
    () => getEdgeStyle({ selected, theme, isConnecting, isHovered, isCtrlPressed }),
    [selected, theme, isConnecting, isHovered, isCtrlPressed]
  );

  return {
    handleEdgeClick,
    isConnecting,
    edgeStyle,
    setIsHovered,
  };
};
