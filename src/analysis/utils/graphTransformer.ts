/**
 * Graph transformation utilities for circuit analysis.
 * Converts UI circuit model to pure graph representation and finds spanning trees.
 */

import type {
  Circuit,
  CircuitNode,
} from '../../types/circuit';
import type {
  AnalysisGraph,
  Branch,
  ElectricalNode,
  SpanningTree,
} from '../../types/analysis';

/**
 * Error thrown when a spanning tree is not found.
 */
class SpanningTreeNotFoundError extends Error {
  readonly treeId: string;
  readonly code: string;

  constructor(treeId: string) {
    super(`Spanning tree with ID "${treeId}" not found`);
    this.name = 'SpanningTreeNotFoundError';
    this.treeId = treeId;
    this.code = 'TREE_NOT_FOUND';
  }
}

/**
 * Converts a Circuit (UI model) to an AnalysisGraph (mathematical model).
 * 
 * This function:
 * 1. Identifies unique electrical nodes from edge connections
 * 2. Maps circuit components to branches with proper direction
 * 3. Assigns standard labels (nodes: n0, n1, ...; branches: a, b, c, ...)
 * 4. Selects a reference (ground) node
 * 5. Finds all possible spanning trees
 * 6. Selects a default spanning tree
 * 
 * @param circuit - The circuit to transform
 * @returns The analysis graph representation
 */
export function createAnalysisGraph(circuit: Circuit): AnalysisGraph {
  // Step 1: Identify unique electrical nodes from edge connections
  const { electricalNodes, connectionPointToNodeId } = identifyElectricalNodes(circuit.edges);
  
  // Step 2: Map circuit components to branches with proper direction
  const branches = createBranches(circuit, connectionPointToNodeId);
  
  // Step 3: Select reference (ground) node
  const firstNode = electricalNodes[0];
  const referenceNodeId = firstNode ? firstNode.id : 'n0';
  
  // Step 4: Find all possible spanning trees
  const allSpanningTrees = findAllSpanningTrees(electricalNodes, branches);
  
  // Step 5: Select default spanning tree (first one found)
  const firstTree = allSpanningTrees[0];
  const selectedTreeId = firstTree ? firstTree.id : 'tree-0';
  
  return {
    nodes: electricalNodes,
    branches,
    referenceNodeId,
    allSpanningTrees,
    selectedTreeId,
  };
}

/**
 * Identifies unique electrical nodes from circuit edge connections.
 * 
 * @param edges - The circuit edges
 * @returns Electrical nodes and connection point mapping
 */
function identifyElectricalNodes(edges: Circuit['edges']): {
  electricalNodes: ElectricalNode[];
  connectionPointToNodeId: Map<string, string>;
} {
  const nodeMap = new Map<string, Set<string>>();
  
  // Build a map of connection points to the branches connected to them
  for (const edge of edges) {
    const sourceKey = `${edge.source}-${edge.sourceHandle}`;
    const targetKey = `${edge.target}-${edge.targetHandle}`;
    
    if (!nodeMap.has(sourceKey)) {
      nodeMap.set(sourceKey, new Set());
    }
    if (!nodeMap.has(targetKey)) {
      nodeMap.set(targetKey, new Set());
    }
    
    const sourceSet = nodeMap.get(sourceKey);
    const targetSet = nodeMap.get(targetKey);
    if (sourceSet) sourceSet.add(edge.id);
    if (targetSet) targetSet.add(edge.id);
  }
  
  // Create electrical nodes with standard labels (n0, n1, n2, ...)
  const electricalNodes: ElectricalNode[] = [];
  const connectionPointToNodeId = new Map<string, string>();
  
  let nodeIndex = 0;
  for (const [connectionPoint, branchIds] of nodeMap.entries()) {
    const nodeId = `n${String(nodeIndex)}`;
    electricalNodes.push({
      id: nodeId,
      connectedBranchIds: Array.from(branchIds),
    });
    connectionPointToNodeId.set(connectionPoint, nodeId);
    nodeIndex++;
  }
  
  return { electricalNodes, connectionPointToNodeId };
}

/**
 * Creates branches from circuit components with proper direction.
 * 
 * @param circuit - The circuit
 * @param connectionPointToNodeId - Mapping from connection points to node IDs
 * @returns Array of branches
 */
function createBranches(
  circuit: Circuit,
  connectionPointToNodeId: Map<string, string>
): Branch[] {
  const branches: Branch[] = [];
  const componentMap = new Map<string, CircuitNode>();
  
  for (const node of circuit.nodes) {
    componentMap.set(node.id, node);
  }
  
  for (const edge of circuit.edges) {
    const component = componentMap.get(edge.source);
    if (!component || component.type === 'ground') continue;
    
    const sourceKey = `${edge.source}-${edge.sourceHandle}`;
    const targetKey = `${edge.target}-${edge.targetHandle}`;
    
    const fromNodeId = connectionPointToNodeId.get(sourceKey);
    const toNodeId = connectionPointToNodeId.get(targetKey);
    
    if (!fromNodeId || !toNodeId) continue;
    
    const { actualFromNodeId, actualToNodeId } = determineBranchDirection(
      component,
      edge,
      fromNodeId,
      toNodeId
    );
    
    branches.push({
      id: edge.id,
      type: component.type,
      value: (component.data as { value: number }).value,
      fromNodeId: actualFromNodeId,
      toNodeId: actualToNodeId,
    });
  }
  
  return branches;
}

/**
 * Determines the correct branch direction based on component type and orientation.
 * 
 * @param component - The circuit component
 * @param edge - The circuit edge
 * @param fromNodeId - Initial from node ID
 * @param toNodeId - Initial to node ID
 * @returns Actual from and to node IDs
 */
function determineBranchDirection(
  component: CircuitNode,
  edge: Circuit['edges'][0],
  fromNodeId: string,
  toNodeId: string
): { actualFromNodeId: string; actualToNodeId: string } {
  let actualFromNodeId = fromNodeId;
  let actualToNodeId = toNodeId;
  
  // For voltage and current sources, respect the direction property
  if (component.type === 'voltageSource' || component.type === 'currentSource') {
    const data = component.data as { direction?: string; value: number };
    const shouldSwap = 
      (data.direction === 'down' && edge.sourceHandle === 'top') ||
      (data.direction === 'up' && edge.sourceHandle === 'bottom');
    
    if (shouldSwap) {
      actualFromNodeId = toNodeId;
      actualToNodeId = fromNodeId;
    }
  }
  
  return { actualFromNodeId, actualToNodeId };
}

/**
 * Finds all possible spanning trees of the circuit graph using recursive enumeration.
 * 
 * A spanning tree is a subgraph that:
 * - Connects all nodes
 * - Contains no cycles
 * - Has exactly N-1 edges (where N is the number of nodes)
 * 
 * @param nodes - The electrical nodes in the graph
 * @param branches - The branches in the graph
 * @returns Array of all possible spanning trees
 */
export function findAllSpanningTrees(
  nodes: ElectricalNode[],
  branches: Branch[]
): SpanningTree[] {
  const numNodes = nodes.length;
  const numBranches = branches.length;
  const treeSize = numNodes - 1;
  
  if (numBranches < treeSize || numNodes === 0) {
    return [];
  }
  
  const spanningTrees = enumerateValidSpanningTrees(nodes, branches, treeSize);
  
  return ensureAtLeastOneTree(spanningTrees, nodes, branches);
}

/**
 * Enumerates all valid spanning trees by checking combinations.
 */
function enumerateValidSpanningTrees(
  nodes: ElectricalNode[],
  branches: Branch[],
  treeSize: number
): SpanningTree[] {
  const spanningTrees: SpanningTree[] = [];
  const combinations = generateCombinations(branches.map(b => b.id), treeSize);
  
  for (const combination of combinations) {
    const tree = tryCreateSpanningTree(combination, nodes, branches, spanningTrees.length);
    if (tree) {
      spanningTrees.push(tree);
    }
  }
  
  return spanningTrees;
}

/**
 * Tries to create a spanning tree from a combination of branch IDs.
 */
function tryCreateSpanningTree(
  combination: string[],
  nodes: ElectricalNode[],
  branches: Branch[],
  treeIndex: number
): SpanningTree | null {
  if (!isSpanningTree(combination, nodes, branches)) {
    return null;
  }
  
  const twigBranchIds = combination;
  const linkBranchIds = branches
    .map(b => b.id)
    .filter(id => !twigBranchIds.includes(id));
  
  return {
    id: `tree-${String(treeIndex)}`,
    twigBranchIds,
    linkBranchIds,
    description: `Spanning tree ${String(treeIndex + 1)}`,
  };
}

/**
 * Ensures at least one tree exists by creating a default if needed.
 */
function ensureAtLeastOneTree(
  spanningTrees: SpanningTree[],
  nodes: ElectricalNode[],
  branches: Branch[]
): SpanningTree[] {
  if (spanningTrees.length > 0 || nodes.length === 0) {
    return spanningTrees;
  }
  
  const defaultTree = createDefaultSpanningTree(nodes, branches);
  if (defaultTree) {
    return [defaultTree];
  }
  
  return spanningTrees;
}

/**
 * Selects a specific spanning tree for analysis.
 * 
 * @param graph - The analysis graph
 * @param treeId - The ID of the tree to select
 * @returns Updated analysis graph with the selected tree
 * @throws SpanningTreeNotFoundError if the tree ID is not found
 */
export function selectSpanningTree(
  graph: AnalysisGraph,
  treeId: string
): AnalysisGraph {
  const treeExists = graph.allSpanningTrees.some(tree => tree.id === treeId);
  
  if (!treeExists) {
    throw new SpanningTreeNotFoundError(treeId);
  }
  
  return {
    ...graph,
    selectedTreeId: treeId,
  };
}

/**
 * Generates all combinations of k elements from an array.
 * 
 * @param array - The array to generate combinations from
 * @param k - The size of each combination
 * @returns Array of all combinations
 */
function generateCombinations<T>(array: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (array.length === 0) return [];
  if (k > array.length) return [];
  
  const first = array[0];
  if (!first) return [];
  
  const rest = array.slice(1);
  
  // Combinations that include the first element
  const withFirst = generateCombinations(rest, k - 1).map(combo => [first, ...combo]);
  
  // Combinations that don't include the first element
  const withoutFirst = generateCombinations(rest, k);
  
  return [...withFirst, ...withoutFirst];
}

/**
 * Checks if a set of branch IDs forms a valid spanning tree.
 * 
 * A valid spanning tree:
 * 1. Connects all nodes (is connected)
 * 2. Contains no cycles (is acyclic)
 * 3. Has exactly N-1 edges
 * 
 * @param branchIds - The branch IDs to check
 * @param nodes - All nodes in the graph
 * @param branches - All branches in the graph
 * @returns True if the branches form a spanning tree
 */
function isSpanningTree(
  branchIds: string[],
  nodes: ElectricalNode[],
  branches: Branch[]
): boolean {
  const numNodes = nodes.length;
  
  // Must have exactly N-1 edges
  if (branchIds.length !== numNodes - 1 || numNodes === 0) {
    return false;
  }
  
  // Build adjacency list for the subgraph
  const adjacency = buildAdjacencyList(nodes, branches, new Set(branchIds));
  
  // Check if the subgraph is connected using BFS
  const firstNode = nodes[0];
  if (!firstNode) return false;
  
  const visitedCount = countConnectedNodes(firstNode.id, adjacency);
  
  // If all nodes are visited, the subgraph is connected
  // Since we have N-1 edges and the graph is connected, it must be a tree
  return visitedCount === numNodes;
}

/**
 * Builds an adjacency list for a subgraph.
 * 
 * @param nodes - All nodes
 * @param branches - All branches
 * @param branchSet - Set of branch IDs to include
 * @returns Adjacency list
 */
function buildAdjacencyList(
  nodes: ElectricalNode[],
  branches: Branch[],
  branchSet: Set<string>
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  
  for (const branch of branches) {
    if (branchSet.has(branch.id)) {
      const fromNeighbors = adjacency.get(branch.fromNodeId);
      const toNeighbors = adjacency.get(branch.toNodeId);
      if (fromNeighbors) fromNeighbors.push(branch.toNodeId);
      if (toNeighbors) toNeighbors.push(branch.fromNodeId);
    }
  }
  
  return adjacency;
}

/**
 * Counts the number of nodes reachable from a starting node using BFS.
 * 
 * @param startNodeId - Starting node ID
 * @param adjacency - Adjacency list
 * @returns Number of reachable nodes
 */
function countConnectedNodes(
  startNodeId: string,
  adjacency: Map<string, string[]>
): number {
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  visited.add(startNodeId);
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    
    visitUnvisitedNeighbors(current, adjacency, visited, queue);
  }
  
  return visited.size;
}

/**
 * Visits all unvisited neighbors of a node and adds them to the queue.
 */
function visitUnvisitedNeighbors(
  nodeId: string,
  adjacency: Map<string, string[]>,
  visited: Set<string>,
  queue: string[]
): void {
  const neighbors = adjacency.get(nodeId) || [];
  
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }
}

/**
 * Creates a default spanning tree using BFS from the first node.
 * Used as a fallback when no spanning trees are found through enumeration.
 * 
 * @param nodes - All nodes in the graph
 * @param branches - All branches in the graph
 * @returns A default spanning tree, or null if the graph is not connected
 */
function createDefaultSpanningTree(
  nodes: ElectricalNode[],
  branches: Branch[]
): SpanningTree | null {
  if (nodes.length === 0) return null;
  
  const firstNode = nodes[0];
  if (!firstNode) return null;
  
  const adjacency = buildBranchAdjacencyList(nodes, branches);
  const result = performBFSForSpanningTree(firstNode.id, adjacency);
  
  return buildSpanningTreeFromBFS(result, nodes.length, branches);
}

/**
 * Builds a spanning tree from BFS results.
 */
function buildSpanningTreeFromBFS(
  result: { branches: string[]; visitedCount: number } | null,
  totalNodes: number,
  branches: Branch[]
): SpanningTree | null {
  if (!result || result.visitedCount !== totalNodes) {
    return null;
  }
  
  const linkBranchIds = branches
    .map(b => b.id)
    .filter(id => !result.branches.includes(id));
  
  return {
    id: 'tree-0',
    twigBranchIds: result.branches,
    linkBranchIds,
    description: 'Default spanning tree (BFS)',
  };
}

/**
 * Builds an adjacency list with branch information.
 * 
 * @param nodes - All nodes in the graph
 * @param branches - All branches in the graph
 * @returns Adjacency list mapping node IDs to connected nodes and branches
 */
function buildBranchAdjacencyList(
  nodes: ElectricalNode[],
  branches: Branch[]
): Map<string, Array<{ nodeId: string; branchId: string }>> {
  const adjacency = new Map<string, Array<{ nodeId: string; branchId: string }>>();
  
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  
  for (const branch of branches) {
    const fromNeighbors = adjacency.get(branch.fromNodeId);
    const toNeighbors = adjacency.get(branch.toNodeId);
    if (fromNeighbors) {
      fromNeighbors.push({
        nodeId: branch.toNodeId,
        branchId: branch.id,
      });
    }
    if (toNeighbors) {
      toNeighbors.push({
        nodeId: branch.fromNodeId,
        branchId: branch.id,
      });
    }
  }
  
  return adjacency;
}

/**
 * Performs BFS to find a spanning tree.
 * 
 * @param startNodeId - Starting node ID
 * @param adjacency - Adjacency list
 * @returns Branch IDs forming the spanning tree and visited count, or null if failed
 */
function performBFSForSpanningTree(
  startNodeId: string,
  adjacency: Map<string, Array<{ nodeId: string; branchId: string }>>
): { branches: string[]; visitedCount: number } | null {
  const visited = new Set<string>();
  const twigBranchIds: string[] = [];
  const queue: string[] = [startNodeId];
  visited.add(startNodeId);
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    
    const neighbors = adjacency.get(current) || [];
    
    for (const { nodeId, branchId } of neighbors) {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        twigBranchIds.push(branchId);
        queue.push(nodeId);
      }
    }
  }
  
  return {
    branches: twigBranchIds,
    visitedCount: visited.size,
  };
}
