/**
 * Graph transformation utilities for circuit analysis.
 * Converts UI circuit model to pure graph representation and finds spanning trees.
 */

import type { Circuit, CircuitNode } from "../../types/circuit";
import type {
  AnalysisGraph,
  Branch,
  BranchId,
  ConnectionPointKey,
  ElectricalNode,
  NodeId,
  SpanningTree,
  TreeId,
} from "../../types/analysis";
import { createBranchId, createConnectionPointKey, createNodeId, createTreeId } from "../../types/analysis";

/**
 * Error thrown when a spanning tree is not found.
 */
class SpanningTreeNotFoundError extends Error {
  readonly treeId: TreeId;
  readonly code: string;

  constructor(treeId: TreeId) {
    super(`Spanning tree with ID "${treeId}" not found`);
    this.name = "SpanningTreeNotFoundError";
    this.treeId = treeId;
    this.code = "TREE_NOT_FOUND";
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
  const referenceNodeId = findReferenceNodeId(circuit, electricalNodes, connectionPointToNodeId);

  // Step 4: Find all possible spanning trees
  const allSpanningTrees = findAllSpanningTrees(electricalNodes, branches);

  // Step 5: Select default spanning tree (first one found)
  const firstTree = allSpanningTrees[0];
  const selectedTreeId = firstTree ? firstTree.id : createTreeId("tree-0");

  return {
    nodes: electricalNodes,
    branches,
    referenceNodeId,
    allSpanningTrees,
    selectedTreeId,
  };
}

/**
 * Finds the ID of the reference node (ground).
 * Prioritizes the node connected to a "ground" component.
 * Falls back to the first electrical node if no ground component is found.
 */
function findReferenceNodeId(
  circuit: Circuit,
  electricalNodes: ElectricalNode[],
  connectionPointToNodeId: Map<ConnectionPointKey, NodeId>
): NodeId {
  // 1. Try to find a ground component
  const groundComponent = circuit.nodes.find(node => node.type === "ground");

  if (groundComponent) {
    // Find the connection point (handle) of the ground component
    // We look for any edge connected to this ground component
    const connectedEdge = circuit.edges.find(
      edge => edge.source === groundComponent.id || edge.target === groundComponent.id
    );

    if (connectedEdge) {
      const handleId =
        connectedEdge.source === groundComponent.id ? connectedEdge.sourceHandle : connectedEdge.targetHandle;
      const pointKey = createConnectionPointKey(groundComponent.id, handleId);
      const nodeId = connectionPointToNodeId.get(pointKey);
      if (nodeId) {
        return nodeId;
      }
    }
  }

  // 2. Fallback: use the first electrical node
  const firstNode = electricalNodes[0];
  return firstNode ? firstNode.id : createNodeId("n0");
}

/**
 * Union-Find data structure for grouping connection points.
 */
class UnionFind {
  private readonly parent = new Map<ConnectionPointKey, ConnectionPointKey>();
  private readonly rank = new Map<ConnectionPointKey, number>();

  constructor(points: Set<ConnectionPointKey>) {
    for (const point of points) {
      this.parent.set(point, point);
      this.rank.set(point, 0);
    }
  }

  find(x: ConnectionPointKey): ConnectionPointKey {
    const p = this.parent.get(x);
    if (p === x || p === undefined) {
      return this.parent.get(x) ?? x;
    }
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }

  union(x: ConnectionPointKey, y: ConnectionPointKey): void {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return;

    const rankX = this.rank.get(rootX) ?? 0;
    const rankY = this.rank.get(rootY) ?? 0;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }
  }

  getGroups(): Map<ConnectionPointKey, Set<ConnectionPointKey>> {
    const groups = new Map<ConnectionPointKey, Set<ConnectionPointKey>>();

    for (const [point] of this.parent) {
      const root = this.find(point);
      if (!groups.has(root)) {
        groups.set(root, new Set());
      }
      groups.get(root)?.add(point);
    }

    return groups;
  }
}

/**
 * Identifies unique electrical nodes from circuit edge connections.
 *
 * Uses Union-Find algorithm to group connection points that are electrically connected.
 * Connection points connected by a wire (edge) are at the same electrical potential
 * and therefore belong to the same electrical node.
 *
 * @param edges - The circuit edges
 * @returns Electrical nodes and connection point mapping
 */
function identifyElectricalNodes(edges: Circuit["edges"]): {
  electricalNodes: ElectricalNode[];
  connectionPointToNodeId: Map<ConnectionPointKey, NodeId>;
} {
  // Collect all connection points
  const allConnectionPoints = collectAllConnectionPoints(edges);

  // Group connected points using Union-Find
  const uf = new UnionFind(allConnectionPoints);
  for (const edge of edges) {
    const sourceKey = createConnectionPointKey(edge.source, edge.sourceHandle);
    const targetKey = createConnectionPointKey(edge.target, edge.targetHandle);
    uf.union(sourceKey, targetKey);
  }

  const nodeGroups = uf.getGroups();

  // Build map of connection points to branches
  const pointToBranches = buildPointToBranchesMap(edges);

  // Create electrical nodes with standard labels (n0, n1, n2, ...)
  const electricalNodes: ElectricalNode[] = [];
  const connectionPointToNodeId = new Map<ConnectionPointKey, NodeId>();

  let nodeIndex = 0;
  for (const points of nodeGroups.values()) {
    const nodeId = createNodeId(`n${String(nodeIndex)}`);

    // Collect all branches connected to any point in this electrical node
    const connectedBranches = collectConnectedBranches(points, pointToBranches);

    electricalNodes.push({
      id: nodeId,
      connectedBranchIds: Array.from(connectedBranches),
    });

    // Map all connection points in this group to the same node ID
    for (const point of points) {
      connectionPointToNodeId.set(point, nodeId);
    }

    nodeIndex++;
  }

  return { electricalNodes, connectionPointToNodeId };
}

/**
 * Collects all connection points from edges.
 */
function collectAllConnectionPoints(edges: Circuit["edges"]): Set<ConnectionPointKey> {
  const points = new Set<ConnectionPointKey>();

  for (const edge of edges) {
    const sourceKey = createConnectionPointKey(edge.source, edge.sourceHandle);
    const targetKey = createConnectionPointKey(edge.target, edge.targetHandle);
    points.add(sourceKey);
    points.add(targetKey);
  }

  return points;
}

/**
 * Builds a map of connection points to the branches connected to them.
 */
function buildPointToBranchesMap(edges: Circuit["edges"]): Map<ConnectionPointKey, Set<BranchId>> {
  const pointToBranches = new Map<ConnectionPointKey, Set<BranchId>>();

  for (const edge of edges) {
    const sourceKey = createConnectionPointKey(edge.source, edge.sourceHandle);
    const targetKey = createConnectionPointKey(edge.target, edge.targetHandle);
    const branchId = createBranchId(edge.id);

    if (!pointToBranches.has(sourceKey)) {
      pointToBranches.set(sourceKey, new Set());
    }
    if (!pointToBranches.has(targetKey)) {
      pointToBranches.set(targetKey, new Set());
    }

    pointToBranches.get(sourceKey)?.add(branchId);
    pointToBranches.get(targetKey)?.add(branchId);
  }

  return pointToBranches;
}

/**
 * Collects all branches connected to any point in a set of connection points.
 */
function collectConnectedBranches(
  points: Set<ConnectionPointKey>,
  pointToBranches: Map<ConnectionPointKey, Set<BranchId>>
): Set<BranchId> {
  const connectedBranches = new Set<BranchId>();

  for (const point of points) {
    const branches = pointToBranches.get(point);
    if (branches) {
      for (const branchId of branches) {
        connectedBranches.add(branchId);
      }
    }
  }

  return connectedBranches;
}

/**
 * 🔍 Check if component should be skipped for branch creation
 * 
 * "Replace all current sources with open circuits (remove them)."
 * Current sources are not considered branches in the graph topology used for finding spanning trees.
 * Ground and Junction nodes are connection points, not branches.
 */
function shouldSkipComponent(componentType: string): boolean {
  return componentType === "ground" || componentType === "junction" || componentType === "currentSource";
}

/**
 * 🔍 Validate component terminals for branch creation
 */
function validateTerminals(
  terminals: ConnectionPointKey[]
): { terminal1: ConnectionPointKey; terminal2: ConnectionPointKey } | null {
  if (terminals.length !== 2) return null;

  const [terminal1, terminal2] = terminals;
  if (!terminal1 || !terminal2) return null;

  return { terminal1, terminal2 };
}

/**
 * 🔍 Get node IDs for terminals
 */
function getNodeIdsForTerminals(
  terminal1: ConnectionPointKey,
  terminal2: ConnectionPointKey,
  connectionPointToNodeId: Map<ConnectionPointKey, NodeId>
): { node1Id: NodeId; node2Id: NodeId } | null {
  const node1Id = connectionPointToNodeId.get(terminal1);
  const node2Id = connectionPointToNodeId.get(terminal2);

  if (!node1Id || !node2Id) return null;

  return { node1Id, node2Id };
}

interface CreateBranchParams {
  component: CircuitNode;
  terminal1: ConnectionPointKey;
  terminal2: ConnectionPointKey;
  node1Id: NodeId;
  node2Id: NodeId;
}

/**
 * 🏗️ Create a branch from a component
 */
function createBranchFromComponent(params: CreateBranchParams): Branch {
  const { component, terminal1, terminal2, node1Id, node2Id } = params;

  const { fromNodeId, toNodeId } = determineBranchDirectionFromComponent({
    component,
    terminal1,
    terminal2,
    node1Id,
    node2Id,
  });

  // We can safely cast the type because shouldSkipComponent filters out ground/junction/currentSource
  // Note: currentSource is skipped, but Branch type allows it.
  const branchType = component.type as Branch["type"];

  return {
    id: createBranchId(component.id),
    type: branchType,
    value: (component.data as { value: number }).value,
    fromNodeId,
    toNodeId,
  };
}

/**
 * 🏗️ Try to create a branch from a component
 */
function tryCreateBranch(
  component: CircuitNode,
  circuit: Circuit,
  connectionPointToNodeId: Map<ConnectionPointKey, NodeId>
): Branch | null {
  if (shouldSkipComponent(component.type)) return null;

  const terminals = findComponentTerminals(component.id, circuit.edges);
  const validatedTerminals = validateTerminals(terminals);
  if (!validatedTerminals) return null;

  const { terminal1, terminal2 } = validatedTerminals;
  const nodeIds = getNodeIdsForTerminals(terminal1, terminal2, connectionPointToNodeId);
  if (!nodeIds) return null;

  const { node1Id, node2Id } = nodeIds;
  return createBranchFromComponent({
    component,
    terminal1,
    terminal2,
    node1Id,
    node2Id,
  });
}

/**
 * 🏗️ Creates branches from circuit components with proper direction (CC=3, 12 lines)
 *
 * Each circuit component (resistor, voltage source, current source) becomes one branch.
 * The branch connects the two electrical nodes at the component's terminals.
 *
 * @param circuit - The circuit
 * @param connectionPointToNodeId - Mapping from connection points to node IDs
 * @returns Array of branches
 */
function createBranches(circuit: Circuit, connectionPointToNodeId: Map<ConnectionPointKey, NodeId>): Branch[] {
  const branches: Branch[] = [];

  for (const component of circuit.nodes) {
    const branch = tryCreateBranch(component, circuit, connectionPointToNodeId);
    if (branch) {
      branches.push(branch);
    }
  }

  return branches;
}

/**
 * Finds the terminal connection points for a component.
 * Returns an array of connection point keys (componentId-handleId).
 */
function findComponentTerminals(componentId: string, edges: Circuit["edges"]): ConnectionPointKey[] {
  const terminals = new Set<ConnectionPointKey>();

  for (const edge of edges) {
    if (edge.source === componentId) {
      terminals.add(createConnectionPointKey(edge.source, edge.sourceHandle));
    }
    if (edge.target === componentId) {
      terminals.add(createConnectionPointKey(edge.target, edge.targetHandle));
    }
  }

  return Array.from(terminals);
}

/**
 * Parameters for determining branch direction.
 */
interface BranchDirectionParams {
  component: CircuitNode;
  terminal1: ConnectionPointKey;
  terminal2: ConnectionPointKey;
  node1Id: NodeId;
  node2Id: NodeId;
}

/**
 * Determines the correct branch direction based on component type and orientation.
 *
 * For resistors: direction doesn't matter (symmetric)
 * For voltage/current sources: direction matters and is determined by the 'direction' property
 *
 * @param params - Branch direction parameters
 * @returns From and to node IDs with correct direction
 */
function determineBranchDirectionFromComponent(params: BranchDirectionParams): {
  fromNodeId: NodeId;
  toNodeId: NodeId;
} {
  const { component, terminal1, node1Id, node2Id } = params;
  // Extract handle IDs from terminal keys
  const handle1 = (terminal1 as string).split("-")[1];

  // For resistors, direction doesn't matter - use arbitrary order
  if (component.type === "resistor") {
    return { fromNodeId: node1Id, toNodeId: node2Id };
  }

  // For voltage and current sources, respect the direction property
  if (component.type === "voltageSource" || component.type === "currentSource") {
    const data = component.data as { direction?: string; value: number };
    const direction = data.direction ?? "down";

    // Determine which terminal is positive/from based on direction and handles
    // Direction 'down' means current flows from top to bottom
    // Direction 'up' means current flows from bottom to top
    const isTerminal1Top = handle1 === "top" || handle1 === "left";

    if (direction === "down") {
      // Current flows from top/left to bottom/right
      return isTerminal1Top ? { fromNodeId: node1Id, toNodeId: node2Id } : { fromNodeId: node2Id, toNodeId: node1Id };
    } else {
      // Current flows from bottom/right to top/left
      return isTerminal1Top ? { fromNodeId: node2Id, toNodeId: node1Id } : { fromNodeId: node1Id, toNodeId: node2Id };
    }
  }

  // Default: use arbitrary order
  return { fromNodeId: node1Id, toNodeId: node2Id };
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
export function findAllSpanningTrees(nodes: ElectricalNode[], branches: Branch[]): SpanningTree[] {
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
function enumerateValidSpanningTrees(nodes: ElectricalNode[], branches: Branch[], treeSize: number): SpanningTree[] {
  const spanningTrees: SpanningTree[] = [];
  const combinations = generateCombinations<BranchId>(
    branches.map(b => b.id),
    treeSize
  );

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
  combination: BranchId[],
  nodes: ElectricalNode[],
  branches: Branch[],
  treeIndex: number
): SpanningTree | null {
  if (!isSpanningTree(combination, nodes, branches)) {
    return null;
  }

  const twigBranchIds = combination;
  const linkBranchIds = branches.map(b => b.id).filter(id => !twigBranchIds.includes(id));

  return {
    id: createTreeId(`tree-${String(treeIndex)}`),
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
export function selectSpanningTree(graph: AnalysisGraph, treeId: TreeId): AnalysisGraph {
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
function isSpanningTree(branchIds: BranchId[], nodes: ElectricalNode[], branches: Branch[]): boolean {
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
  branchSet: Set<BranchId>
): Map<NodeId, NodeId[]> {
  const adjacency = new Map<NodeId, NodeId[]>();

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
function countConnectedNodes(startNodeId: NodeId, adjacency: Map<NodeId, NodeId[]>): number {
  const visited = new Set<NodeId>();
  const queue: NodeId[] = [startNodeId];
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
  nodeId: NodeId,
  adjacency: Map<NodeId, NodeId[]>,
  visited: Set<NodeId>,
  queue: NodeId[]
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
function createDefaultSpanningTree(nodes: ElectricalNode[], branches: Branch[]): SpanningTree | null {
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
  result: { branches: BranchId[]; visitedCount: number } | null,
  totalNodes: number,
  branches: Branch[]
): SpanningTree | null {
  if (result?.visitedCount !== totalNodes) return null;

  const linkBranchIds = branches.map(b => b.id).filter(id => !result.branches.includes(id));

  return {
    id: createTreeId("tree-0"),
    twigBranchIds: result.branches,
    linkBranchIds,
    description: "Default spanning tree (BFS)",
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
): Map<NodeId, Array<{ nodeId: NodeId; branchId: BranchId }>> {
  const adjacency = new Map<NodeId, Array<{ nodeId: NodeId; branchId: BranchId }>>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  for (const branch of branches) {
    const fromNeighbors = adjacency.get(branch.fromNodeId);
    const toNeighbors = adjacency.get(branch.toNodeId);
    fromNeighbors?.push({
      nodeId: branch.toNodeId,
      branchId: branch.id,
    });
    toNeighbors?.push({
      nodeId: branch.fromNodeId,
      branchId: branch.id,
    });
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
  startNodeId: NodeId,
  adjacency: Map<NodeId, Array<{ nodeId: NodeId; branchId: BranchId }>>
): { branches: BranchId[]; visitedCount: number } | null {
  const visited = new Set<NodeId>();
  const twigBranchIds: BranchId[] = [];
  const queue: NodeId[] = [startNodeId];
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
