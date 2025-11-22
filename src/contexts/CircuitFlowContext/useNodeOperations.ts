/**
 * Hook for node CRUD operations
 */

import { useCallback } from "react";
import { logger } from "../../utils/logger";
import { useCircuitStore } from "../../store/circuitStore";
import { mergeEdges } from "../../utils/edgeSplitting";
import { isJunctionNode } from "../../types/circuit";
import type { CircuitNode, CircuitEdge } from "../../types/circuit";
import type { CircuitId, NodeId, EdgeId } from "../../types/identifiers";

interface UseNodeOperationsProps {
  circuitId: CircuitId;
  setNodes: React.Dispatch<React.SetStateAction<CircuitNode[]>>;
  edges: CircuitEdge[];
  addEdge: (edge: CircuitEdge) => void;
  deleteEdges: (edgeIds: EdgeId[]) => void;
}

/**
 * 🔍 Find edges connected to a node
 */
function findConnectedEdges(nodeId: NodeId, edges: CircuitEdge[]): CircuitEdge[] {
  return edges.filter(e => e.source === nodeId || e.target === nodeId);
}

interface MergeTwoEdgesParams {
  edge1: CircuitEdge;
  edge2: CircuitEdge;
  junctionId: NodeId;
  deleteEdges: (edgeIds: EdgeId[]) => void;
  addEdge: (edge: CircuitEdge) => void;
}

/**
 * 🔗 Merge two edges after junction deletion
 */
function mergeTwoEdges(params: MergeTwoEdgesParams): void {
  const { edge1, edge2, junctionId, deleteEdges, addEdge } = params;

  try {
    const mergedEdge = mergeEdges(edge1, edge2, junctionId);
    deleteEdges([edge1.id, edge2.id]);
    addEdge(mergedEdge);

    logger.debug({ caller: "useNodeOperations" }, "Edges merged after junction deletion", {
      mergedEdge: mergedEdge.id,
    });
  } catch (error) {
    logger.error({ caller: "useNodeOperations" }, "Failed to merge edges", error);
    deleteEdges([edge1.id, edge2.id]);
  }
}

/**
 * 🗑️ Delete multiple edges connected to a junction
 */
function deleteMultipleEdges(connectedEdges: CircuitEdge[], deleteEdges: (edgeIds: EdgeId[]) => void): void {
  logger.warn({ caller: "useNodeOperations" }, "Deleting junction with multiple edges", {
    edgeCount: connectedEdges.length,
  });

  deleteEdges(connectedEdges.map(e => e.id));
}

interface HandleEdgeMergingParams {
  connectedEdges: CircuitEdge[];
  junctionId: NodeId;
  deleteEdges: (edgeIds: EdgeId[]) => void;
  addEdge: (edge: CircuitEdge) => void;
}

/**
 * 🔀 Handle edge merging based on connected edge count
 */
function handleEdgeMerging(params: HandleEdgeMergingParams): void {
  const { connectedEdges, junctionId, deleteEdges, addEdge } = params;

  if (connectedEdges.length === 2) {
    const [edge1, edge2] = connectedEdges;
    if (!edge1 || !edge2) return;
    mergeTwoEdges({ edge1, edge2, junctionId, deleteEdges, addEdge });
    return;
  }

  if (connectedEdges.length > 2) {
    deleteMultipleEdges(connectedEdges, deleteEdges);
  }
}

interface ProcessJunctionDeletionsParams {
  nodeIds: NodeId[];
  circuit: { nodes: CircuitNode[] };
  handleJunctionDeletion: (nodeId: NodeId) => void;
}

/**
 * 🔗 Process junction deletions for a list of node IDs
 */
function processJunctionDeletions(params: ProcessJunctionDeletionsParams): void {
  const { nodeIds, circuit, handleJunctionDeletion } = params;

  for (const nodeId of nodeIds) {
    const node = circuit.nodes.find(n => n.id === nodeId);
    if (node && isJunctionNode(node)) {
      handleJunctionDeletion(nodeId);
    }
  }
}

interface DeleteNodesFromStoreParams {
  nodeIds: NodeId[];
  circuitId: CircuitId;
}

/**
 * 🗑️ Delete nodes from store
 */
function deleteNodesFromStore(params: DeleteNodesFromStoreParams): void {
  const { nodeIds, circuitId } = params;

  for (const nodeId of nodeIds) {
    useCircuitStore.getState().deleteNode({ circuitId, nodeId });
  }
}

/**
 * 🔗 Hook for node CRUD operations
 */
export function useNodeOperations({ circuitId, setNodes, edges, addEdge, deleteEdges }: UseNodeOperationsProps) {
  const addNode = useCallback(
    (node: CircuitNode) => {
      logger.debug({ caller: "useNodeOperations" }, "addNode", { nodeId: node.id });

      const nodeWithProps = {
        ...node,
        draggable: true,
        selectable: true,
        connectable: false,
      } as CircuitNode;
      setNodes(current => [...current, nodeWithProps]);
      useCircuitStore.getState().addNode(circuitId, node);
    },
    [circuitId, setNodes]
  );

  const handleJunctionDeletion = useCallback(
    (junctionId: NodeId) => {
      const connectedEdges = findConnectedEdges(junctionId, edges);

      logger.debug({ caller: "useNodeOperations" }, "Deleting junction", {
        junctionId,
        connectedEdgeCount: connectedEdges.length,
      });

      handleEdgeMerging({ connectedEdges, junctionId, deleteEdges, addEdge });
    },
    [edges, addEdge, deleteEdges]
  );

  const deleteNodes = useCallback(
    (nodeIds: NodeId[]) => {
      logger.debug({ caller: "useNodeOperations" }, "deleteNodes", { count: nodeIds.length });

      const circuit = useCircuitStore.getState().circuits[circuitId];
      if (!circuit) return;

      processJunctionDeletions({ nodeIds, circuit, handleJunctionDeletion });
      setNodes(current => current.filter(node => !nodeIds.includes(node.id)));
      deleteNodesFromStore({ nodeIds, circuitId });
    },
    [circuitId, setNodes, handleJunctionDeletion]
  );

  const updateNodeData = useCallback(
    (nodeId: NodeId, dataUpdates: Partial<CircuitNode["data"]>) => {
      logger.debug({ caller: "useNodeOperations" }, "updateNodeData", { nodeId, dataUpdates });

      setNodes(current =>
        current.map(node => {
          if (node.id !== nodeId) return node;
          return { ...node, data: { ...node.data, ...dataUpdates } } as CircuitNode;
        })
      );

      const currentNode = useCircuitStore.getState().circuits[circuitId]?.nodes.find(n => n.id === nodeId);
      if (!currentNode) return;

      useCircuitStore.getState().updateNode(
        { circuitId, nodeId },
        {
          data: { ...currentNode.data, ...dataUpdates },
        }
      );
    },
    [circuitId, setNodes]
  );

  return { addNode, deleteNodes, updateNodeData };
}
