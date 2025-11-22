/**
 * Constants for CircuitEditorPane component
 */

import type { NodeTypes, EdgeTypes } from "@xyflow/react";
import { ResistorNode } from "../nodes/ResistorNode";
import { VoltageSourceNode } from "../nodes/VoltageSourceNode";
import { CurrentSourceNode } from "../nodes/CurrentSourceNode";
import { JunctionNode } from "../nodes/JunctionNode";
import { WireEdge } from "../edges";

/**
 * Custom node types for React Flow.
 * Maps component type strings to their React components.
 * Defined outside component to prevent recreation on every render.
 */
export const nodeTypes: NodeTypes = {
  resistor: ResistorNode,
  voltageSource: VoltageSourceNode,
  currentSource: CurrentSourceNode,
  ground: () => null, // Placeholder for ground node type
  junction: JunctionNode,
} as const;

/**
 * Custom edge types for React Flow.
 * Defined outside component to prevent recreation on every render.
 * Uses DeletableEdge as default edge type with hover delete button.
 */
export const edgeTypes: EdgeTypes = {
  default: WireEdge,
} as const;

export const VALID_COMPONENT_TYPES = ["resistor", "voltageSource", "currentSource"] as const;
