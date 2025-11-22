/**
 * Hook for cleaning up junctions with exactly 2 connections after edge deletion
 */

import { useCallback } from "react";
import { isJunctionNode } from "../../types/circuit";
import { logger } from "../../utils/logger";
import type { NodeId, EdgeId } from "../../types/identifiers";
import type { CircuitEdge, CircuitNode } from "../../types/circuit";

/**
 * 🔍 Find edges connected to a node
 */
function findConnectedEdges(nodeId: NodeId, edges: CircuitEdge[]): CircuitEdge[] {
  return edges.filter(e => e.source === nodeId || e.target === nodeId);
}

/**
 * 🔍 Check if junction should be deleted (has exactly 2 connections)
 */
function shouldDeleteJunction(nodeId: NodeId, edges: CircuitEdge[], alreadyMarked: NodeId[]): boolean {
  if (alreadyMarked.includes(nodeId)) return false;
  const connectedEdges = findConnectedEdges(nodeId, edges);
  return connectedEdges.length === 2;
}

/**
 * 🔍 Check node and add to deletion list if it's a junction with 2 connections
 */
function checkAndMarkJunction(
  nodeId: NodeId,
  nodes: CircuitNode[],
  edges: CircuitEdge[],
  junctionsToDelete: NodeId[]
): void {
  const node = nodes.find(n => n.id === nodeId);
  if (!node || !isJunctionNode(node)) return;

  if (shouldDeleteJunction(nodeId, edges, junctionsToDelete)) {
    junctionsToDelete.push(nodeId);
  }
}

/**
 * 🔍 Find junction nodes that should be deleted after edge deletion
 */
export function findJunctionsToDelete(edgeIds: EdgeId[], edges: CircuitEdge[], nodes: CircuitNode[]): NodeId[] {
  const junctionsToDelete: NodeId[] = [];

  for (const edgeId of edgeIds) {
    const deletedEdge = edges.find(e => e.id === edgeId);
    if (!deletedEdge) continue;

    checkAndMarkJunction(deletedEdge.source, nodes, edges, junctionsToDelete);
    checkAndMarkJunction(deletedEdge.target, nodes, edges, junctionsToDelete);
  }

  return junctionsToDelete;
}

interface UseJunctionCleanupParams {
  nodes: CircuitNode[];
  deleteNodes: (nodeIds: NodeId[]) => void;
}

/**
 * 🧹 Hook for cleaning up junctions after edge deletion
 */
export function useJunctionCleanup({ nodes, deleteNodes }: UseJunctionCleanupParams) {
  const cleanupJunctions = useCallback(
    (edgeIds: EdgeId[], edges: CircuitEdge[]) => {
      const junctionsToDelete = findJunctionsToDelete(edgeIds, edges, nodes);

      if (junctionsToDelete.length > 0) {
        logger.debug({ caller: "useJunctionCleanup" }, "Deleting junctions with 2 connections", {
          junctionIds: junctionsToDelete,
        });
        deleteNodes(junctionsToDelete);
      }
    },
    [nodes, deleteNodes]
  );

  return { cleanupJunctions };
}
