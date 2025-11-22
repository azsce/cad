/**
 * Helper functions for CircuitFlowContext
 */

import type { Circuit, CircuitNode, CircuitEdge } from "../../types/circuit";

/**
 * Ensure nodes have required React Flow properties
 */
export function ensureNodeProperties(nodes: CircuitNode[]): CircuitNode[] {
  return nodes.map(node => ({
    ...node,
    draggable: true,
    selectable: true,
    connectable: false,
  }));
}

/**
 * Ensure edges have required React Flow properties
 */
export function ensureEdgeProperties(edges: CircuitEdge[]): CircuitEdge[] {
  return edges.map(edge => ({
    ...edge,
    type: edge.type ?? "default",
  }));
}

/**
 * Initialize nodes and edges from circuit
 */
export function initializeFromCircuit(circuit: Circuit | undefined): {
  nodes: CircuitNode[];
  edges: CircuitEdge[];
} {
  if (!circuit) {
    return { nodes: [], edges: [] };
  }

  return {
    nodes: ensureNodeProperties(circuit.nodes),
    edges: ensureEdgeProperties(circuit.edges),
  };
}
