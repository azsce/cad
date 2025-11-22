/**
 * Pattern recognition module for circuit graph layout optimization.
 * Detects common circuit patterns (Bridge, Pi, T, Series) to enable
 * hierarchical layout with geometric constraints.
 */

import type {
  NodeId,
  BranchId,
  ElectricalNode,
  Branch,
} from "../../../../types/analysis";
import type { Point } from "../types";
import {
  buildAdjacencyList,
  findDisjointPaths,
  hasCycle,
  matchesPattern,
  type AdjacencyList,
} from "../utils/graphTheory";

/**
 * Type of circuit pattern
 */
export type PatternType = "bridge" | "pi" | "t" | "series";

/**
 * A recognized circuit pattern with its structure
 */
export interface CircuitPattern {
  /** Type of pattern */
  type: PatternType;
  /** Nodes that form this pattern */
  nodes: NodeId[];
  /** Branches that form this pattern */
  branches: BranchId[];
  /** Ideal geometric positions for this pattern (template) */
  geometricTemplate: Point[];
}

/**
 * A match of a pattern in the graph
 */
export interface PatternMatch {
  /** The pattern that was matched */
  pattern: CircuitPattern;
  /** Maps actual node IDs to pattern template positions */
  nodeMapping: Map<NodeId, number>;
  /** Maps actual branch IDs to pattern edges */
  branchMapping: Map<BranchId, number>;
}

/**
 * A super node representing a collapsed pattern
 */
export interface SuperNode {
  /** Unique ID for the super node */
  id: NodeId;
  /** The pattern match this super node represents */
  patternMatch: PatternMatch;
  /** External nodes that connect to this pattern */
  externalConnections: Array<{
    /** External node ID */
    externalNodeId: NodeId;
    /** Internal node ID within the pattern */
    internalNodeId: NodeId;
    /** Branch connecting external to internal */
    branchId: BranchId;
  }>;
}

/**
 * Simplified graph with patterns collapsed into super nodes
 */
export interface SimplifiedGraph {
  /** Remaining regular nodes (not part of any pattern) */
  nodes: ElectricalNode[];
  /** Remaining regular branches (not part of any pattern) */
  branches: Branch[];
  /** Super nodes representing collapsed patterns */
  superNodes: SuperNode[];
}

/**
 * Context for pattern detection operations
 */
interface PatternDetectionContext {
  nodes: ElectricalNode[];
  branches: Branch[];
  adjacency: AdjacencyList;
  usedNodes: Set<NodeId>;
  usedBranches: Set<BranchId>;
}

/**
 * State for bridge pattern detection
 */
interface BridgeDetectionState {
  context: PatternDetectionContext;
  detectedBridges: Set<string>;
  matches: PatternMatch[];
}

/**
 * Context for series chain tracing
 */
interface ChainTracingContext {
  adjacency: AdjacencyList;
  usedNodes: Set<NodeId>;
  usedBranches: Set<BranchId>;
}

/**
 * 🔍 Pattern matcher for circuit graph analysis.
 *
 * Detects common circuit patterns and provides methods to work with them.
 */
export class PatternMatcher {
  /**
   * 🔍 Find all pattern matches in the graph.
   *
   * Detects Bridge, Pi, T, and Series patterns in order of priority.
   *
   * @param nodes - All nodes in the graph
   * @param branches - All branches in the graph
   * @returns Array of pattern matches found
   */
  findPatterns(nodes: ElectricalNode[], branches: Branch[]): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const context: PatternDetectionContext = {
      nodes,
      branches,
      adjacency: buildAdjacencyList(nodes, branches),
      usedNodes: new Set<NodeId>(),
      usedBranches: new Set<BranchId>(),
    };

    // Detect patterns in priority order (larger patterns first)
    const allPatterns = [
      ...this.detectBridgePatterns(context),
      ...this.detectPiPatterns(context),
      ...this.detectTPatterns(context),
      ...this.detectSeriesPatterns(context),
    ];
    matches.push(...allPatterns);

    return matches;
  }

  /**
   * 🔍 Detect bridge patterns (diamond shape, 4 nodes, 2 disjoint paths).
   */
  private detectBridgePatterns(context: PatternDetectionContext): PatternMatch[] {
    const state: BridgeDetectionState = {
      context,
      detectedBridges: new Set<string>(),
      matches: [],
    };

    for (let i = 0; i < context.nodes.length; i++) {
      for (let j = i + 1; j < context.nodes.length; j++) {
        this.tryDetectBridgeBetweenNodes(context.nodes[i], context.nodes[j], state);
      }
    }

    return state.matches;
  }

  /**
   * 🔍 Try to detect a bridge pattern between two nodes.
   */
  private tryDetectBridgeBetweenNodes(
    node1: ElectricalNode | undefined,
    node2: ElectricalNode | undefined,
    state: BridgeDetectionState
  ): void {
    if (!node1 || !node2) return;
    if (!this.canFormBridge(node1, node2, state.context)) return;

    const paths = findDisjointPaths(node1.id, node2.id, state.context.adjacency);
    if (!this.isValidBridgePaths(paths, state)) return;

    this.addBridgeMatch(paths, state);
  }

  /**
   * ✅ Check if two nodes can form a bridge pattern.
   */
  private canFormBridge(
    node1: ElectricalNode | undefined,
    node2: ElectricalNode | undefined,
    context: PatternDetectionContext
  ): boolean {
    if (!node1 || !node2) return false;
    if (context.usedNodes.has(node1.id) || context.usedNodes.has(node2.id)) return false;
    return !this.areNodesDirectlyConnected(node1.id, node2.id, context.adjacency);
  }

  /**
   * ✅ Check if paths are valid for a bridge pattern.
   */
  private isValidBridgePaths(
    paths: [{ nodes: NodeId[]; branches: BranchId[] }, { nodes: NodeId[]; branches: BranchId[] }] | undefined,
    state: BridgeDetectionState
  ): paths is [{ nodes: NodeId[]; branches: BranchId[] }, { nodes: NodeId[]; branches: BranchId[] }] {
    if (!paths) return false;
    if (!this.isValidBridgePattern(paths, state.context.usedNodes, state.context.usedBranches)) return false;

    const bridgeKey = this.createBridgeKey(paths);
    return !state.detectedBridges.has(bridgeKey);
  }

  /**
   * ➕ Add a bridge match to the results.
   */
  private addBridgeMatch(
    paths: [{ nodes: NodeId[]; branches: BranchId[] }, { nodes: NodeId[]; branches: BranchId[] }],
    state: BridgeDetectionState
  ): void {
    const bridgeKey = this.createBridgeKey(paths);
    state.detectedBridges.add(bridgeKey);

    const match = this.createBridgeMatch(paths);
    state.matches.push(match);
    this.markPatternAsUsed(match, state.context.usedNodes, state.context.usedBranches);
  }

  /**
   * 🔗 Check if two nodes are directly connected.
   */
  private areNodesDirectlyConnected(
    node1Id: NodeId,
    node2Id: NodeId,
    adjacency: AdjacencyList
  ): boolean {
    const neighbors = adjacency.neighbors.get(node1Id) ?? [];
    return neighbors.includes(node2Id);
  }

  /**
   * 🔑 Create a unique key for a bridge pattern.
   */
  private createBridgeKey(
    paths: [{ nodes: NodeId[]; branches: BranchId[] }, { nodes: NodeId[]; branches: BranchId[] }]
  ): string {
    const allNodes = new Set([...paths[0].nodes, ...paths[1].nodes]);
    return Array.from(allNodes)
      .sort((a, b) => a.localeCompare(b))
      .join("-");
  }

  /**
   * ✏️ Mark pattern nodes and branches as used.
   */
  private markPatternAsUsed(
    match: PatternMatch,
    usedNodes: Set<NodeId>,
    usedBranches: Set<BranchId>
  ): void {
    this.markElementsAsUsed(match.pattern.nodes, usedNodes);
    this.markElementsAsUsed(match.pattern.branches, usedBranches);
  }

  /**
   * ✏️ Mark elements as used in a set.
   */
  private markElementsAsUsed<T>(elements: T[], usedSet: Set<T>): void {
    for (const element of elements) {
      usedSet.add(element);
    }
  }

  /**
   * ✅ Check if disjoint paths form a valid bridge pattern.
   */
  private isValidBridgePattern(
    paths: [{ nodes: NodeId[]; branches: BranchId[] }, { nodes: NodeId[]; branches: BranchId[] }],
    usedNodes: Set<NodeId>,
    usedBranches: Set<BranchId>
  ): boolean {
    const [path1, path2] = paths;

    if (this.pathsHaveUsedNodes(path1, path2, usedNodes)) return false;
    if (this.pathsHaveUsedBranches(path1, path2, usedBranches)) return false;

    return this.hasBridgeStructure(path1, path2);
  }

  /**
   * ✅ Check if paths have any used nodes.
   */
  private pathsHaveUsedNodes(
    path1: { nodes: NodeId[] },
    path2: { nodes: NodeId[] },
    usedNodes: Set<NodeId>
  ): boolean {
    return this.hasUsedElements([...path1.nodes, ...path2.nodes], usedNodes);
  }

  /**
   * ✅ Check if paths have any used branches.
   */
  private pathsHaveUsedBranches(
    path1: { branches: BranchId[] },
    path2: { branches: BranchId[] },
    usedBranches: Set<BranchId>
  ): boolean {
    return this.hasUsedElements([...path1.branches, ...path2.branches], usedBranches);
  }

  /**
   * ✅ Check if any elements are already used.
   */
  private hasUsedElements<T>(elements: T[], usedSet: Set<T>): boolean {
    return elements.some((element) => usedSet.has(element));
  }

  /**
   * ✅ Check if paths have the correct bridge structure (4 nodes, 4 branches).
   */
  private hasBridgeStructure(
    path1: { nodes: NodeId[]; branches: BranchId[] },
    path2: { nodes: NodeId[]; branches: BranchId[] }
  ): boolean {
    const allNodes = new Set([...path1.nodes, ...path2.nodes]);
    const allBranches = new Set([...path1.branches, ...path2.branches]);
    return allNodes.size === 4 && allBranches.size === 4;
  }

  /**
   * 🔍 Extract bridge nodes from two paths.
   */
  private extractBridgeNodes(
    path1: { nodes: NodeId[] },
    path2: { nodes: NodeId[] }
  ): { start: NodeId; end: NodeId; intermediate1: NodeId; intermediate2: NodeId } {
    const start = path1.nodes[0];
    const end = path1.nodes.at(-1);
    const intermediate1 = path1.nodes[1];
    const intermediate2 = path2.nodes[1];

    const hasAllNodes = start !== undefined && end !== undefined && 
                        intermediate1 !== undefined && intermediate2 !== undefined;
    
    if (!hasAllNodes) {
      throw new Error("Invalid bridge pattern: missing nodes");
    }

    return { start, end, intermediate1, intermediate2 };
  }

  /**
   * 🏗️ Create a bridge pattern match from disjoint paths.
   */
  private createBridgeMatch(
    paths: [{ nodes: NodeId[]; branches: BranchId[] }, { nodes: NodeId[]; branches: BranchId[] }]
  ): PatternMatch {
    const [path1, path2] = paths;

    const bridgeNodes = this.extractBridgeNodes(path1, path2);
    const { start, end, intermediate1, intermediate2 } = bridgeNodes;

    // Diamond template: start at left, end at right, intermediates top/bottom
    const geometricTemplate: Point[] = [
      { x: 0, y: 50 },    // start (left)
      { x: 50, y: 0 },    // intermediate1 (top)
      { x: 50, y: 100 },  // intermediate2 (bottom)
      { x: 100, y: 50 },  // end (right)
    ];

    const pattern: CircuitPattern = {
      type: "bridge",
      nodes: [start, intermediate1, intermediate2, end],
      branches: [...path1.branches, ...path2.branches],
      geometricTemplate,
    };

    const nodeMapping = new Map<NodeId, number>([
      [start, 0],
      [intermediate1, 1],
      [intermediate2, 2],
      [end, 3],
    ]);

    const branchMapping = new Map<BranchId, number>();
    for (let index = 0; index < pattern.branches.length; index++) {
      const branchId = pattern.branches[index];
      if (branchId !== undefined) {
        branchMapping.set(branchId, index);
      }
    }

    return { pattern, nodeMapping, branchMapping };
  }

  /**
   * 🔍 Detect pi network patterns (triangle, 3 nodes, 3 branches forming cycle).
   */
  private detectPiPatterns(context: PatternDetectionContext): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (let i = 0; i < context.nodes.length; i++) {
      for (let j = i + 1; j < context.nodes.length; j++) {
        for (let k = j + 1; k < context.nodes.length; k++) {
          this.tryDetectPiPattern(
            [context.nodes[i], context.nodes[j], context.nodes[k]],
            context,
            matches
          );
        }
      }
    }

    return matches;
  }

  /**
   * 🔍 Try to detect a pi pattern in a 3-node subgraph.
   */
  private tryDetectPiPattern(
    nodeTriple: (ElectricalNode | undefined)[],
    context: PatternDetectionContext,
    matches: PatternMatch[]
  ): void {
    const validNodes = this.validateThreeNodes(nodeTriple);
    if (!validNodes) return;

    const subgraphNodes = validNodes;
    if (subgraphNodes.some((n) => context.usedNodes.has(n.id))) return;

    const subgraphBranches = this.getBranchesBetweenNodes(subgraphNodes, context.branches);
    if (!this.isPiPattern(subgraphNodes, subgraphBranches, context.usedBranches)) return;

    const match = this.createPiMatch(subgraphNodes, subgraphBranches);
    matches.push(match);
    this.markPatternAsUsed(match, context.usedNodes, context.usedBranches);
  }

  /**
   * ✅ Validate that all three nodes are defined.
   */
  private validateThreeNodes(
    nodeTriple: (ElectricalNode | undefined)[]
  ): [ElectricalNode, ElectricalNode, ElectricalNode] | undefined {
    const [node1, node2, node3] = nodeTriple;
    const allDefined = node1 !== undefined && node2 !== undefined && node3 !== undefined;
    return allDefined ? [node1, node2, node3] : undefined;
  }

  /**
   * ✅ Check if subgraph forms a pi network pattern.
   */
  private isPiPattern(
    subgraphNodes: ElectricalNode[],
    subgraphBranches: Branch[],
    usedBranches: Set<BranchId>
  ): boolean {
    if (!this.hasPiStructure(subgraphNodes, subgraphBranches)) return false;
    if (!this.hasValidPiBranches(subgraphBranches, usedBranches)) return false;

    return this.formsCycle(subgraphNodes, subgraphBranches);
  }

  /**
   * ✅ Check if subgraph has pi structure (3 nodes, 3 branches, all degree 2).
   */
  private hasPiStructure(subgraphNodes: ElectricalNode[], subgraphBranches: Branch[]): boolean {
    return matchesPattern(subgraphNodes, subgraphBranches, {
      nodeCount: 3,
      branchCount: 3,
      degrees: [2, 2, 2],
    });
  }

  /**
   * ✅ Check if pi pattern branches are valid (not used).
   */
  private hasValidPiBranches(subgraphBranches: Branch[], usedBranches: Set<BranchId>): boolean {
    return !subgraphBranches.some((branch) => usedBranches.has(branch.id));
  }

  /**
   * ✅ Check if subgraph forms a cycle.
   */
  private formsCycle(subgraphNodes: ElectricalNode[], subgraphBranches: Branch[]): boolean {
    const subAdjacency = buildAdjacencyList(subgraphNodes, subgraphBranches);
    return hasCycle(subgraphNodes, subAdjacency);
  }

  /**
   * 🏗️ Create a pi network pattern match.
   */
  private createPiMatch(
    subgraphNodes: ElectricalNode[],
    subgraphBranches: Branch[]
  ): PatternMatch {
    return this.createPatternMatch({
      type: "pi",
      nodes: subgraphNodes,
      branches: subgraphBranches,
      geometricTemplate: [
        { x: 50, y: 0 },
        { x: 0, y: 86.6 },
        { x: 100, y: 86.6 },
      ],
    });
  }

  /**
   * 🔍 Detect T network patterns (3 nodes, T-shape, degree-2 central node).
   */
  private detectTPatterns(context: PatternDetectionContext): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const centerNode of context.nodes) {
      if (context.usedNodes.has(centerNode.id)) continue;
      if (centerNode.connectedBranchIds.length !== 3) continue;

      this.tryDetectTPattern(centerNode, context, matches);
    }

    return matches;
  }

  /**
   * 🔍 Try to detect a T pattern with a given center node.
   */
  private tryDetectTPattern(
    centerNode: ElectricalNode,
    context: PatternDetectionContext,
    matches: PatternMatch[]
  ): void {
    const neighborNodes = this.getNeighborNodes(centerNode, context.nodes, context.branches);
    const subgraphNodes = [centerNode, ...neighborNodes];

    if (subgraphNodes.some((n) => context.usedNodes.has(n.id))) return;

    const subgraphBranches = this.getBranchesBetweenNodes(subgraphNodes, context.branches);
    if (!this.isTPattern(subgraphNodes, subgraphBranches, centerNode.id, context.usedBranches)) return;

    const match = this.createTMatch(subgraphNodes, subgraphBranches, centerNode.id);
    matches.push(match);
    this.markPatternAsUsed(match, context.usedNodes, context.usedBranches);
  }

  /**
   * 🔗 Get neighbor nodes connected to a center node.
   */
  private getNeighborNodes(
    centerNode: ElectricalNode,
    nodes: ElectricalNode[],
    branches: Branch[]
  ): ElectricalNode[] {
    const neighborNodes: ElectricalNode[] = [];

    for (const branchId of centerNode.connectedBranchIds) {
      const branch = branches.find((b) => b.id === branchId);
      if (!branch) continue;

      const neighborId = branch.fromNodeId === centerNode.id ? branch.toNodeId : branch.fromNodeId;
      const neighborNode = nodes.find((n) => n.id === neighborId);
      if (neighborNode) {
        neighborNodes.push(neighborNode);
      }
    }

    return neighborNodes;
  }

  /**
   * ✅ Check if subgraph forms a T network pattern.
   */
  private isTPattern(
    subgraphNodes: ElectricalNode[],
    subgraphBranches: Branch[],
    centerId: NodeId,
    usedBranches: Set<BranchId>
  ): boolean {
    if (!this.hasTStructure(subgraphNodes, subgraphBranches)) return false;
    if (!this.hasValidTBranches(subgraphBranches, usedBranches)) return false;
    if (!this.hasValidTCenter(subgraphNodes, centerId, subgraphBranches)) return false;

    return this.otherNodesHaveDegreeOne(subgraphNodes, centerId, subgraphBranches);
  }

  /**
   * ✅ Check if T pattern branches are valid (not used).
   */
  private hasValidTBranches(subgraphBranches: Branch[], usedBranches: Set<BranchId>): boolean {
    return !this.hasUsedElements(subgraphBranches.map((b) => b.id), usedBranches);
  }

  /**
   * ✅ Check if T pattern has a valid center node.
   */
  private hasValidTCenter(
    subgraphNodes: ElectricalNode[],
    centerId: NodeId,
    subgraphBranches: Branch[]
  ): boolean {
    const centerNode = subgraphNodes.find((n) => n.id === centerId);
    if (!centerNode) return false;

    return this.centerHasCorrectDegree(centerId, subgraphBranches);
  }

  /**
   * ✅ Check if subgraph has T structure (4 nodes, 3 branches).
   */
  private hasTStructure(subgraphNodes: ElectricalNode[], subgraphBranches: Branch[]): boolean {
    return subgraphNodes.length === 4 && subgraphBranches.length === 3;
  }

  /**
   * ✅ Check if center node has degree 3 in subgraph.
   */
  private centerHasCorrectDegree(centerId: NodeId, subgraphBranches: Branch[]): boolean {
    const centerBranches = subgraphBranches.filter(
      (b) => b.fromNodeId === centerId || b.toNodeId === centerId
    );
    return centerBranches.length === 3;
  }

  /**
   * ✅ Check if other nodes have degree 1 in subgraph.
   */
  private otherNodesHaveDegreeOne(
    subgraphNodes: ElectricalNode[],
    centerId: NodeId,
    subgraphBranches: Branch[]
  ): boolean {
    const otherNodes = subgraphNodes.filter((n) => n.id !== centerId);
    return otherNodes.every((node) => {
      const nodeBranches = subgraphBranches.filter(
        (b) => b.fromNodeId === node.id || b.toNodeId === node.id
      );
      return nodeBranches.length === 1;
    });
  }

  /**
   * 🏗️ Create a T network pattern match.
   */
  private createTMatch(
    subgraphNodes: ElectricalNode[],
    subgraphBranches: Branch[],
    centerId: NodeId
  ): PatternMatch {
    const otherNodes = subgraphNodes.filter((n) => n.id !== centerId);

    const geometricTemplate: Point[] = [
      { x: 50, y: 50 },
      { x: 0, y: 50 },
      { x: 100, y: 50 },
      { x: 50, y: 0 },
    ];

    const pattern: CircuitPattern = {
      type: "t",
      nodes: [centerId, ...otherNodes.map((n) => n.id)],
      branches: subgraphBranches.map((b) => b.id),
      geometricTemplate,
    };

    const nodeMapping = new Map<NodeId, number>([
      [centerId, 0],
      ...otherNodes.map((node, index) => [node.id, index + 1] as [NodeId, number]),
    ]);

    return {
      pattern,
      nodeMapping,
      branchMapping: this.createBranchMapping(subgraphBranches),
    };
  }

  /**
   * 🔍 Detect series chain patterns (N nodes, linear path, degree-2 intermediate nodes).
   */
  private detectSeriesPatterns(context: PatternDetectionContext): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const startNode of context.nodes) {
      if (context.usedNodes.has(startNode.id)) continue;

      const neighbors = context.adjacency.neighbors.get(startNode.id) ?? [];
      if (neighbors.length !== 1) continue;

      this.tryDetectSeriesChain(startNode.id, context, matches);
    }

    return matches;
  }

  /**
   * 🔍 Try to detect a series chain starting from a node.
   */
  private tryDetectSeriesChain(
    startNodeId: NodeId,
    context: PatternDetectionContext,
    matches: PatternMatch[]
  ): void {
    const chain = this.traceSeriesChain(startNodeId, context.adjacency, context.usedNodes, context.usedBranches);
    if (chain.nodes.length < 3) return;

    const chainNodes = this.resolveChainNodes(chain.nodes, context.nodes);
    const chainBranches = this.resolveChainBranches(chain.branches, context.branches);

    if (chainNodes.length < 3 || chainBranches.length < 2) return;

    const match = this.createSeriesMatch(chainNodes, chainBranches);
    matches.push(match);
    this.markChainAsUsed(chain, context.usedNodes, context.usedBranches);
  }

  /**
   * 🔗 Resolve node IDs to node objects.
   */
  private resolveChainNodes(nodeIds: NodeId[], nodes: ElectricalNode[]): ElectricalNode[] {
    return this.resolveIds(nodeIds, nodes, (n) => n.id);
  }

  /**
   * 🔗 Resolve branch IDs to branch objects.
   */
  private resolveChainBranches(branchIds: BranchId[], branches: Branch[]): Branch[] {
    return this.resolveIds(branchIds, branches, (b) => b.id);
  }

  /**
   * 🔗 Generic ID resolver for any type of element.
   */
  private resolveIds<TId, TElement>(
    ids: TId[],
    elements: TElement[],
    getId: (element: TElement) => TId
  ): TElement[] {
    const resolved: TElement[] = [];
    for (const id of ids) {
      const element = elements.find((e) => getId(e) === id);
      if (element) {
        resolved.push(element);
      }
    }
    return resolved;
  }

  /**
   * ✏️ Mark chain nodes and branches as used.
   */
  private markChainAsUsed(
    chain: { nodes: NodeId[]; branches: BranchId[] },
    usedNodes: Set<NodeId>,
    usedBranches: Set<BranchId>
  ): void {
    this.markElementsAsUsed(chain.nodes, usedNodes);
    this.markElementsAsUsed(chain.branches, usedBranches);
  }

  /**
   * 🛤️ Trace a series chain from a starting node.
   */
  private traceSeriesChain(
    start: NodeId,
    adjacency: AdjacencyList,
    usedNodes: Set<NodeId>,
    usedBranches: Set<BranchId>
  ): { nodes: NodeId[]; branches: BranchId[] } {
    const chainContext: ChainTracingContext = { adjacency, usedNodes, usedBranches };
    const chainNodes: NodeId[] = [start];
    const chainBranches: BranchId[] = [];
    let current = start;
    let previous: NodeId | undefined = undefined;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const nextStep = this.findNextChainStep(current, previous, chainContext);
      if (!nextStep) break;

      const { nextNode, nextBranch } = nextStep;
      const nextNeighbors = chainContext.adjacency.neighbors.get(nextNode) ?? [];

      if (nextNeighbors.length > 2) break;

      chainNodes.push(nextNode);
      chainBranches.push(nextBranch.id);

      previous = current;
      current = nextNode;

      if (nextNeighbors.length === 1) break;
    }

    return { nodes: chainNodes, branches: chainBranches };
  }

  /**
   * 🔍 Find the next step in a series chain.
   */
  private findNextChainStep(
    current: NodeId,
    previous: NodeId | undefined,
    chainContext: ChainTracingContext
  ): { nextNode: NodeId; nextBranch: Branch } | undefined {
    const neighbors = chainContext.adjacency.neighbors.get(current) ?? [];
    const branches = chainContext.adjacency.branches.get(current) ?? [];

    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      const branch = branches[i];

      if (neighbor === undefined || branch === undefined) continue;

      if (this.isValidNextChainNode(neighbor, branch, previous, chainContext)) {
        return { nextNode: neighbor, nextBranch: branch };
      }
    }

    return undefined;
  }

  /**
   * ✅ Check if a node is a valid next step in the chain.
   */
  private isValidNextChainNode(
    neighbor: NodeId,
    branch: Branch,
    previous: NodeId | undefined,
    chainContext: ChainTracingContext
  ): boolean {
    if (neighbor === previous) return false;
    if (chainContext.usedNodes.has(neighbor)) return false;
    if (chainContext.usedBranches.has(branch.id)) return false;

    return true;
  }

  /**
   * 🏗️ Create a series chain pattern match.
   */
  private createSeriesMatch(
    chainNodes: ElectricalNode[],
    chainBranches: Branch[]
  ): PatternMatch {
    const spacing = 100 / (chainNodes.length - 1);
    return this.createPatternMatch({
      type: "series",
      nodes: chainNodes,
      branches: chainBranches,
      geometricTemplate: chainNodes.map((_, index) => ({
        x: index * spacing,
        y: 50,
      })),
    });
  }

  /**
   * 🔗 Get all branches that connect nodes in a subgraph.
   */
  private getBranchesBetweenNodes(
    subgraphNodes: ElectricalNode[],
    allBranches: Branch[]
  ): Branch[] {
    const nodeIds = new Set(subgraphNodes.map((n) => n.id));

    return allBranches.filter(
      (branch) => nodeIds.has(branch.fromNodeId) && nodeIds.has(branch.toNodeId)
    );
  }

  /**
   * 🗺️ Create node ID to index mapping.
   */
  private createNodeMapping(nodes: ElectricalNode[]): Map<NodeId, number> {
    return new Map(nodes.map((node, index) => [node.id, index]));
  }

  /**
   * 🗺️ Create branch ID to index mapping.
   */
  private createBranchMapping(branches: Branch[]): Map<BranchId, number> {
    return new Map(branches.map((branch, index) => [branch.id, index]));
  }

  /**
   * 🏗️ Create a pattern match from pattern components.
   */
  private createPatternMatch(params: {
    type: PatternType;
    nodes: ElectricalNode[];
    branches: Branch[];
    geometricTemplate: Point[];
    customNodeMapping?: Map<NodeId, number>;
  }): PatternMatch {
    const pattern: CircuitPattern = {
      type: params.type,
      nodes: params.nodes.map((n) => n.id),
      branches: params.branches.map((b) => b.id),
      geometricTemplate: params.geometricTemplate,
    };

    return {
      pattern,
      nodeMapping: params.customNodeMapping ?? this.createNodeMapping(params.nodes),
      branchMapping: this.createBranchMapping(params.branches),
    };
  }

  /**
   * 🗜️ Collapse detected patterns into super nodes.
   *
   * Creates a simplified graph where each pattern is represented as a single super node.
   * External connections to the pattern are preserved.
   *
   * @param nodes - All nodes in the graph
   * @param branches - All branches in the graph
   * @param patterns - Detected pattern matches to collapse
   * @returns Simplified graph with patterns collapsed
   */
  collapsePatterns(
    nodes: ElectricalNode[],
    branches: Branch[],
    patterns: PatternMatch[]
  ): SimplifiedGraph {
    const { patternNodeIds, patternBranchIds } = this.collectPatternElements(patterns);
    const superNodes = this.createSuperNodes(patterns, branches, patternNodeIds);
    const remainingNodes = nodes.filter((n) => !patternNodeIds.has(n.id));
    const remainingBranches = branches.filter((b) => !patternBranchIds.has(b.id));

    return {
      nodes: remainingNodes,
      branches: remainingBranches,
      superNodes,
    };
  }

  /**
   * 📦 Collect all node and branch IDs that are part of patterns.
   */
  private collectPatternElements(patterns: PatternMatch[]): {
    patternNodeIds: Set<NodeId>;
    patternBranchIds: Set<BranchId>;
  } {
    const patternNodeIds = new Set<NodeId>();
    const patternBranchIds = new Set<BranchId>();

    for (const match of patterns) {
      this.markElementsAsUsed(match.pattern.nodes, patternNodeIds);
      this.markElementsAsUsed(match.pattern.branches, patternBranchIds);
    }

    return { patternNodeIds, patternBranchIds };
  }

  /**
   * 🏗️ Create super nodes from pattern matches.
   */
  private createSuperNodes(
    patterns: PatternMatch[],
    branches: Branch[],
    patternNodeIds: Set<NodeId>
  ): SuperNode[] {
    const superNodes: SuperNode[] = [];

    for (let i = 0; i < patterns.length; i++) {
      const match = patterns[i];
      if (!match) continue;

      const superNodeId = `super_${String(i)}` as NodeId;
      const externalConnections = this.findExternalConnections(
        match,
        branches,
        patternNodeIds
      );

      superNodes.push({
        id: superNodeId,
        patternMatch: match,
        externalConnections,
      });
    }

    return superNodes;
  }

  /**
   * 🔍 Find external connections to a pattern.
   *
   * Identifies branches that connect nodes inside the pattern to nodes outside.
   */
  private findExternalConnections(
    match: PatternMatch,
    allBranches: Branch[],
    _patternNodeIds: Set<NodeId>
  ): SuperNode["externalConnections"] {
    const connections: SuperNode["externalConnections"] = [];
    const internalNodeIds = new Set(match.pattern.nodes);

    for (const branch of allBranches) {
      const fromInPattern = internalNodeIds.has(branch.fromNodeId);
      const toInPattern = internalNodeIds.has(branch.toNodeId);

      // External connection: one end inside pattern, one end outside
      if (fromInPattern && !toInPattern) {
        connections.push({
          externalNodeId: branch.toNodeId,
          internalNodeId: branch.fromNodeId,
          branchId: branch.id,
        });
      } else if (toInPattern && !fromInPattern) {
        connections.push({
          externalNodeId: branch.fromNodeId,
          internalNodeId: branch.toNodeId,
          branchId: branch.id,
        });
      }
    }

    return connections;
  }

  /**
   * 🎯 Expand super nodes back into their original patterns.
   *
   * Restores patterns using their geometric templates, positioned and scaled
   * based on the super node's calculated position.
   *
   * @param simplifiedGraph - Graph with collapsed patterns
   * @param superNodePositions - Calculated positions for super nodes
   * @param scale - Scale factor for pattern templates (default: 1.0)
   * @returns Node positions for all nodes (including expanded patterns)
   */
  expandPatterns(
    simplifiedGraph: SimplifiedGraph,
    superNodePositions: Map<NodeId, Point>,
    scale = 1
  ): Map<NodeId, Point> {
    const allPositions = new Map<NodeId, Point>();

    this.copyRegularNodePositions(simplifiedGraph.nodes, superNodePositions, allPositions);
    this.expandSuperNodes(simplifiedGraph.superNodes, superNodePositions, scale, allPositions);

    return allPositions;
  }

  /**
   * 📋 Copy positions for regular nodes from super node positions.
   */
  private copyRegularNodePositions(
    nodes: ElectricalNode[],
    superNodePositions: Map<NodeId, Point>,
    allPositions: Map<NodeId, Point>
  ): void {
    for (const node of nodes) {
      const pos = superNodePositions.get(node.id);
      if (pos) {
        allPositions.set(node.id, pos);
      }
    }
  }

  /**
   * 🎨 Expand super nodes using their geometric templates.
   */
  private expandSuperNodes(
    superNodes: SuperNode[],
    superNodePositions: Map<NodeId, Point>,
    scale: number,
    allPositions: Map<NodeId, Point>
  ): void {
    for (const superNode of superNodes) {
      const superPos = superNodePositions.get(superNode.id);
      if (!superPos) continue;

      this.expandSingleSuperNode(superNode, superPos, scale, allPositions);
    }
  }

  /**
   * 🔧 Expand a single super node into its pattern nodes.
   */
  private expandSingleSuperNode(
    superNode: SuperNode,
    superPos: Point,
    scale: number,
    allPositions: Map<NodeId, Point>
  ): void {
    const { pattern, nodeMapping } = superNode.patternMatch;

    for (const [nodeId, templateIndex] of nodeMapping) {
      const templatePos = pattern.geometricTemplate[templateIndex];
      if (!templatePos) continue;

      const expandedPos: Point = {
        x: superPos.x + templatePos.x * scale,
        y: superPos.y + templatePos.y * scale,
      };

      allPositions.set(nodeId, expandedPos);
    }
  }
}
