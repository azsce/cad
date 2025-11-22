/**
 * Type definitions for the Circuit Graph Visualization Engine
 * 
 * This module defines the data contract between the layout engine (logic layer)
 * and the renderer (presentation layer).
 */

import type { NodeId } from "../../../types/analysis";

// Branded types for type safety
export type EdgeKey = string & { readonly __brand: "EdgeKey" };
export type PathData = string & { readonly __brand: "PathData" };

/**
 * 2D point in Cartesian coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Rectangular bounding box for collision detection
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Arrow position and orientation on an edge
 */
export interface ArrowPoint extends Point {
  /** Rotation angle in radians for arrow orientation */
  angle: number;
}

/**
 * Geometric representation of a node ready for SVG rendering
 */
export interface LayoutNode {
  /** Unique identifier for the node */
  id: string;
  /** X coordinate in layout space */
  x: number;
  /** Y coordinate in layout space */
  y: number;
  /** Display label for the node */
  label: string;
  /** Pre-calculated position for the node label */
  labelPos: Point;
}

/**
 * Geometric representation of an edge ready for SVG rendering
 */
export interface LayoutEdge {
  /** Unique identifier for the edge */
  id: string;
  /** ID of the source node */
  sourceId: string;
  /** ID of the target node */
  targetId: string;
  /** SVG path data string (for d attribute) */
  path: PathData;
  /** Position and rotation for directional arrow */
  arrowPoint: ArrowPoint;
  /** Display label for the edge */
  label: string;
  /** Pre-calculated position for the edge label */
  labelPos: Point;
  /** Whether this edge uses a curved path */
  isCurved: boolean;
}

/**
 * Complete geometric representation of the circuit graph
 * Output of GraphLayoutEngine, input to CircuitGraphRenderer
 */
export interface LayoutGraph {
  /** Total width of the layout in pixels */
  width: number;
  /** Total height of the layout in pixels */
  height: number;
  /** All nodes with calculated positions */
  nodes: LayoutNode[];
  /** All edges with calculated paths */
  edges: LayoutEdge[];
}

/**
 * Result of node placement algorithm
 */
export interface NodePlacementResult {
  /** Map of node IDs to their calculated positions */
  positions: Map<NodeId, Point>;
  /** Bounding box of the entire layout */
  bounds: BoundingBox;
}

/**
 * Result of edge routing algorithm
 */
export interface EdgeRoutingResult {
  /** SVG path data string */
  path: PathData;
  /** Arrow position and orientation */
  arrowPoint: ArrowPoint;
  /** Whether the path is curved */
  isCurved: boolean;
}

/**
 * Candidate path for edge routing with score
 */
export interface PathCandidate {
  /** SVG path data string */
  path: PathData;
  /** Penalty score (lower is better) */
  score: number;
  /** Whether the path is curved */
  isCurved: boolean;
}

/**
 * Label position optimization result
 */
export interface LabelPosition extends Point {
  /** Optional collision count for debugging */
  collisions?: number;
}

/**
 * Tooltip data for displaying element details on hover
 */
export interface TooltipData {
  /** Type of element being hovered */
  type: "node" | "edge";
  /** Position in SVG coordinate space */
  position: Point;
  /** Content to display in the tooltip */
  content: {
    /** Main title text */
    title: string;
    /** Array of label-value pairs for details */
    details: Array<{ label: string; value: string }>;
  };
}
