/**
 * Symmetry detection and enforcement utilities for circuit graph layout.
 * Provides functions to detect isomorphic sub-graphs, calculate mirror axes,
 * and enforce symmetric positioning for aesthetically pleasing layouts.
 */

import type { ElectricalNode, Branch, NodeId, BranchId } from "../../../../types/analysis";
import type { Point } from "../types";

/**
 * Represents an isomorphic sub-graph pair that can be mirrored
 */
export interface IsomorphicSubgraph {
  /** Node IDs in the first sub-graph */
  nodes: NodeId[];
  /** Branch IDs connecting nodes in the first sub-graph */
  branches: BranchId[];
}

/**
 * Represents a mirror axis for symmetry enforcement
 */
export interface MirrorAxis {
  /** Type of axis: vertical (x = constant) or horizontal (y = constant) */
  type: "vertical" | "horizontal";
  /** Position of the axis (x-coordinate for vertical, y-coordinate for horizontal) */
  position: number;
}

/**
 * 🔍 Detect isomorphic sub-graphs in the circuit graph.
 *
 * Identifies pairs of sub-graphs that have the same topological structure
 * and can be rendered as mirror images. This is useful for circuits with
 * parallel branches or symmetric structures like bridge circuits.
 *
 * Note: This is a simplified implementation that detects common patterns.
 * A full graph isomorphism algorithm would be computationally expensive.
 *
 * @param nodes - All electrical nodes in the graph
 * @param branches - All branches in the graph
 * @returns Array of isomorphic sub-graph pairs
 */
export function findIsomorphicSubgraphs(
  nodes: ElectricalNode[],
  branches: Branch[]
): IsomorphicSubgraph[] {
  const subgraphs: IsomorphicSubgraph[] = [];

  // Build adjacency map for quick lookup
  const adjacencyMap = buildAdjacencyMap(nodes);

  // Detect parallel branches (simplest case of isomorphism)
  const parallelSubgraphs = extractParallelSubgraphs(branches);
  subgraphs.push(...parallelSubgraphs);

  // Detect symmetric node pairs (nodes with same degree and similar connectivity)
  const symmetricSubgraphs = extractSymmetricSubgraphs(nodes, adjacencyMap);
  subgraphs.push(...symmetricSubgraphs);

  return subgraphs;
}

/**
 * 📐 Calculate the central axis for mirroring node positions.
 *
 * Analyzes the distribution of node positions to determine the best
 * axis for mirror symmetry. Prefers vertical axis if nodes are spread
 * horizontally, horizontal axis if spread vertically.
 *
 * @param positions - Map of node IDs to their current positions
 * @returns Mirror axis specification
 */
export function calculateCentralAxis(positions: Map<NodeId, Point>): MirrorAxis {
  if (positions.size === 0) {
    return { type: "vertical", position: 0 };
  }

  const points = Array.from(positions.values());

  // Calculate bounding box
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  const horizontalSpread = maxX - minX;
  const verticalSpread = maxY - minY;

  // Choose axis based on spread
  if (horizontalSpread >= verticalSpread) {
    // Nodes spread horizontally -> use vertical axis
    return {
      type: "vertical",
      position: (minX + maxX) / 2,
    };
  }

  // Nodes spread vertically -> use horizontal axis
  return {
    type: "horizontal",
    position: (minY + maxY) / 2,
  };
}

/**
 * 🪞 Mirror node positions relative to a central axis.
 *
 * Creates a new position map where each node's position is reflected
 * across the specified axis. For vertical axis, x-coordinates are mirrored.
 * For horizontal axis, y-coordinates are mirrored.
 *
 * @param positions - Original node positions
 * @param axis - Mirror axis specification
 * @returns New map with mirrored positions
 */
export function mirrorPositions(
  positions: Map<NodeId, Point>,
  axis: MirrorAxis
): Map<NodeId, Point> {
  const mirrored = new Map<NodeId, Point>();

  for (const [nodeId, point] of positions.entries()) {
    if (axis.type === "vertical") {
      // Mirror across vertical axis: reflect x-coordinate
      const distance = point.x - axis.position;
      mirrored.set(nodeId, {
        x: axis.position - distance,
        y: point.y,
      });
    } else {
      // Mirror across horizontal axis: reflect y-coordinate
      const distance = point.y - axis.position;
      mirrored.set(nodeId, {
        x: point.x,
        y: axis.position - distance,
      });
    }
  }

  return mirrored;
}

/**
  * 🔗 Extract isomorphic sub-graphs from parallel branches.
 *
 * @param branches - All branches in the graph
 * @returns Array of isomorphic sub-graphs from parallel branches
 */
function extractParallelSubgraphs(branches: Branch[]): IsomorphicSubgraph[] {
  const parallelGroups = detectParallelBranches(branches);
  const validGroups = parallelGroups.filter((group) => group.length >= 2);

  return validGroups.flatMap((group) => createSubgraphsFromGroup(group, branches));
}

/**
 * 🏗️ Create sub-graphs from a group of parallel branches.
 *
 * @param group - Group of parallel branch IDs
 * @param branches - All branches in the graph
 * @returns Array of isomorphic sub-graphs
 */
function createSubgraphsFromGroup(
  group: BranchId[],
  branches: Branch[]
): IsomorphicSubgraph[] {
  return group
    .map((branchId) => branches.find((b) => b.id === branchId))
    .filter((branch): branch is Branch => branch !== undefined)
    .map((branch) => ({
      nodes: [branch.fromNodeId, branch.toNodeId],
      branches: [branch.id],
    }));
}

/**
 * 🔍 Extract isomorphic sub-graphs from symmetric node pairs.
 *
 * @param nodes - All electrical nodes
 * @param adjacencyMap - Adjacency map for connectivity lookup
 * @returns Array of isomorphic sub-graphs from symmetric pairs
 */
function extractSymmetricSubgraphs(
  nodes: ElectricalNode[],
  adjacencyMap: Map<NodeId, BranchId[]>
): IsomorphicSubgraph[] {
  const subgraphs: IsomorphicSubgraph[] = [];
  const symmetricPairs = detectSymmetricNodePairs(nodes, adjacencyMap);

  for (const pair of symmetricPairs) {
    const [node1, node2] = pair;
    const branches1 = adjacencyMap.get(node1) ?? [];
    const branches2 = adjacencyMap.get(node2) ?? [];

    const hasSameDegree = branches1.length === branches2.length;
    const hasConnections = branches1.length > 0;

    if (hasSameDegree && hasConnections) {
      subgraphs.push({
        nodes: [node1, node2],
        branches: [...branches1, ...branches2],
      });
    }
  }

  return subgraphs;
}

/**
 * 🗺️ Build adjacency map for quick connectivity lookup.
 *
 * Creates a map from node ID to array of branch IDs connected to that node.
 *
 * @param nodes - All electrical nodes
 * @returns Map from node ID to connected branch IDs
 */
function buildAdjacencyMap(nodes: ElectricalNode[]): Map<NodeId, BranchId[]> {
  const adjacencyMap = new Map<NodeId, BranchId[]>();

  for (const node of nodes) {
    adjacencyMap.set(node.id, node.connectedBranchIds);
  }

  return adjacencyMap;
}

/**
 * 🔗 Detect groups of parallel branches.
 *
 * Finds branches that connect the same pair of nodes, which form
 * natural candidates for symmetric rendering.
 *
 * @param branches - All branches in the graph
 * @returns Array of branch ID groups (each group connects same node pair)
 */
function detectParallelBranches(branches: Branch[]): BranchId[][] {
  const connectionMap = new Map<string, BranchId[]>();

  for (const branch of branches) {
    // Create normalized key (order-independent)
    const key = createConnectionKey(branch.fromNodeId, branch.toNodeId);

    const existing = connectionMap.get(key);
    if (existing) {
      existing.push(branch.id);
    } else {
      connectionMap.set(key, [branch.id]);
    }
  }

  // Return only groups with multiple branches
  return Array.from(connectionMap.values()).filter((group) => group.length > 1);
}

/**
 * 🔍 Detect pairs of nodes with symmetric connectivity patterns.
 *
 * Finds node pairs that have the same degree (number of connections)
 * and similar connectivity patterns, making them candidates for
 * symmetric positioning.
 *
 * @param nodes - All electrical nodes
 * @param adjacencyMap - Adjacency map for connectivity lookup
 * @returns Array of symmetric node pairs
 */
function detectSymmetricNodePairs(
  nodes: ElectricalNode[],
  adjacencyMap: Map<NodeId, BranchId[]>
): [NodeId, NodeId][] {
  const pairs: [NodeId, NodeId][] = [];
  const processed = new Set<NodeId>();

  for (let i = 0; i < nodes.length; i++) {
    const node1 = nodes[i];
    if (!node1 || processed.has(node1.id)) {
      continue;
    }

    const degree1 = adjacencyMap.get(node1.id)?.length ?? 0;

    for (let j = i + 1; j < nodes.length; j++) {
      const node2 = nodes[j];
      if (!node2 || processed.has(node2.id)) {
        continue;
      }

      const degree2 = adjacencyMap.get(node2.id)?.length ?? 0;

      // Check if nodes have same degree
      if (degree1 === degree2 && degree1 > 0) {
        pairs.push([node1.id, node2.id]);
        processed.add(node1.id);
        processed.add(node2.id);
        break;
      }
    }
  }

  return pairs;
}

/**
 * 🔑 Create normalized connection key for node pair.
 *
 * Creates an order-independent key for a pair of nodes.
 * Used to identify parallel branches.
 *
 * @param node1 - First node ID
 * @param node2 - Second node ID
 * @returns Normalized key string
 */
function createConnectionKey(node1: NodeId, node2: NodeId): string {
  // Sort to make key order-independent
  return node1 < node2 ? `${node1}-${node2}` : `${node2}-${node1}`;
}
