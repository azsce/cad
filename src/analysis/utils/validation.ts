/**
 * ⚡ Circuit validation utilities for analysis.
 * Validates circuit structure and solvability before performing analysis.
 */

import type { AnalysisGraph, ValidationResult, Branch } from "../../types/analysis";
import { logger } from "../../utils/logger";

/**
 * ✅ Validates an analysis graph for solvability.
 *
 * Performs the following checks:
 * 1. 🔗 Graph connectivity using BFS traversal
 * 2. 🔋 Presence of at least one voltage or current source
 * 3. ⚠️ Detect voltage-source-only loops (KVL contradiction)
 * 4. ⚠️ Detect current-source-only cut-sets (KCL contradiction)
 *
 * @param graph - The analysis graph to validate
 * @returns Validation result with errors and warnings
 */
export function validateGraph(graph: AnalysisGraph): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  logger.debug({ caller: "validateGraph" }, "Starting validation", {
    nodeCount: graph.nodes.length,
    branchCount: graph.branches.length,
  });

  // Check 1: 🔗 Graph connectivity
  const connectivityError = checkConnectivity(graph);
  if (connectivityError) {
    errors.push(connectivityError);
  }

  // Check 2: 🔋 Presence of sources
  const sourceError = checkSourcePresence(graph);
  if (sourceError) {
    errors.push(sourceError);
  }

  // Check 3: ⚠️ Voltage-source-only loops
  const voltageLoopErrors = detectVoltageSourceLoops(graph);
  errors.push(...voltageLoopErrors);

  // Check 4: ⚠️ Current-source-only cut-sets
  const currentCutSetErrors = detectCurrentSourceCutSets(graph);
  errors.push(...currentCutSetErrors);

  const isValid = errors.length === 0;
  const isSolvable = isValid;

  logger.debug({ caller: "validateGraph" }, "Validation complete", {
    isValid,
    isSolvable,
    errorCount: errors.length,
    warningCount: warnings.length,
  });

  return {
    isValid,
    isSolvable,
    errors,
    warnings,
  };
}

/**
 * 🔗 Checks if the graph is fully connected using BFS from the reference node.
 *
 * @param graph - The analysis graph
 * @returns Error message if disconnected, null otherwise
 */
function checkConnectivity(graph: AnalysisGraph): string | null {
  if (graph.nodes.length === 0) {
    return "Circuit contains no nodes";
  }

  if (graph.nodes.length === 1) {
    return null; // ✨ Single node is trivially connected
  }

  const adjacency = buildAdjacencyList(graph);
  const visited = performBFS(graph.referenceNodeId, adjacency);

  if (visited.size !== graph.nodes.length) {
    const isolatedNodes = findIsolatedNodes(graph.nodes, visited);
    return `Circuit contains isolated components. Disconnected nodes: ${isolatedNodes.join(", ")}`;
  }

  return null;
}

/**
 * 🔋 Checks if the circuit contains at least one voltage or current source.
 *
 * @param graph - The analysis graph
 * @returns Error message if no sources found, null otherwise
 */
function checkSourcePresence(graph: AnalysisGraph): string | null {
  const hasSource = graph.branches.some(branch => branch.type === "voltageSource" || branch.type === "currentSource");

  if (!hasSource) {
    return "Circuit must contain at least one voltage or current source";
  }

  return null;
}

/**
 * 🔄 Detects loops containing only voltage sources (KVL contradiction).
 *
 * A loop with only voltage sources creates a contradiction in Kirchhoff's Voltage Law
 * if the sum of voltages around the loop is not zero.
 *
 * @param graph - The analysis graph
 * @returns Array of error messages for voltage-source-only loops
 */
function detectVoltageSourceLoops(graph: AnalysisGraph): string[] {
  return detectTreeBasedErrors(
    graph,
    tree => tree.linkBranchIds,
    (branchId, tree, g) => checkLoopForVoltageSourcesOnly(branchId, tree, g)
  );
}

/**
 * ✂️ Detects cut-sets containing only current sources (KCL contradiction).
 *
 * A cut-set with only current sources creates a contradiction in Kirchhoff's Current Law
 * if the sum of currents through the cut is not zero.
 *
 * @param graph - The analysis graph
 * @returns Array of error messages for current-source-only cut-sets
 */
function detectCurrentSourceCutSets(graph: AnalysisGraph): string[] {
  return detectTreeBasedErrors(
    graph,
    tree => tree.twigBranchIds,
    (branchId, tree, g) => checkCutSetForCurrentSourcesOnly(branchId, tree, g)
  );
}

/**
 * 🌳 Generic helper to detect errors based on spanning tree branches.
 *
 * @param graph - Analysis graph
 * @param getBranchIds - Function to get branch IDs from tree
 * @param checkFn - Function to check each branch
 * @returns Array of error messages
 */
function detectTreeBasedErrors(
  graph: AnalysisGraph,
  getBranchIds: (tree: { twigBranchIds: string[]; linkBranchIds: string[] }) => string[],
  checkFn: (
    branchId: string,
    tree: { twigBranchIds: string[]; linkBranchIds: string[] },
    g: AnalysisGraph
  ) => string | null
): string[] {
  const selectedTree = getSelectedTree(graph);
  if (!selectedTree) {
    return [];
  }

  const branchIds = getBranchIds(selectedTree);
  return collectErrors(branchIds, branchId => checkFn(branchId, selectedTree, graph));
}

/**
 * 📋 Generic helper to collect errors from a list of items.
 *
 * @param items - Items to check
 * @param checkFn - Function that returns error message or null
 * @returns Array of error messages
 */
function collectErrors<T>(items: T[], checkFn: (item: T) => string | null): string[] {
  const errors: string[] = [];

  for (const item of items) {
    const error = checkFn(item);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

/**
 * 🔄 Checks if a fundamental loop contains only voltage sources.
 *
 * @param linkId - Link defining the loop
 * @param tree - Spanning tree
 * @param graph - Analysis graph
 * @returns Error message if loop is voltage-source-only, null otherwise
 */
function checkLoopForVoltageSourcesOnly(
  linkId: string,
  tree: { twigBranchIds: string[] },
  graph: AnalysisGraph
): string | null {
  const loopBranches = traceFundamentalLoop(linkId, tree, graph);

  return checkBranchesForSourceType(
    loopBranches,
    isVoltageSourceOnlyLoop,
    labels =>
      `Loop detected containing only voltage sources: ${labels}. ` +
      "This creates a contradiction in KVL (Kirchhoff's Voltage Law)",
    " → "
  );
}

/**
 * ✂️ Checks if a fundamental cut-set contains only current sources.
 *
 * @param twigId - Twig defining the cut-set
 * @param tree - Spanning tree
 * @param graph - Analysis graph
 * @returns Error message if cut-set is current-source-only, null otherwise
 */
function checkCutSetForCurrentSourcesOnly(
  twigId: string,
  tree: { twigBranchIds: string[]; linkBranchIds: string[] },
  graph: AnalysisGraph
): string | null {
  const cutSetBranches = traceFundamentalCutSet(twigId, tree, graph);

  return checkBranchesForSourceType(
    cutSetBranches,
    isCurrentSourceOnlyCutSet,
    labels =>
      `Cut-set detected containing only current sources: {${labels}}. ` +
      "This creates a contradiction in KCL (Kirchhoff's Current Law)",
    ", "
  );
}

/**
 * 🔍 Generic helper to check branches for specific source type and generate error.
 *
 * @param branches - Branches to check
 * @param checkFn - Function to check if branches match criteria
 * @param errorFn - Function to generate error message from labels
 * @param separator - Separator for branch labels
 * @returns Error message or null
 */
function checkBranchesForSourceType(
  branches: Branch[],
  checkFn: (branches: Branch[]) => boolean,
  errorFn: (labels: string) => string,
  separator: string
): string | null {
  if (!checkFn(branches)) {
    return null;
  }

  const branchLabels = branches.map(b => b.id).join(separator);
  return errorFn(branchLabels);
}

/**
 * 🔄 Traces a fundamental loop defined by a link.
 *
 * A fundamental loop consists of:
 * - 🔗 The link itself
 * - 🌳 The unique path through the spanning tree connecting the link's endpoints
 *
 * @param linkId - The link branch ID that defines the loop
 * @param tree - The spanning tree
 * @param graph - The analysis graph
 * @returns Array of branches forming the loop
 */
function traceFundamentalLoop(linkId: string, tree: { twigBranchIds: string[] }, graph: AnalysisGraph): Branch[] {
  const link = graph.branches.find(b => b.id === linkId);
  if (!link) {
    return [];
  }

  // 🌳 Build adjacency list using only tree branches
  const treeAdjacency = buildTreeAdjacencyList(tree, graph);

  // 🔍 Find path through tree from link's fromNode to toNode
  const treePath = findPathInTree(link.fromNodeId, link.toNodeId, treeAdjacency);

  // 🔄 The loop consists of the link plus the tree path
  const loopBranchIds = [linkId, ...treePath];
  return loopBranchIds.map(id => graph.branches.find(b => b.id === id)).filter((b): b is Branch => b !== undefined);
}

/**
 * ✂️ Traces a fundamental cut-set defined by a twig (tree branch).
 *
 * A fundamental cut-set consists of:
 * - 🌿 The twig itself
 * - 🔗 All links that connect the two components created by removing the twig
 *
 * @param twigId - The twig branch ID that defines the cut-set
 * @param tree - The spanning tree
 * @param graph - The analysis graph
 * @returns Array of branches forming the cut-set
 */
function traceFundamentalCutSet(
  twigId: string,
  tree: { twigBranchIds: string[]; linkBranchIds: string[] },
  graph: AnalysisGraph
): Branch[] {
  const twig = graph.branches.find(b => b.id === twigId);
  if (!twig) {
    return [];
  }

  // 🌳 Build tree without this twig
  const treeWithoutTwig = tree.twigBranchIds.filter(id => id !== twigId);
  const treeAdjacency = buildTreeAdjacencyListFromBranches(treeWithoutTwig, graph);

  // 🔍 Find which component each node belongs to
  const component1 = getConnectedComponent(twig.fromNodeId, treeAdjacency);
  const component2 = getConnectedComponent(twig.toNodeId, treeAdjacency);

  // 🔗 Find all links that cross between the two components
  const crossingLinks = tree.linkBranchIds.filter(linkId => {
    const link = graph.branches.find(b => b.id === linkId);
    if (!link) return false;

    const fromInComp1 = component1.has(link.fromNodeId);
    const toInComp1 = component1.has(link.toNodeId);
    const fromInComp2 = component2.has(link.fromNodeId);
    const toInComp2 = component2.has(link.toNodeId);

    // ✂️ Link crosses if one end is in component1 and the other is in component2
    return (fromInComp1 && toInComp2) || (fromInComp2 && toInComp1);
  });

  // ✂️ The cut-set consists of the twig plus all crossing links
  const cutSetBranchIds = [twigId, ...crossingLinks];
  return cutSetBranchIds.map(id => graph.branches.find(b => b.id === id)).filter((b): b is Branch => b !== undefined);
}

/**
 * 🌳 Gets the selected spanning tree from the graph.
 *
 * @param graph - The analysis graph
 * @returns The selected spanning tree, or undefined if not found
 */
function getSelectedTree(graph: AnalysisGraph): { twigBranchIds: string[]; linkBranchIds: string[] } | undefined {
  return graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);
}

/**
 * ⚡ Checks if a loop contains only voltage sources.
 *
 * @param branches - Branches forming the loop
 * @returns True if all branches are voltage sources
 */
function isVoltageSourceOnlyLoop(branches: Branch[]): boolean {
  if (branches.length === 0) {
    return false;
  }

  return branches.every(branch => branch.type === "voltageSource");
}

/**
 * 🔌 Checks if a cut-set contains only current sources.
 *
 * @param branches - Branches forming the cut-set
 * @returns True if all branches are current sources
 */
function isCurrentSourceOnlyCutSet(branches: Branch[]): boolean {
  if (branches.length === 0) {
    return false;
  }

  return branches.every(branch => branch.type === "currentSource");
}

/**
 * 🗺️ Builds an adjacency list for the graph.
 *
 * @param graph - The analysis graph
 * @returns Adjacency list mapping node IDs to connected node IDs
 */
function buildAdjacencyList(graph: AnalysisGraph): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }

  for (const branch of graph.branches) {
    addBidirectionalEdge(adjacency, branch.fromNodeId, branch.toNodeId);
  }

  return adjacency;
}

/**
 * 🏗️ Initializes a branch adjacency map with empty arrays for all nodes.
 *
 * @param nodes - Graph nodes
 * @returns Initialized adjacency map
 */
function initializeBranchAdjacencyMap(
  nodes: Array<{ id: string }>
): Map<string, Array<{ nodeId: string; branchId: string }>> {
  const adjacency = new Map<string, Array<{ nodeId: string; branchId: string }>>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  return adjacency;
}

/**
 * ↔️ Adds a bidirectional edge to an adjacency list.
 *
 * @param adjacency - Adjacency list
 * @param fromNodeId - From node ID
 * @param toNodeId - To node ID
 */
function addBidirectionalEdge(adjacency: Map<string, string[]>, fromNodeId: string, toNodeId: string): void {
  const fromNeighbors = adjacency.get(fromNodeId);
  const toNeighbors = adjacency.get(toNodeId);
  if (fromNeighbors) fromNeighbors.push(toNodeId);
  if (toNeighbors) toNeighbors.push(fromNodeId);
}

/**
 * 🌳 Builds an adjacency list using only tree branches.
 *
 * @param tree - The spanning tree
 * @param graph - The analysis graph
 * @returns Adjacency list with branch IDs
 */
function buildTreeAdjacencyList(
  tree: { twigBranchIds: string[] },
  graph: AnalysisGraph
): Map<string, Array<{ nodeId: string; branchId: string }>> {
  return buildTreeAdjacencyListFromBranches(tree.twigBranchIds, graph);
}

/**
 * 🗺️ Builds an adjacency list from a list of branch IDs.
 *
 * @param branchIds - Branch IDs to include
 * @param graph - The analysis graph
 * @returns Adjacency list with branch IDs
 */
function buildTreeAdjacencyListFromBranches(
  branchIds: string[],
  graph: AnalysisGraph
): Map<string, Array<{ nodeId: string; branchId: string }>> {
  const adjacency = initializeBranchAdjacencyMap(graph.nodes);
  const branchSet = new Set(branchIds);

  for (const branch of graph.branches) {
    if (branchSet.has(branch.id)) {
      addBidirectionalBranchEdge(adjacency, branch);
    }
  }

  return adjacency;
}

/**
 * ↔️ Adds a bidirectional edge with branch information to an adjacency list.
 *
 * @param adjacency - Adjacency list with branch info
 * @param branch - Branch to add
 */
function addBidirectionalBranchEdge(
  adjacency: Map<string, Array<{ nodeId: string; branchId: string }>>,
  branch: Branch
): void {
  const fromNeighbors = adjacency.get(branch.fromNodeId);
  const toNeighbors = adjacency.get(branch.toNodeId);

  if (fromNeighbors) {
    fromNeighbors.push({ nodeId: branch.toNodeId, branchId: branch.id });
  }
  if (toNeighbors) {
    toNeighbors.push({ nodeId: branch.fromNodeId, branchId: branch.id });
  }
}

/**
 * 🔍 Performs BFS from a starting node.
 *
 * @param startNodeId - Starting node ID
 * @param adjacency - Adjacency list
 * @returns Set of visited node IDs
 */
function performBFS(startNodeId: string, adjacency: Map<string, string[]>): Set<string> {
  return genericBFS(startNodeId, nodeId => {
    const neighbors = adjacency.get(nodeId) || [];
    return neighbors.map(n => ({ nodeId: n }));
  });
}

/**
 * 🚀 Generic BFS traversal that works with any neighbor structure.
 *
 * @param startNodeId - Starting node ID
 * @param getNeighbors - Function to get neighbors of a node
 * @returns Set of visited node IDs
 */
function genericBFS(startNodeId: string, getNeighbors: (nodeId: string) => Array<{ nodeId: string }>): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  visited.add(startNodeId);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const neighbors = getNeighbors(current);

    for (const { nodeId } of neighbors) {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        queue.push(nodeId);
      }
    }
  }

  return visited;
}

/**
 * 🛤️ Finds a path through the tree between two nodes using BFS.
 *
 * @param fromNodeId - Starting node ID
 * @param toNodeId - Target node ID
 * @param adjacency - Tree adjacency list with branch IDs
 * @returns Array of branch IDs forming the path
 */
function findPathInTree(
  fromNodeId: string,
  toNodeId: string,
  adjacency: Map<string, Array<{ nodeId: string; branchId: string }>>
): string[] {
  if (fromNodeId === toNodeId) {
    return [];
  }

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: string[] }> = [{ nodeId: fromNodeId, path: [] }];
  visited.add(fromNodeId);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const neighbors = adjacency.get(current.nodeId) || [];

    for (const { nodeId, branchId } of neighbors) {
      if (nodeId === toNodeId) {
        return [...current.path, branchId];
      }

      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        queue.push({
          nodeId,
          path: [...current.path, branchId],
        });
      }
    }
  }

  return [];
}

/**
 * 🧩 Gets all nodes in the connected component containing the start node.
 *
 * @param startNodeId - Starting node ID
 * @param adjacency - Adjacency list
 * @returns Set of node IDs in the component
 */
function getConnectedComponent(
  startNodeId: string,
  adjacency: Map<string, Array<{ nodeId: string; branchId: string }>>
): Set<string> {
  return genericBFS(startNodeId, nodeId => adjacency.get(nodeId) || []);
}

/**
 * 🏝️ Finds isolated nodes that were not visited during BFS.
 *
 * @param allNodes - All nodes in the graph
 * @param visited - Set of visited node IDs
 * @returns Array of isolated node IDs
 */
function findIsolatedNodes(allNodes: AnalysisGraph["nodes"], visited: Set<string>): string[] {
  return allNodes.filter(node => !visited.has(node.id)).map(node => node.id);
}
