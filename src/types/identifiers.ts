/**
 * Value objects for type-safe identifiers.
 * Addresses Primitive Obsession by wrapping string IDs in branded types.
 */

/**
 * Branded type for Circuit IDs.
 * Prevents mixing up circuit IDs with other string types.
 */
export type CircuitId = string & { readonly __brand: "CircuitId" };

/**
 * Branded type for Node IDs.
 * Prevents mixing up node IDs with other string types.
 */
export type NodeId = string & { readonly __brand: "NodeId" };

/**
 * Branded type for Edge IDs.
 * Prevents mixing up edge IDs with other string types.
 */
export type EdgeId = string & { readonly __brand: "EdgeId" };

/**
 * Create a CircuitId from a string.
 * Use this when you need to create a new circuit ID.
 */
export function createCircuitId(id: string): CircuitId {
  return id as CircuitId;
}

/**
 * Create a NodeId from a string.
 * Use this when you need to create a new node ID.
 */
export function createNodeId(id: string): NodeId {
  return id as NodeId;
}

/**
 * Create an EdgeId from a string.
 * Use this when you need to create a new edge ID.
 */
export function createEdgeId(id: string): EdgeId {
  return id as EdgeId;
}

/**
 * Generate a unique circuit ID.
 * Uses timestamp and crypto.randomUUID for uniqueness.
 */
export function generateCircuitId(): CircuitId {
  const timestamp = Date.now().toString();
  const randomPart = crypto.randomUUID().substring(0, 8);
  return createCircuitId(`circuit-${timestamp}-${randomPart}`);
}

/**
 * Generate a unique node ID.
 * Uses crypto.randomUUID for uniqueness.
 */
export function generateNodeId(): NodeId {
  return createNodeId(`node-${crypto.randomUUID()}`);
}

/**
 * Generate a unique edge ID.
 * Uses crypto.randomUUID for uniqueness.
 */
export function generateEdgeId(): EdgeId {
  return createEdgeId(`edge-${crypto.randomUUID()}`);
}
