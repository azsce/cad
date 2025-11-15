/**
 * Core type definitions for circuit components and data structures.
 * These types represent the UI-level circuit model used by React Flow.
 */

import type { CircuitId, NodeId, EdgeId } from './identifiers';
import { type Node } from '@xyflow/react';

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
}

/**
 * Data for a voltage source component.
 */
export type VoltageSourceData = {
  /** Voltage value in Volts */
  value: number;
  /** Polarity direction */
  direction: 'up' | 'down';
  /** Optional label for the voltage source */
  label?: string;
  /** Rotation angle in degrees (0, 90, 180, or 270) */
  rotation?: 0 | 90 | 180 | 270;
} 

/**
 * Data for a current source component.
 */
export type CurrentSourceData = {
  /** Current value in Amperes */
  value: number;
  /** Current direction */
  direction: 'up' | 'down';
  /** Optional label for the current source */
  label?: string;
  /** Rotation angle in degrees (0, 90, 180, or 270) */
  rotation?: 0 | 90 | 180 | 270;
} 

/**
 * Union type for all component data types.
 */
export type ComponentData = ResistorData | VoltageSourceData | CurrentSourceData;

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
  direction?: 'horizontal' | 'vertical';
}

/**
 * A circuit component node (maps to React Flow node).
 * Represents a single electrical component in the circuit.
 */
export interface CircuitNode extends Node {
  /** Unique identifier for the node */
  id: NodeId;
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
  id: EdgeId;
  /** Source node ID */
  source: NodeId;
  /** Source handle ID (terminal) */
  sourceHandle: string;
  /** Target node ID */
  target: NodeId;
  /** Target handle ID (terminal) */
  targetHandle: string;
  /** Optional intermediate waypoints defining the edge path */
  waypoints?: Waypoint[];
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
