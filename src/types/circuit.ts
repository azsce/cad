/**
 * Core type definitions for circuit components and data structures.
 * These types represent the UI-level circuit model used by React Flow.
 */

import type { CircuitId, NodeId, EdgeId } from "./identifiers";
import { type Node, type Edge } from "@xyflow/react";

/**
 * Data for a resistor component.
 */
export type ResistorData = {
  /** Resistance value in Ohms */
  value: number;
  /** Optional label for the resistor */
  label?: string;
  /** Rotation angle in degrees (0, 90, 180, or 270) */
  rotation?: 0 | 90 | 180 | 270;
};

/**
 * Data for a voltage source component.
 */
export type VoltageSourceData = {
  /** Voltage value in Volts */
  value: number;
  /** Polarity direction */
  direction: "up" | "down";
  /** Optional label for the voltage source */
  label?: string;
  /** Rotation angle in degrees (0, 90, 180, or 270) */
  rotation?: 0 | 90 | 180 | 270;
};

/**
 * Data for a current source component.
 */
export type CurrentSourceData = {
  /** Current value in Amperes */
  value: number;
  /** Current direction */
  direction: "up" | "down";
  /** Optional label for the current source */
  label?: string;
  /** Rotation angle in degrees (0, 90, 180, or 270) */
  rotation?: 0 | 90 | 180 | 270;
};

/**
 * Data for a junction node (connection point).
 */
export type JunctionNodeData = {
  /** Optional label for the junction (e.g., "VCC", "GND", "Node A") */
  label?: string;
  /** Whether this junction is highlighted (e.g., connected to a selected edge) */
  isHighlighted?: boolean;
};

/**
 * Data for a junction visual node (purely visual representation).
 */
export type JunctionVisualNodeData = {
  /** ID of the parent junction node */
  parentJunctionId: NodeId;
  /** Whether this junction is highlighted */
  isHighlighted?: boolean;
};

/**
 * Union type for all component data types.
 */
export type ComponentData = ResistorData | VoltageSourceData | CurrentSourceData | JunctionNodeData;

/**
 * Position coordinate in the flow canvas.
 */
export interface Position {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
}

/**
 * Waypoint with metadata about how it was created.
 */
export interface Waypoint extends Position {
  /** Whether this waypoint was automatically created (true) or manually added by user (false) */
  auto?: boolean;
  /** Direction of the segment leading TO this waypoint ('horizontal' = came from horizontal movement, 'vertical' = came from vertical movement) */
  direction?: "horizontal" | "vertical";
}

/**
 * Resistor node type.
 */
export interface ResistorNode extends Node {
  id: NodeId;
  type: "resistor";
  position: { x: number; y: number };
  data: ResistorData;
}

/**
 * Voltage source node type.
 */
export interface VoltageSourceNode extends Node {
  id: NodeId;
  type: "voltageSource";
  position: { x: number; y: number };
  data: VoltageSourceData;
}

/**
 * Current source node type.
 */
export interface CurrentSourceNode extends Node {
  id: NodeId;
  type: "currentSource";
  position: { x: number; y: number };
  data: CurrentSourceData;
}

/**
 * Ground node type.
 */
export interface GroundNode extends Node {
  id: NodeId;
  type: "ground";
  position: { x: number; y: number };
  data: Record<string, never>;
}

/**
 * Junction node - represents an electrical connection point where multiple wires meet.
 * Unlike components, junctions have no electrical properties (zero impedance).
 */
export interface JunctionNode extends Node {
  id: NodeId;
  type: "junction";
  position: { x: number; y: number };
  data: JunctionNodeData;
}

/**
 * Union type for all circuit node types.
 */
export type CircuitNode = ResistorNode | VoltageSourceNode | CurrentSourceNode | GroundNode | JunctionNode;

/**
 * A wire connection between circuit components (extends React Flow edge).
 * Represents an electrical connection in the circuit.
 */
export interface CircuitEdge extends Edge {
  /** Unique identifier for the edge */
  id: EdgeId;
  /** Source node ID */
  source: NodeId;
  /** Source handle ID (terminal) */
  sourceHandle: string;
  /** Target node ID */
  target: NodeId;
  /** Target handle ID (terminal) */
  targetHandle: string;
  /** Edge data containing waypoints */
  data?: {
    /** Optional intermediate waypoints defining the edge path */
    waypoints?: Waypoint[];
  };
}

/**
 * A complete circuit design.
 * Contains all nodes, edges, and metadata for a single circuit.
 */
export interface Circuit {
  /** Unique identifier for the circuit */
  id: CircuitId;
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

/**
 * Type guard to check if a node is a junction.
 */
export function isJunctionNode(node: CircuitNode): node is JunctionNode {
  return node.type === "junction";
}
