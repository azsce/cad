/**
 * Hook for completing connections
 */

import { useCallback } from "react";
import type { Connection } from "@xyflow/react";
import { logger } from "../../utils/logger";
import { useConnectionStore } from "../../store/connectionStore";
import { useCircuitStore } from "../../store/circuitStore";
import { splitEdge } from "../../utils/edgeSplitting";
import type { CircuitEdge, Waypoint, Position, JunctionNode } from "../../types/circuit";
import { createNodeId, createEdgeId, type NodeId, type EdgeId } from "../../types/identifiers";

interface UseConnectionCompleteProps {
  addEdge: (edge: CircuitEdge) => void;
  addNode: (node: JunctionNode) => void;
  deleteEdges: (edgeIds: EdgeId[]) => void;
  edges: CircuitEdge[];
}

/**
 * Validated connection with all required fields
 */
interface ValidatedConnection {
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

/**
 * ✅ Type guard to validate that a connection has all required fields
 */
function isValidConnection(connection: Connection): connection is ValidatedConnection {
  return Boolean(connection.source && connection.target && connection.sourceHandle && connection.targetHandle);
}

/**
 * 🏗️ Creates a new edge from a completed connection
 * Auto-generates waypoints at turn points if no waypoints exist
 */
function createEdgeFromConnection(connection: ValidatedConnection, waypoints: Waypoint[]): CircuitEdge {
  const timestamp = Date.now().toString();
  const randomPart = crypto.randomUUID().substring(0, 8);

  const edge: CircuitEdge = {
    id: createEdgeId(`edge-${timestamp}-${randomPart}`),
    source: createNodeId(connection.source),
    sourceHandle: connection.sourceHandle,
    target: createNodeId(connection.target),
    targetHandle: connection.targetHandle,
  };

  // Always add waypoints if any exist (including auto-generated ones)
  // The WireEdge component will auto-generate waypoints for turns if needed
  if (waypoints.length > 0) {
    edge.data = {
      waypoints,
    };
  }

  return edge;
}

interface SplitEdgeAtJunctionParams {
  edgeToSplit: CircuitEdge;
  junctionId: NodeId;
  junctionPosition: Position;
  deleteEdges: (edgeIds: EdgeId[]) => void;
  addEdge: (edge: CircuitEdge) => void;
}

/**
 * ✂️ Split edge at junction and update circuit
 */
function splitEdgeAtJunction(params: SplitEdgeAtJunctionParams): void {
  const { edgeToSplit, junctionId, junctionPosition, deleteEdges, addEdge } = params;

  const { edge1, edge2, deletedEdgeId } = splitEdge({
    originalEdge: edgeToSplit,
    junctionId,
    junctionPosition,
  });

  deleteEdges([deletedEdgeId]);
  addEdge(edge1);
  addEdge(edge2);

  logger.debug({ caller: "useConnectionComplete" }, "Edge split at junction", {
    originalEdge: deletedEdgeId,
    newEdges: [edge1.id, edge2.id],
  });
}

/**
 * 🏗️ Create edge from source to junction
 */
function createSourceToJunctionEdge(
  sourceNode: NodeId,
  sourceHandle: string,
  junctionId: NodeId,
  waypoints: Waypoint[]
): CircuitEdge {
  return {
    id: createEdgeId(`edge-${Date.now().toString()}-${crypto.randomUUID().substring(0, 8)}`),
    source: sourceNode,
    sourceHandle,
    target: junctionId,
    targetHandle: "center",
    ...(waypoints.length > 0 && { waypoints }),
  };
}

interface HandleEdgeConnectionParams {
  temporaryJunction: { position: Position; edgeId: string };
  waypoints: Waypoint[];
  edges: CircuitEdge[];
  addNode: (node: JunctionNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  deleteEdges: (edgeIds: EdgeId[]) => void;
}

/**
 * 🔗 Handle connection to edge (create junction and split)
 */
function handleEdgeConnection(params: HandleEdgeConnectionParams): void {
  const { temporaryJunction, waypoints, edges, addNode, addEdge, deleteEdges } = params;

  const sourceNode = useConnectionStore.getState().sourceNode;
  const sourceHandle = useConnectionStore.getState().sourceHandle;

  if (!sourceNode || !sourceHandle) {
    logger.error({ caller: "useConnectionComplete" }, "No source for edge connection");
    return;
  }

  // Create junction node
  const junctionId = createNodeId(`junction-${Date.now().toString()}`);
  const junctionNode: JunctionNode = {
    id: junctionId,
    type: "junction",
    position: temporaryJunction.position,
    data: {},
  };

  addNode(junctionNode);

  // Find and split the edge
  const edgeToSplit = edges.find(e => e.id === temporaryJunction.edgeId);
  if (!edgeToSplit) return;

  splitEdgeAtJunction({
    edgeToSplit,
    junctionId,
    junctionPosition: temporaryJunction.position,
    deleteEdges,
    addEdge,
  });

  // Create edge from source to junction
  const newEdge = createSourceToJunctionEdge(sourceNode, sourceHandle, junctionId, waypoints);
  addEdge(newEdge);

  logger.debug({ caller: "useConnectionComplete" }, "Junction created on edge", {
    junctionId,
    edgeId: temporaryJunction.edgeId,
  });
}

/**
 * 🔗 Hook for completing connections (CC=4, 28 lines)
 */
export function useConnectionComplete({ addEdge, addNode, deleteEdges, edges }: UseConnectionCompleteProps) {
  const activeCircuitId = useCircuitStore(state => state.activeCircuitId);

  const onConnect = useCallback(
    (connection: Connection) => {
      const result = useConnectionStore.getState().endConnecting();
      if (!result) return;

      const { waypoints, temporaryJunction } = result;

      logger.debug({ caller: "useConnectionComplete" }, "Connection completed", {
        connection,
        waypointCount: waypoints.length,
        hasTemporaryJunction: Boolean(temporaryJunction),
      });

      // Case 1: Connection to edge (create junction and split edge)
      if (temporaryJunction && activeCircuitId) {
        handleEdgeConnection({
          temporaryJunction,
          waypoints,
          edges,
          addNode,
          addEdge,
          deleteEdges,
        });
        return;
      }

      // Case 2: Normal handle-to-handle or handle-to-junction connection
      if (!isValidConnection(connection)) return;

      const newEdge = createEdgeFromConnection(connection, waypoints);
      addEdge(newEdge);
    },
    [addEdge, addNode, deleteEdges, edges, activeCircuitId]
  );

  return { onConnect };
}
