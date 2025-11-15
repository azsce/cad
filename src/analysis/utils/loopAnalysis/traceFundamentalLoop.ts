/**
 * 🛤️ Trace fundamental loops through the spanning tree.
 *
 * For each link (co-tree branch), there exists a unique fundamental loop
 * that consists of the link plus a path through the spanning tree.
 * This module provides utilities to find these loops and determine branch directions.
 */

import type { AnalysisGraph, Branch, SpanningTree } from '../../../types/analysis';
import { logger } from '../../../utils/logger';

/**
 * Represents a fundamental loop with branch directions.
 */
export interface FundamentalLoop {
  /** The link branch that defines this loop */
  linkBranch: Branch;
  /** All branches in the loop (including the link) */
  branches: Branch[];
  /**
   * Direction of each branch relative to the link direction.
   * +1 means same direction as link, -1 means opposite direction.
   */
  directions: Map<string, number>;
}

/**
 * 🗺️ Build an adjacency list for the spanning tree.
 *
 * @param graph - The analysis graph
 * @param tree - The spanning tree
 * @returns Map from node ID to connected nodes (via tree branches only)
 */
function buildTreeAdjacencyList(
  graph: AnalysisGraph,
  tree: SpanningTree
): Map<string, Array<{ nodeId: string; branchId: string; direction: 'forward' | 'reverse' }>> {
  const adjacencyList = new Map<
    string,
    Array<{ nodeId: string; branchId: string; direction: 'forward' | 'reverse' }>
  >();

  // Initialize adjacency list for all nodes
  graph.nodes.forEach((node) => {
    adjacencyList.set(node.id, []);
  });

  // Add edges for tree branches only (bidirectional)
  tree.twigBranchIds.forEach((branchId) => {
    const branch = graph.branches.find((b) => b.id === branchId);
    if (!branch) return;

    // Forward direction: fromNode -> toNode
    const fromNeighbors = adjacencyList.get(branch.fromNodeId);
    if (fromNeighbors) {
      fromNeighbors.push({
        nodeId: branch.toNodeId,
        branchId: branch.id,
        direction: 'forward',
      });
    }

    // Reverse direction: toNode -> fromNode
    const toNeighbors = adjacencyList.get(branch.toNodeId);
    if (toNeighbors) {
      toNeighbors.push({
        nodeId: branch.fromNodeId,
        branchId: branch.id,
        direction: 'reverse',
      });
    }
  });

  return adjacencyList;
}

/**
 * 🔍 Find path through spanning tree using BFS.
 *
 * @param startNodeId - Starting node
 * @param endNodeId - Target node
 * @param adjacencyList - Tree adjacency list
 * @returns Array of branch IDs and directions forming the path, or null if no path exists
 */
function findPathThroughTree(
  startNodeId: string,
  endNodeId: string,
  adjacencyList: Map<string, Array<{ nodeId: string; branchId: string; direction: 'forward' | 'reverse' }>>
): Array<{ branchId: string; direction: 'forward' | 'reverse' }> | null {
  if (startNodeId === endNodeId) {
    return [];
  }

  const visited = new Set<string>();
  const queue: Array<{
    nodeId: string;
    path: Array<{ branchId: string; direction: 'forward' | 'reverse' }>;
  }> = [{ nodeId: startNodeId, path: [] }];

  visited.add(startNodeId);

  while (queue.length > 0) {
    const pathResult = processQueueItem(queue, adjacencyList, endNodeId, visited);
    if (pathResult) {
      return pathResult;
    }
  }

  return null;
}

/**
 * 🔧 Process one item from the BFS queue.
 */
function processQueueItem(
  queue: Array<{
    nodeId: string;
    path: Array<{ branchId: string; direction: 'forward' | 'reverse' }>;
  }>,
  adjacencyList: Map<string, Array<{ nodeId: string; branchId: string; direction: 'forward' | 'reverse' }>>,
  endNodeId: string,
  visited: Set<string>
): Array<{ branchId: string; direction: 'forward' | 'reverse' }> | null {
  const current = queue.shift();
  if (!current) return null;

  const neighbors = adjacencyList.get(current.nodeId);
  if (!neighbors) return null;

  for (const neighbor of neighbors) {
    const pathResult = processNeighbor(neighbor, current, endNodeId, visited, queue);
    if (pathResult) {
      return pathResult;
    }
  }

  return null;
}

/**
 * 🔧 Process a neighbor node during BFS traversal.
 */
function processNeighbor(
  neighbor: { nodeId: string; branchId: string; direction: 'forward' | 'reverse' },
  current: {
    nodeId: string;
    path: Array<{ branchId: string; direction: 'forward' | 'reverse' }>;
  },
  endNodeId: string,
  visited: Set<string>,
  queue: Array<{
    nodeId: string;
    path: Array<{ branchId: string; direction: 'forward' | 'reverse' }>;
  }>
): Array<{ branchId: string; direction: 'forward' | 'reverse' }> | null {
  if (visited.has(neighbor.nodeId)) {
    return null;
  }

  const newPath = [
    ...current.path,
    { branchId: neighbor.branchId, direction: neighbor.direction },
  ];

  if (neighbor.nodeId === endNodeId) {
    return newPath;
  }

  visited.add(neighbor.nodeId);
  queue.push({ nodeId: neighbor.nodeId, path: newPath });
  return null;
}

/**
 * 🔧 Build loop with just the link (fallback for invalid tree).
 */
function buildLinkOnlyLoop(linkBranch: Branch): FundamentalLoop {
  return {
    linkBranch,
    branches: [linkBranch],
    directions: new Map([[linkBranch.id, 1]]),
  };
}

/**
 * 🔧 Add tree branches to the loop with their directions.
 */
function addTreeBranchesToLoop(
  graph: AnalysisGraph,
  treePath: Array<{ branchId: string; direction: 'forward' | 'reverse' }>,
  branches: Branch[],
  directions: Map<string, number>
): void {
  treePath.forEach((pathSegment) => {
    const branch = graph.branches.find((b) => b.id === pathSegment.branchId);
    if (!branch) return;

    branches.push(branch);

    // If we traverse the branch in its forward direction, it's +1
    // If we traverse it in reverse direction, it's -1
    const direction = pathSegment.direction === 'forward' ? 1 : -1;
    directions.set(branch.id, direction);
  });
}

/**
 * 🌳 Trace a fundamental loop for a given link.
 *
 * The fundamental loop consists of:
 * 1. The link branch (defines the loop)
 * 2. The unique path through the spanning tree connecting the link's endpoints
 *
 * @param graph - The analysis graph
 * @param tree - The spanning tree
 * @param linkBranch - The link branch that defines this loop
 * @returns Fundamental loop with branches and directions
 */
export function traceFundamentalLoop(
  graph: AnalysisGraph,
  tree: SpanningTree,
  linkBranch: Branch
): FundamentalLoop {
  const caller = 'traceFundamentalLoop';

  logger.debug({ caller }, 'Tracing fundamental loop', {
    linkBranchId: linkBranch.id,
    fromNode: linkBranch.fromNodeId,
    toNode: linkBranch.toNodeId,
  });

  // Build adjacency list for the spanning tree
  const adjacencyList = buildTreeAdjacencyList(graph, tree);

  // Find path through tree from link's toNode back to link's fromNode
  // This creates a closed loop when combined with the link
  const treePath = findPathThroughTree(
    linkBranch.toNodeId,
    linkBranch.fromNodeId,
    adjacencyList
  );

  if (!treePath) {
    logger.error({ caller }, 'No path found through tree', {
      linkBranchId: linkBranch.id,
      fromNode: linkBranch.fromNodeId,
      toNode: linkBranch.toNodeId,
    });
    // Return loop with just the link (shouldn't happen if tree is valid)
    return buildLinkOnlyLoop(linkBranch);
  }

  // Build the complete loop
  const branches: Branch[] = [linkBranch];
  const directions = new Map<string, number>();

  // Link has direction +1 (defines the loop direction)
  directions.set(linkBranch.id, 1);

  // Add tree branches with their directions
  addTreeBranchesToLoop(graph, treePath, branches, directions);

  logger.debug({ caller }, 'Fundamental loop traced', {
    linkBranchId: linkBranch.id,
    numBranches: branches.length,
    branchIds: branches.map((b) => b.id),
  });

  return {
    linkBranch,
    branches,
    directions,
  };
}

/**
 * 🔄 Trace all fundamental loops for a spanning tree.
 *
 * @param graph - The analysis graph
 * @param tree - The spanning tree
 * @returns Array of fundamental loops (one per link)
 */
export function traceAllFundamentalLoops(
  graph: AnalysisGraph,
  tree: SpanningTree
): FundamentalLoop[] {
  const caller = 'traceAllFundamentalLoops';

  logger.debug({ caller }, 'Tracing all fundamental loops', {
    numLinks: tree.linkBranchIds.length,
  });

  const loops: FundamentalLoop[] = [];

  tree.linkBranchIds.forEach((linkBranchId) => {
    const linkBranch = graph.branches.find((b) => b.id === linkBranchId);
    if (!linkBranch) {
      logger.warn({ caller }, 'Link branch not found', { linkBranchId });
      return;
    }

    const loop = traceFundamentalLoop(graph, tree, linkBranch);
    loops.push(loop);
  });

  logger.debug({ caller }, 'All fundamental loops traced', {
    numLoops: loops.length,
  });

  return loops;
}
