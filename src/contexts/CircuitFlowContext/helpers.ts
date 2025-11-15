/**
 * Helper functions for CircuitFlowContext
 */

import type { Node, Edge } from '@xyflow/react';
import type { Circuit, CircuitNode, CircuitEdge } from '../../types/circuit';

/**
 * Convert store nodes to React Flow nodes
 * Ensures all required React Flow properties are present for proper initialization
 */
export function convertNodesToFlow(nodes: CircuitNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
    // These properties are required for React Flow to properly initialize nodes
    draggable: true,
    selectable: true,
    connectable: false, // We handle connections manually
  }));
}

/**
 * Convert store edges to React Flow edges
 */
export function convertEdgesToFlow(edges: CircuitEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    type: 'default',
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
    ...(edge.waypoints && { data: { waypoints: edge.waypoints } }),
  }));
}

/**
 * Initialize nodes and edges from circuit
 */
export function initializeFromCircuit(circuit: Circuit | undefined): {
  nodes: Node[];
  edges: Edge[];
} {
  if (!circuit) {
    return { nodes: [], edges: [] };
  }

  return {
    nodes: convertNodesToFlow(circuit.nodes),
    edges: convertEdgesToFlow(circuit.edges),
  };
}
