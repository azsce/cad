/**
 * 🛤️ Trace fundamental loops (f-loops) through the spanning tree.
 *
 * Fundamental Loop (Tie-set) Matrix:
 * A fundamental loop (f-loop) is a loop containing **only one link** and one or more tree branches.
 * The number of f-loops equals the number of links.
 *
 * Loop Analysis:
 * The tie-set matrix (B) gives the relation between branch currents and link currents:
 * J_B = B^T * I_L
 *
 * For each link (co-tree branch), there exists a unique fundamental loop that consists of:
 * 1. The link branch (defines the loop)
 * 2. A unique path through the spanning tree connecting the link's endpoints
 *
 * Tie-set Matrix Construction Rules:
 * - Assign +1 to the element corresponding to the link that defines that f-loop
 * - If a tree branch in the loop has the same direction as the f-loop's link, assign +1
 * - If a tree branch in the loop has the opposite direction to the f-loop's link, assign -1
 * - Assign 0 to all other branches and links not part of this specific f-loop
 */

import type { AnalysisGraph, Branch, SpanningTree } from "../../../types/analysis";
import { logger } from "../../../utils/logger";

/**
 * Represents a fundamental loop (f-loop) with branch directions.
 */
export interface FundamentalLoop {
  /** The link branch that defines this f-loop */
  linkBranch: Branch;
  /** All branches in the f-loop (including the link) */
  branches: Branch[];
  /**
   * Direction of each branch relative to the link direction.
   * +1 means same direction as link, -1 means opposite direction.
   * This is used to construct the tie-set matrix (B).
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
): Map<string, Array<{ nodeId: string; branchId: string; direction: "forward" | "reverse" }>> {
  const adjacencyList = new Map<
    string,
    Array<{ nodeId: string; branchId: string; direction: "forward" | "reverse" }>
  >();

  // Initialize adjacency list for all nodes
  for (const node of graph.nodes) {
    adjacencyList.set(node.id, []);
  }

  // Add edges for tree branches only (bidirectional)
  for (const branchId of tree.twigBranchIds) {
    const branch = graph.branches.find(b => b.id === branchId);
    if (!branch) continue;

    // Forward direction: fromNode -> toNode
    const fromNeighbors = adjacencyList.get(branch.fromNodeId);
    if (fromNeighbors) {
      fromNeighbors.push({
        nodeId: branch.toNodeId,
        branchId: branch.id,
        direction: "forward",
      });
    }

    // Reverse direction: toNode -> fromNode
    const toNeighbors = adjacencyList.get(branch.toNodeId);
    if (toNeighbors) {
      toNeighbors.push({
        nodeId: branch.fromNodeId,
        branchId: branch.id,
        direction: "reverse",
      });
    }
  }

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
  adjacencyList: Map<string, Array<{ nodeId: string; branchId: string; direction: "forward" | "reverse" }>>
): Array<{ branchId: string; direction: "forward" | "reverse" }> | null {
  if (startNodeId === endNodeId) {
    return [];
  }

  const visited = new Set<string>();
  const queue: Array<{
    nodeId: string;
    path: Array<{ branchId: string; direction: "forward" | "reverse" }>;
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
    path: Array<{ branchId: string; direction: "forward" | "reverse" }>;
  }>,
  adjacencyList: Map<string, Array<{ nodeId: string; branchId: string; direction: "forward" | "reverse" }>>,
  endNodeId: string,
  visited: Set<string>
): Array<{ branchId: string; direction: "forward" | "reverse" }> | null {
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
  neighbor: { nodeId: string; branchId: string; direction: "forward" | "reverse" },
  current: {
    nodeId: string;
    path: Array<{ branchId: string; direction: "forward" | "reverse" }>;
  },
  endNodeId: string,
  visited: Set<string>,
  queue: Array<{
    nodeId: string;
    path: Array<{ branchId: string; direction: "forward" | "reverse" }>;
  }>
): Array<{ branchId: string; direction: "forward" | "reverse" }> | null {
  if (visited.has(neighbor.nodeId)) {
    return null;
  }

  const newPath = [...current.path, { branchId: neighbor.branchId, direction: neighbor.direction }];

  if (neighbor.nodeId === endNodeId) {
    return newPath;
  }

  visited.add(neighbor.nodeId);
  queue.push({ nodeId: neighbor.nodeId, path: newPath });
  return null;
}

/**
 * 🔧 Build f-loop with just the link (fallback for invalid tree).
 */
function buildLinkOnlyLoop(linkBranch: Branch): FundamentalLoop {
  return {
    linkBranch,
    branches: [linkBranch],
    directions: new Map([[linkBranch.id, 1]]),
  };
}

/**
 * 🔧 Add tree branches (twigs) to the f-loop with their directions.
 *
 * Tie-set Matrix Construction:
 * - If a tree branch has the same direction as the link, assign +1
 * - If a tree branch has the opposite direction to the link, assign -1
 */
function addTreeBranchesToLoop(
  graph: AnalysisGraph,
  treePath: Array<{ branchId: string; direction: "forward" | "reverse" }>,
  branches: Branch[],
  directions: Map<string, number>
): void {
  for (const pathSegment of treePath) {
    const branch = graph.branches.find(b => b.id === pathSegment.branchId);
    if (!branch) continue;

    branches.push(branch);

    // If we traverse the branch in its forward direction, it's +1
    // If we traverse it in reverse direction, it's -1
    const direction = pathSegment.direction === "forward" ? 1 : -1;
    directions.set(branch.id, direction);
  }
}

/**
 * 🌳 Trace a fundamental loop (f-loop) for a given link.
 *
 * A fundamental loop contains only one link and one or more tree branches (twigs).
 *
 * The f-loop consists of:
 * 1. The link branch (defines the f-loop direction)
 * 2. The unique path through the spanning tree connecting the link's endpoints
 *
 * @param graph - The analysis graph
 * @param tree - The spanning tree
 * @param linkBranch - The link branch that defines this f-loop
 * @returns Fundamental loop with branches and directions for tie-set matrix construction
 */
export function traceFundamentalLoop(graph: AnalysisGraph, tree: SpanningTree, linkBranch: Branch): FundamentalLoop {
  const caller = "traceFundamentalLoop";

  logger.debug({ caller }, "Tracing fundamental loop (f-loop)", {
    linkBranchId: linkBranch.id,
    fromNode: linkBranch.fromNodeId,
    toNode: linkBranch.toNodeId,
  });

  // Build adjacency list for the spanning tree
  const adjacencyList = buildTreeAdjacencyList(graph, tree);

  // Find path through tree from link's toNode back to link's fromNode
  // This creates a closed loop when combined with the link
  const treePath = findPathThroughTree(linkBranch.toNodeId, linkBranch.fromNodeId, adjacencyList);

  if (!treePath) {
    logger.error({ caller }, "No path found through tree", {
      linkBranchId: linkBranch.id,
      fromNode: linkBranch.fromNodeId,
      toNode: linkBranch.toNodeId,
    });
    // Return loop with just the link (shouldn't happen if tree is valid)
    return buildLinkOnlyLoop(linkBranch);
  }

  // Build the complete f-loop
  const branches: Branch[] = [linkBranch];
  const directions = new Map<string, number>();

  // Link has direction +1 (defines the f-loop direction)
  directions.set(linkBranch.id, 1);

  // Add tree branches (twigs) with their directions
  addTreeBranchesToLoop(graph, treePath, branches, directions);

  logger.debug({ caller }, "Fundamental loop (f-loop) traced", {
    linkBranchId: linkBranch.id,
    numBranches: branches.length,
    branchIds: branches.map(b => b.id),
  });

  return {
    linkBranch,
    branches,
    directions,
  };
}

/**
 * 🔄 Trace all fundamental loops (f-loops) for a spanning tree.
 *
 * The number of f-loops equals the number of links.
 * Each link defines one unique f-loop.
 *
 * @param graph - The analysis graph
 * @param tree - The spanning tree
 * @returns Array of fundamental loops (one per link)
 */
export function traceAllFundamentalLoops(graph: AnalysisGraph, tree: SpanningTree): FundamentalLoop[] {
  const caller = "traceAllFundamentalLoops";

  logger.debug({ caller }, "Tracing all fundamental loops (f-loops)", {
    numLinks: tree.linkBranchIds.length,
  });

  const loops: FundamentalLoop[] = [];

  for (const linkBranchId of tree.linkBranchIds) {
    const linkBranch = graph.branches.find(b => b.id === linkBranchId);
    if (!linkBranch) {
      logger.warn({ caller }, "Link branch not found", { linkBranchId });
      continue;
    }

    const loop = traceFundamentalLoop(graph, tree, linkBranch);
    loops.push(loop);
  }

  logger.debug({ caller }, "All fundamental loops (f-loops) traced", {
    numLoops: loops.length,
  });

  return loops;
}
