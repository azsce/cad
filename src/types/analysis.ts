/**
 * Type definitions for circuit analysis data structures.
 * These types represent the mathematical graph model used for nodal and loop analysis.
 */

import type { Matrix } from "mathjs";

/**
 * Branded type for electrical node IDs.
 * Prevents mixing up node IDs with other string types.
 */
export type NodeId = string & { readonly __brand: "NodeId" };

/**
 * Branded type for branch IDs.
 * Prevents mixing up branch IDs with other string types.
 */
export type BranchId = string & { readonly __brand: "BranchId" };

/**
 * Branded type for spanning tree IDs.
 * Prevents mixing up tree IDs with other string types.
 */
export type TreeId = string & { readonly __brand: "TreeId" };

/**
 * Branded type for connection point keys.
 * Format: "componentId-handleId"
 */
export type ConnectionPointKey = string & { readonly __brand: "ConnectionPointKey" };

/**
 * Creates a NodeId from a string.
 */
export function createNodeId(id: string): NodeId {
  return id as NodeId;
}

/**
 * Creates a BranchId from a string.
 */
export function createBranchId(id: string): BranchId {
  return id as BranchId;
}

/**
 * Creates a TreeId from a string.
 */
export function createTreeId(id: string): TreeId {
  return id as TreeId;
}

/**
 * Creates a ConnectionPointKey from component and handle IDs.
 */
export function createConnectionPointKey(componentId: string, handleId: string): ConnectionPointKey {
  return `${componentId}-${handleId}` as ConnectionPointKey;
}

/**
 * An electrical node in the circuit graph.
 * Represents a unique connection point where multiple branches meet.
 */
export interface ElectricalNode {
  /** Unique identifier for the node */
  id: NodeId;
  /** IDs of all branches connected to this node */
  connectedBranchIds: BranchId[];
}

/**
 * A branch in the circuit graph.
 * Represents a single electrical component with its connections.
 */
export interface Branch {
  /** Unique identifier for the branch */
  id: BranchId;
  /** Type of electrical component */
  type: "resistor" | "voltageSource" | "currentSource";
  /** Component value (resistance in Ω, voltage in V, current in A) */
  value: number;
  /** ID of the node at the start of the branch */
  fromNodeId: NodeId;
  /** ID of the node at the end of the branch */
  toNodeId: NodeId;
}

/**
 * A spanning tree of the circuit graph.
 * Used for loop analysis (tie-set method).
 */
export interface SpanningTree {
  /** Unique identifier for this spanning tree */
  id: TreeId;
  /** Branch IDs that form the tree (twigs) */
  twigBranchIds: BranchId[];
  /** Branch IDs not in the tree (links/co-tree) */
  linkBranchIds: BranchId[];
  /** Optional human-readable description */
  description?: string;
}

/**
 * Pure graph representation of the circuit for analysis.
 * Transforms the UI circuit model into a mathematical graph structure.
 */
export interface AnalysisGraph {
  /** All electrical nodes in the graph */
  nodes: ElectricalNode[];
  /** All branches (components) in the graph */
  branches: Branch[];
  /** ID of the reference (ground) node */
  referenceNodeId: NodeId;
  /** All possible spanning trees for this graph */
  allSpanningTrees: SpanningTree[];
  /** ID of the currently selected spanning tree for analysis */
  selectedTreeId: TreeId;
}

/**
 * Result of circuit validation checks.
 * Indicates whether the circuit is valid and can be analyzed.
 */
export interface ValidationResult {
  /** Whether the circuit structure is valid */
  isValid: boolean;
  /** Whether the circuit can be mathematically solved */
  isSolvable: boolean;
  /** List of error messages (blocking issues) */
  errors: string[];
  /** List of warning messages (non-blocking issues) */
  warnings: string[];
}

/**
 * A single step in the analysis process.
 * Used for presenting the step-by-step solution.
 */
export interface AnalysisStep {
  /** Title of this analysis step */
  title: string;
  /** Detailed description of what this step does */
  description: string;
  /** Optional matrix to display for this step */
  matrix?: Matrix;
  /** Optional equation to display for this step */
  equation?: string;
}

/**
 * Complete result of circuit analysis calculation.
 * Contains all matrices, vectors, and solution data.
 */
export interface CalculationResult {
  /** Analysis method used */
  method: "nodal" | "loop";

  // Input matrices and vectors
  /** Incidence matrix A (for nodal/cut-set method) */
  incidenceMatrix?: Matrix;
  /** Tie-set matrix B (for loop/tie-set method) */
  tieSetMatrix?: Matrix;
  /** Branch impedance matrix ZB (diagonal) */
  branchImpedanceMatrix?: Matrix;
  /** Branch admittance matrix YB (diagonal) */
  branchAdmittanceMatrix?: Matrix;
  /** Branch voltage sources vector EB */
  branchVoltageSources?: Matrix;
  /** Branch current sources vector IB */
  branchCurrentSources?: Matrix;

  // Intermediate matrices
  /** System matrix (A*YB*A^T for nodal, B*ZB*B^T for loop) */
  systemMatrix?: Matrix;
  /** Right-hand side vector of system equation */
  systemVector?: Matrix;

  // Solution vectors
  /** Node voltages EN (for nodal method) */
  nodeVoltages?: Matrix;
  /** Loop currents IL (for loop method) */
  loopCurrents?: Matrix;

  // Final results
  /** Branch voltages VB */
  branchVoltages: Matrix;
  /** Branch currents JB */
  branchCurrents: Matrix;

  /** Step-by-step analysis process for presentation */
  steps: AnalysisStep[];
}
