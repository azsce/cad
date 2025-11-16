/**
 * 🖱️ Hook for handling edge clicks during connection mode.
 * When user clicks an edge while connecting, creates a junction and completes the connection.
 */

import { useCallback } from 'react';
import type { Edge } from '@xyflow/react';
import { useConnectionStore } from '../../store/connectionStore';
import { logger } from '../../utils/logger';
import type { CircuitNode, CircuitEdge, JunctionNode, Waypoint, Position } from '../../types/circuit';
import type { NodeId, EdgeId } from '../../types/identifiers';

interface UseEdgeClickHandlerParams {
  screenToFlowPosition: (screenPosition: { x: number; y: number }) => { x: number; y: number };
  addNode: (node: CircuitNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  deleteEdges: (edgeIds: EdgeId[]) => void;
  edges: CircuitEdge[];
}

/**
 * Generate a unique junction node ID
 */
function generateJunctionId(): NodeId {
  const timestamp = Date.now().toString();
  return `J${timestamp}` as NodeId;
}

/**
 * Generate a unique edge ID
 * Using Math.random() is safe here for generating unique IDs (not for security)
 */
function generateEdgeId(): EdgeId {
  const timestamp = Date.now().toString();
  // eslint-disable-next-line sonarjs/pseudo-random
  const random = Math.floor(Math.random() * 1000000).toString();
  return `edge-${timestamp}-${random}` as EdgeId;
}

/**
 * 🏗️ Create a junction node at the specified position
 */
function createJunctionNode(position: Position): JunctionNode {
  return {
    id: generateJunctionId(),
    type: 'junction',
    position,
    data: {},
  };
}

/**
 * ✂️ Create edges to split an existing edge through a junction
 */
function createSplitEdges(
  clickedEdge: CircuitEdge,
  junctionId: NodeId
): [CircuitEdge, CircuitEdge] {
  const edge1: CircuitEdge = {
    id: generateEdgeId(),
    source: clickedEdge.source,
    sourceHandle: clickedEdge.sourceHandle,
    target: junctionId,
    targetHandle: 'center',
    ...(clickedEdge.waypoints && { waypoints: clickedEdge.waypoints }),
  };

  const edge2: CircuitEdge = {
    id: generateEdgeId(),
    source: junctionId,
    sourceHandle: 'center',
    target: clickedEdge.target,
    targetHandle: clickedEdge.targetHandle,
  };

  return [edge1, edge2];
}

/**
 * 🔗 Create connection edge from source to junction
 */
function createConnectionEdge(
  sourceNode: NodeId,
  sourceHandle: string,
  junctionId: NodeId,
  waypoints: Waypoint[]
): CircuitEdge {
  return {
    id: generateEdgeId(),
    source: sourceNode,
    sourceHandle: sourceHandle,
    target: junctionId,
    targetHandle: 'center',
    ...(waypoints.length > 0 && { waypoints }),
  };
}

/**
 * ✅ Validate connection state before processing edge click
 */
function validateConnectionState(
  isConnecting: boolean,
  sourceNode: NodeId | null,
  sourceHandle: string | null
): { valid: false } | { valid: true; sourceNode: NodeId; sourceHandle: string } {
  if (!isConnecting) {
    logger.debug({ caller: 'useEdgeClickHandler' }, '🖱️ Edge clicked (not connecting)');
    return { valid: false };
  }

  if (!sourceNode || !sourceHandle) {
    logger.warn({ caller: 'useEdgeClickHandler' }, '⚠️ No source node/handle in connection state');
    return { valid: false };
  }

  return { valid: true, sourceNode, sourceHandle };
}

/**
 * 🔍 Find and validate clicked edge
 */
function findClickedEdge(
  edgeId: string,
  edges: CircuitEdge[]
): CircuitEdge | undefined {
  const clickedEdge = edges.find((e) => e.id === edgeId);
  
  if (!clickedEdge) {
    logger.error({ caller: 'useEdgeClickHandler' }, '❌ Clicked edge not found in edges array', {
      edgeId,
    });
  }
  
  return clickedEdge;
}

/**
 * 🏗️ Create junction and complete connection
 */
function createJunctionAndConnect(params: {
  clickedEdge: CircuitEdge;
  flowPosition: Position;
  sourceNode: NodeId;
  sourceHandle: string;
  finalWaypoints: Waypoint[];
  addNode: (node: CircuitNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  deleteEdges: (edgeIds: EdgeId[]) => void;
}): void {
  const {
    clickedEdge,
    flowPosition,
    sourceNode,
    sourceHandle,
    finalWaypoints,
    addNode,
    addEdge,
    deleteEdges,
  } = params;

  // Create junction node at click position
  const junctionNode = createJunctionNode(flowPosition);

  // Delete the clicked edge
  deleteEdges([clickedEdge.id]);

  // Create two new edges to split the clicked edge through the junction
  const [edge1, edge2] = createSplitEdges(clickedEdge, junctionNode.id);

  // Create connection edge from source to junction
  const connectionEdge = createConnectionEdge(
    sourceNode,
    sourceHandle,
    junctionNode.id,
    finalWaypoints
  );

  // Add everything to the circuit
  addNode(junctionNode);
  addEdge(edge1);
  addEdge(edge2);
  addEdge(connectionEdge);

  logger.info({ caller: 'useEdgeClickHandler' }, '✅ Junction created and connection completed!', {
    junctionId: junctionNode.id,
    splitEdges: [edge1.id, edge2.id],
    connectionEdge: connectionEdge.id,
    waypointsUsed: finalWaypoints.length,
  });
}

export function useEdgeClickHandler({ 
  screenToFlowPosition, 
  addNode, 
  addEdge, 
  deleteEdges,
  edges,
}: UseEdgeClickHandlerParams) {
  const isConnecting = useConnectionStore((state) => state.isConnecting);
  const sourceNode = useConnectionStore((state) => state.sourceNode);
  const sourceHandle = useConnectionStore((state) => state.sourceHandle);
  const waypoints = useConnectionStore((state) => state.waypoints);
  const endConnecting = useConnectionStore((state) => state.endConnecting);

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      logger.info({ caller: 'useEdgeClickHandler' }, '🎯 EDGE CLICK HANDLER CALLED!', {
        edgeId: edge.id,
        isConnecting,
        clientX: event.clientX,
        clientY: event.clientY,
        target: (event.target as Element).tagName,
        currentTarget: (event.currentTarget as Element).tagName,
      });

      // Validate connection state
      const validationResult = validateConnectionState(isConnecting, sourceNode, sourceHandle);
      if (!validationResult.valid) {
        return;
      }

      const { sourceNode: validSourceNode, sourceHandle: validSourceHandle } = validationResult;

      logger.info({ caller: 'useEdgeClickHandler' }, '🖱️ EDGE CLICKED (connection mode) - Creating junction!', {
        edgeId: edge.id,
        sourceNode: validSourceNode,
        sourceHandle: validSourceHandle,
        clientX: event.clientX,
        clientY: event.clientY,
      });

      // Convert screen coordinates to flow coordinates
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Find the clicked edge
      const clickedEdge = findClickedEdge(edge.id, edges);
      if (!clickedEdge) {
        return;
      }

      logger.info({ caller: 'useEdgeClickHandler' }, '📍 Creating junction at click position', {
        flowPosition,
        clickedEdge: {
          id: clickedEdge.id,
          source: clickedEdge.source,
          target: clickedEdge.target,
        },
      });

      // End connection and get waypoints
      const connectionResult = endConnecting();
      const finalWaypoints = connectionResult?.waypoints ?? waypoints;

      // Create junction and complete connection
      createJunctionAndConnect({
        clickedEdge,
        flowPosition,
        sourceNode: validSourceNode,
        sourceHandle: validSourceHandle,
        finalWaypoints,
        addNode,
        addEdge,
        deleteEdges,
      });

      // Prevent event from bubbling to pane click handler
      event.stopPropagation();
    },
    [isConnecting, sourceNode, sourceHandle, waypoints, endConnecting, screenToFlowPosition, addNode, addEdge, deleteEdges, edges]
  );

  return { onEdgeClick };
}
