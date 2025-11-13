/**
 * Core type definitions for circuit components and data structures.
 * These types represent the UI-level circuit model used by React Flow.
 */

/**
 * Component-specific data for circuit elements.
 */
export interface ComponentData {
  /** The value of the component (resistance in Ω, voltage in V, current in A) */
  value: number;
  /** Direction/polarity of the component */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Optional label for the component */
  label?: string;
}

/**
 * A circuit component node (maps to React Flow node).
 * Represents a single electrical component in the circuit.
 */
export interface CircuitNode {
  /** Unique identifier for the node */
  id: string;
  /** Type of circuit component */
  type: 'resistor' | 'voltageSource' | 'currentSource' | 'ground';
  /** Position on the canvas */
  position: { x: number; y: number };
  /** Component-specific data */
  data: ComponentData;
}

/**
 * A wire connection between circuit components (maps to React Flow edge).
 * Represents an electrical connection in the circuit.
 */
export interface CircuitEdge {
  /** Unique identifier for the edge */
  id: string;
  /** Source node ID */
  source: string;
  /** Source handle ID (terminal) */
  sourceHandle: string;
  /** Target node ID */
  target: string;
  /** Target handle ID (terminal) */
  targetHandle: string;
}

/**
 * A complete circuit design.
 * Contains all nodes, edges, and metadata for a single circuit.
 */
export interface Circuit {
  /** Unique identifier for the circuit */
  id: string;
  /** User-defined name for the circuit */
  name: string;
  /** All component nodes in the circuit */
  nodes: CircuitNode[];
  /** All wire connections in the circuit */
  edges: CircuitEdge[];
  /** Timestamp when the circuit was created */
  createdAt: number;
  /** Timestamp when the circuit was last modified */
  modifiedAt: number;
}
