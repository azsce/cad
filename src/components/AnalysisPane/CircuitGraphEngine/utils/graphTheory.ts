/**
 * Graph theory utility functions for circuit graph analysis.
 * Provides algorithms for graph traversal, cycle detection, and pattern matching.
 */

import type { NodeId, BranchId, ElectricalNode, Branch } from "../../../../types/analysis";

/**
 * Adjacency list representation of a graph
 */
export interface AdjacencyList {
  /** Map from node ID to array of connected node IDs */
  neighbors: Map<NodeId, NodeId[]>;
  /** Map from node ID to array of branches connected to that node */
  branches: Map<NodeId, Branch[]>;
}

/**
 * Result of a graph traversal
 */
export interface TraversalResult {
  /** Nodes visited in order */
  visited: NodeId[];
  /** Parent of each node in the traversal tree */
  parent: Map<NodeId, NodeId | null>;
  /** Distance from start node */
  distance: Map<NodeId, number>;
}

/**
 * A path through the graph
 */
export interface GraphPath {
  /** Nodes in the path */
  nodes: NodeId[];
  /** Branches in the path */
  branches: BranchId[];
}

/**
 * 🔗 Add a bidirectional edge to the adjacency list.
 */
function addBidirectionalEdge(
  branch: Branch,
  neighbors: Map<NodeId, NodeId[]>,
  branchMap: Map<NodeId, Branch[]>
): void {
  const fromNeighbors = neighbors.get(branch.fromNodeId);
  const toNeighbors = neighbors.get(branch.toNodeId);
  const fromBranches = branchMap.get(branch.fromNodeId);
  const toBranches = branchMap.get(branch.toNodeId);

  const edgeData = getEdgeData(fromNeighbors, toNeighbors, fromBranches, toBranches);
  if (!edgeData) return;

  edgeData.fromNeighbors.push(branch.toNodeId);
  edgeData.toNeighbors.push(branch.fromNodeId);
  edgeData.fromBranches.push(branch);
  edgeData.toBranches.push(branch);
}

/**
 * Edge data for bidirectional edge addition
 */
interface EdgeData {
  fromNeighbors: NodeId[];
  toNeighbors: NodeId[];
  fromBranches: Branch[];
  toBranches: Branch[];
}

/**
 * ✅ Get all edge data structures if they exist.
 */
function getEdgeData(
  fromNeighbors: NodeId[] | undefined,
  toNeighbors: NodeId[] | undefined,
  fromBranches: Branch[] | undefined,
  toBranches: Branch[] | undefined
): EdgeData | undefined {
  if (!fromNeighbors) return undefined;
  if (!toNeighbors) return undefined;
  if (!fromBranches) return undefined;
  if (!toBranches) return undefined;
  
  return { fromNeighbors, toNeighbors, fromBranches, toBranches };
}

/**
 * 🏗️ Build an adjacency list from nodes and branches.
 *
 * Creates a bidirectional adjacency list representation of the graph
 * for efficient traversal and neighbor queries.
 *
 * @param nodes - All electrical nodes in the graph
 * @param branches - All branches connecting the nodes
 * @returns Adjacency list with neighbors and branches
 */
export function buildAdjacencyList(
  nodes: ElectricalNode[],
  branches: Branch[]
): AdjacencyList {
  const neighbors = new Map<NodeId, NodeId[]>();
  const branchMap = new Map<NodeId, Branch[]>();

  // Initialize empty arrays for all nodes
  for (const node of nodes) {
    neighbors.set(node.id, []);
    branchMap.set(node.id, []);
  }

  // Add edges (bidirectional)
  for (const branch of branches) {
    addBidirectionalEdge(branch, neighbors, branchMap);
  }

  return { neighbors, branches: branchMap };
}

/**
 * 🔍 Perform breadth-first search starting from a node.
 *
 * Explores the graph level by level, visiting all neighbors before
 * moving to the next level. Useful for finding shortest paths.
 *
 * @param start - Starting node ID
 * @param adjacency - Adjacency list representation of the graph
 * @returns Traversal result with visited nodes, parents, and distances
 */
/**
 * Context for BFS traversal
 */
interface BFSContext {
  adjacency: AdjacencyList;
  visited: NodeId[];
  parent: Map<NodeId, NodeId | null>;
  distance: Map<NodeId, number>;
  queue: NodeId[];
}

export function breadthFirstSearch(
  start: NodeId,
  adjacency: AdjacencyList
): TraversalResult {
  const context: BFSContext = {
    adjacency,
    visited: [],
    parent: new Map<NodeId, NodeId | null>(),
    distance: new Map<NodeId, number>(),
    queue: [start],
  };

  context.parent.set(start, null);
  context.distance.set(start, 0);

  while (context.queue.length > 0) {
    const current = context.queue.shift();
    if (!current) break;
    
    processBFSNode(current, context);
  }

  return {
    visited: context.visited,
    parent: context.parent,
    distance: context.distance,
  };
}

/**
 * 🔍 Process a single node in BFS traversal.
 */
function processBFSNode(current: NodeId, context: BFSContext): void {
  context.visited.push(current);

  const neighbors = context.adjacency.neighbors.get(current) ?? [];
  const currentDistance = context.distance.get(current) ?? 0;

  for (const neighbor of neighbors) {
    if (context.parent.has(neighbor)) continue;

    context.parent.set(neighbor, current);
    context.distance.set(neighbor, currentDistance + 1);
    context.queue.push(neighbor);
  }
}

/**
 * 🔍 Perform depth-first search starting from a node.
 *
 * Explores as far as possible along each branch before backtracking.
 * Useful for cycle detection and topological sorting.
 *
 * @param start - Starting node ID
 * @param adjacency - Adjacency list representation of the graph
 * @returns Traversal result with visited nodes and parents
 */
export function depthFirstSearch(
  start: NodeId,
  adjacency: AdjacencyList
): TraversalResult {
  const visited: NodeId[] = [];
  const parent = new Map<NodeId, NodeId | null>();
  const distance = new Map<NodeId, number>();

  dfsRecursive(start, null, 0);

  function dfsRecursive(
    current: NodeId,
    parentNode: NodeId | null,
    depth: number
  ): void {
    visited.push(current);
    parent.set(current, parentNode);
    distance.set(current, depth);

    const neighbors = adjacency.neighbors.get(current) ?? [];

    for (const neighbor of neighbors) {
      if (!parent.has(neighbor)) {
        dfsRecursive(neighbor, current, depth + 1);
      }
    }
  }

  return { visited, parent, distance };
}

/**
 * Node color for cycle detection
 */
type NodeColor = "white" | "gray" | "black";

/**
 * Context for cycle detection DFS
 */
interface CycleDetectionContext {
  adjacency: AdjacencyList;
  color: Map<NodeId, NodeColor>;
}

/**
 * 🔄 Detect if the graph contains any cycles.
 *
 * Uses DFS with color marking to detect back edges, which indicate cycles.
 * Returns true if at least one cycle exists.
 *
 * @param nodes - All nodes in the graph
 * @param adjacency - Adjacency list representation of the graph
 * @returns True if the graph contains a cycle, false otherwise
 */
export function hasCycle(
  nodes: ElectricalNode[],
  adjacency: AdjacencyList
): boolean {
  const color = new Map<NodeId, NodeColor>();

  initializeNodeColors(nodes, color);

  const context: CycleDetectionContext = { adjacency, color };
  return checkAllComponentsForCycles(nodes, context);
}

/**
 * 🎨 Initialize all nodes as unvisited (white).
 */
function initializeNodeColors(
  nodes: ElectricalNode[],
  color: Map<NodeId, NodeColor>
): void {
  for (const node of nodes) {
    color.set(node.id, "white");
  }
}

/**
 * 🔍 Check all graph components for cycles.
 */
function checkAllComponentsForCycles(
  nodes: ElectricalNode[],
  context: CycleDetectionContext
): boolean {
  for (const node of nodes) {
    if (context.color.get(node.id) === "white") {
      if (hasCycleDFS(node.id, null, context)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 🔍 DFS helper to detect cycles using color marking.
 */
function hasCycleDFS(
  current: NodeId,
  parent: NodeId | null,
  context: CycleDetectionContext
): boolean {
  context.color.set(current, "gray");

  const neighbors = context.adjacency.neighbors.get(current) ?? [];

  for (const neighbor of neighbors) {
    if (shouldExplorePath(neighbor, current, parent, context)) {
      return true;
    }
  }

  context.color.set(current, "black");
  return false;
}

/**
 * ✅ Check if a path should be explored (and if it indicates a cycle).
 */
function shouldExplorePath(
  neighbor: NodeId,
  current: NodeId,
  parent: NodeId | null,
  context: CycleDetectionContext
): boolean {
  const neighborColor = context.color.get(neighbor);

  if (neighborColor === "white") {
    return hasCycleDFS(neighbor, current, context);
  }

  return neighborColor === "gray" && neighbor !== parent;
}

/**
 * 🛤️ Find all simple paths between two nodes.
 *
 * Uses DFS to find all paths that don't revisit nodes.
 * Limited to a maximum path length to prevent infinite loops.
 *
 * @param start - Starting node ID
 * @param end - Ending node ID
 * @param adjacency - Adjacency list representation of the graph
 * @param maxLength - Maximum path length (default: 10)
 * @returns Array of all simple paths found
 */
export function findAllPaths(
  start: NodeId,
  end: NodeId,
  adjacency: AdjacencyList,
  maxLength = 10
): GraphPath[] {
  const paths: GraphPath[] = [];
  const visited = new Set<NodeId>();

  findPathsRecursive(start, [start], []);

  return paths;

  function findPathsRecursive(
    current: NodeId,
    nodePath: NodeId[],
    branchPath: BranchId[]
  ): void {
    if (nodePath.length > maxLength) {
      return;
    }

    if (current === end && nodePath.length > 1) {
      paths.push({
        nodes: [...nodePath],
        branches: [...branchPath],
      });
      return;
    }

    visited.add(current);

    const neighbors = adjacency.neighbors.get(current) ?? [];
    const branches = adjacency.branches.get(current) ?? [];

    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      const branch = branches[i];

      if (neighbor === undefined || branch === undefined) continue;

      if (!visited.has(neighbor)) {
        findPathsRecursive(
          neighbor,
          [...nodePath, neighbor],
          [...branchPath, branch.id]
        );
      }
    }

    visited.delete(current);
  }
}

/**
 * 🛤️ Find two disjoint paths between two nodes.
 *
 * Uses a modified DFS to find two paths that don't share any intermediate nodes.
 * This is useful for detecting bridge patterns (diamond shapes).
 *
 * @param start - Starting node ID
 * @param end - Ending node ID
 * @param adjacency - Adjacency list representation of the graph
 * @returns Two disjoint paths if they exist, undefined otherwise
 */
export function findDisjointPaths(
  start: NodeId,
  end: NodeId,
  adjacency: AdjacencyList
): [GraphPath, GraphPath] | undefined {
  const allPaths = findAllPaths(start, end, adjacency);

  // Check all pairs of paths to see if they are disjoint
  for (let i = 0; i < allPaths.length; i++) {
    for (let j = i + 1; j < allPaths.length; j++) {
      const path1 = allPaths[i];
      const path2 = allPaths[j];

      if (path1 === undefined || path2 === undefined) continue;

      if (arePathsDisjoint(path1, path2, start, end)) {
        return [path1, path2];
      }
    }
  }

  return undefined;
}

/**
 * ✅ Check if two paths are disjoint (don't share intermediate nodes).
 *
 * @param path1 - First path
 * @param path2 - Second path
 * @param start - Starting node (allowed to be shared)
 * @param end - Ending node (allowed to be shared)
 * @returns True if paths are disjoint, false otherwise
 */
function arePathsDisjoint(
  path1: GraphPath,
  path2: GraphPath,
  start: NodeId,
  end: NodeId
): boolean {
  const nodes1 = new Set(path1.nodes);
  const nodes2 = new Set(path2.nodes);

  // Remove start and end nodes (they're allowed to be shared)
  nodes1.delete(start);
  nodes1.delete(end);
  nodes2.delete(start);
  nodes2.delete(end);

  // Check if any intermediate nodes are shared
  for (const node of nodes1) {
    if (nodes2.has(node)) {
      return false;
    }
  }

  return true;
}

/**
 * Pattern structure for isomorphism checking
 */
export interface PatternStructure {
  nodeCount: number;
  branchCount: number;
  degrees: number[];
}

/**
 * Parameters for subgraph isomorphism check
 */
interface IsomorphismCheckParams {
  subgraphNodes: ElectricalNode[];
  subgraphBranches: Branch[];
  pattern: PatternStructure;
}

/**
 * 🧩 Check if a subgraph matches a pattern structure.
 *
 * Preferred API with structured parameters.
 *
 * @param subgraphNodes - Nodes in the subgraph
 * @param subgraphBranches - Branches in the subgraph
 * @param pattern - Expected pattern structure
 * @returns True if subgraph matches pattern structure, false otherwise
 */
export function matchesPattern(
  subgraphNodes: ElectricalNode[],
  subgraphBranches: Branch[],
  pattern: PatternStructure
): boolean {
  return performIsomorphismCheck({
    subgraphNodes,
    subgraphBranches,
    pattern,
  });
}

/**
 * 🔍 Perform the isomorphism check with structured parameters.
 */
function performIsomorphismCheck(params: IsomorphismCheckParams): boolean {
  if (!hasMatchingCounts(params.subgraphNodes, params.subgraphBranches, params.pattern)) {
    return false;
  }

  return hasMatchingDegreeSequence(params.subgraphNodes, params.pattern);
}

/**
 * ✅ Check if subgraph has matching node and branch counts.
 */
function hasMatchingCounts(
  subgraphNodes: ElectricalNode[],
  subgraphBranches: Branch[],
  pattern: PatternStructure
): boolean {
  return (
    subgraphNodes.length === pattern.nodeCount &&
    subgraphBranches.length === pattern.branchCount
  );
}

/**
 * ✅ Check if subgraph has matching degree sequence.
 */
function hasMatchingDegreeSequence(
  subgraphNodes: ElectricalNode[],
  pattern: PatternStructure
): boolean {
  const degrees = computeSortedDegrees(subgraphNodes);
  const sortedPatternDegrees = [...pattern.degrees].sort((a, b) => a - b);

  if (degrees.length !== sortedPatternDegrees.length) {
    return false;
  }

  return degrees.every((degree, i) => degree === sortedPatternDegrees[i]);
}

/**
 * 📊 Compute sorted degree sequence for nodes.
 */
function computeSortedDegrees(nodes: ElectricalNode[]): number[] {
  return nodes
    .map((node) => node.connectedBranchIds.length)
    .sort((a, b) => a - b);
}
