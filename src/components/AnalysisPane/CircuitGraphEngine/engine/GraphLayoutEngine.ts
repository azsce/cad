/**
 * 🎯 GraphLayoutEngine - Main orchestrator for circuit graph layout calculation
 *
 * This module coordinates the layout pipeline by delegating to specialized modules:
 * 1. NodePlacer - Calculates optimal node positions
 * 2. EdgeRouter - Calculates optimal edge paths and arrows
 * 3. LabelOptimizer - Calculates collision-free label positions
 *
 * The engine transforms an AnalysisGraph (topology) into a LayoutGraph (geometry)
 * ready for SVG rendering.
 */

import type {
  AnalysisGraph,
  Branch,
  BranchId,
  ElectricalNode,
  NodeId,
} from "../../../../types/analysis";
import type {
  LayoutGraph,
  LayoutNode,
  LayoutEdge,
  Point,
  ArrowPoint,
} from "../types";
import { createPathData } from "../utils";
import { NodePlacer } from "./NodePlacer";
import { EdgeRouter } from "./EdgeRouter";
import { LabelOptimizer } from "./LabelOptimizer";
import { LayoutOptimizer } from "./LayoutOptimizer";
import { PatternMatcher } from "./PatternMatcher";

/**
 * Custom error for invalid graph input
 */
export class InvalidGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGraphError";
  }
}

/**
 * Configuration options for layout calculation
 */
export interface LayoutOptions {
  /** Enable pattern recognition for hierarchical layout */
  usePatternRecognition?: boolean;
  /** Prioritize planarity (minimize edge intersections) */
  prioritizePlanarity?: boolean;
  /** Number of simulated annealing iterations for planarity optimization */
  annealingIterations?: number;
  /** Enable legacy optimization (LayoutOptimizer) */
  useOptimization?: boolean;
}

/**
 * 🎯 GraphLayoutEngine - Orchestrates the layout calculation pipeline
 *
 * Transforms circuit topology (AnalysisGraph) into geometric representation (LayoutGraph)
 * using a multi-stage pipeline with specialized algorithms for each concern.
 */
export class GraphLayoutEngine {
  private readonly nodePlacer: NodePlacer;
  private readonly edgeRouter: EdgeRouter;
  private readonly labelOptimizer: LabelOptimizer;
  private readonly layoutOptimizer: LayoutOptimizer;
  private readonly patternMatcher: PatternMatcher;
  private readonly options: Required<LayoutOptions>;

  constructor(options?: LayoutOptions) {
    this.nodePlacer = new NodePlacer();
    this.edgeRouter = new EdgeRouter();
    this.labelOptimizer = new LabelOptimizer();
    this.layoutOptimizer = new LayoutOptimizer();
    this.patternMatcher = new PatternMatcher();
    
    // Default options: use new pattern recognition pipeline
    this.options = {
      usePatternRecognition: options?.usePatternRecognition ?? true,
      prioritizePlanarity: options?.prioritizePlanarity ?? true,
      annealingIterations: options?.annealingIterations ?? 1000,
      useOptimization: options?.useOptimization ?? false,
    };
  }

  /**
   * 🚀 Main entry point: Calculate complete layout for circuit graph
   *
   * Executes the layout pipeline in sequence:
   * 1. Validate input graph structure
   * 2. Filter current sources from branches
   * 3. Calculate node positions (NodePlacer or LayoutOptimizer)
   * 4. Calculate edge paths and arrows (EdgeRouter)
   * 5. Calculate label positions (LabelOptimizer)
   * 6. Assemble final LayoutGraph
   *
   * @param graph - Circuit topology to layout
   * @returns Geometric representation ready for rendering
   * @throws InvalidGraphError if graph structure is invalid
   */
  calculateLayout(graph: AnalysisGraph): LayoutGraph {
    // Step 1: Validate input
    this.validateGraph(graph);

    // Step 2: Filter current sources
    const filteredBranches = this.filterCurrentSources(graph.branches);

    // Step 3: Calculate node positions and edge routing
    const { nodePlacement, edgeRouting } = this.calculatePositionsAndRouting(
      graph.nodes,
      filteredBranches
    );

    // Step 4: Create initial layout nodes and edges (without optimized labels)
    const layoutNodes = this.createLayoutNodes(
      graph.nodes,
      nodePlacement.positions
    );

    const layoutEdges = this.createLayoutEdges(
      filteredBranches,
      edgeRouting,
      nodePlacement.positions
    );

    // Step 5: Optimize label positions
    const { nodeLabels, edgeLabels } = this.labelOptimizer.optimizeLabels(
      layoutNodes,
      layoutEdges
    );

    // Step 6: Update layout nodes and edges with optimized label positions
    const finalNodes = this.updateNodeLabels(layoutNodes, nodeLabels);
    const finalEdges = this.updateEdgeLabels(layoutEdges, edgeLabels);

    // Step 7: Assemble final LayoutGraph
    return this.assembleLayoutGraph(finalNodes, finalEdges, nodePlacement.bounds);
  }

  /**
   * 🎯 Calculate node positions and edge routing
   *
   * Selects the appropriate pipeline based on configuration:
   * - Pattern recognition pipeline (new, default)
   * - Legacy optimization pipeline (LayoutOptimizer)
   * - Standard pipeline (NodePlacer + EdgeRouter)
   *
   * @param nodes - Electrical nodes
   * @param branches - Filtered branches
   * @returns Node placement and edge routing
   */
  private calculatePositionsAndRouting(
    nodes: ElectricalNode[],
    branches: Branch[]
  ): {
    nodePlacement: { positions: Map<NodeId, Point>; bounds: { x: number; y: number; width: number; height: number } };
    edgeRouting: Map<BranchId, { path: string; arrowPoint: ArrowPoint; isCurved: boolean }>;
  } {
    // Pattern recognition pipeline (new approach)
    if (this.options.usePatternRecognition) {
      return this.calculateWithPatternRecognition(nodes, branches);
    }

    // Legacy optimization pipeline
    if (this.options.useOptimization) {
      return this.calculateWithLegacyOptimization(nodes, branches);
    }

    // Standard pipeline
    return this.calculateWithStandardPipeline(nodes, branches);
  }

  /**
   * 🎨 Calculate layout using pattern recognition pipeline.
   *
   * New approach: findPatterns → collapsePatterns → placeNodesForPlanarity →
   * expandPatterns → refineLayout → routeEdges
   *
   * @param nodes - Electrical nodes
   * @param branches - Filtered branches
   * @returns Node placement and edge routing
   */
  private calculateWithPatternRecognition(
    nodes: ElectricalNode[],
    branches: Branch[]
  ): {
    nodePlacement: { positions: Map<NodeId, Point>; bounds: { x: number; y: number; width: number; height: number } };
    edgeRouting: Map<BranchId, { path: string; arrowPoint: ArrowPoint; isCurved: boolean }>;
  } {
    // Step 1: Find patterns
    const patterns = this.patternMatcher.findPatterns(nodes, branches);

    // Step 2: Collapse patterns into super nodes
    const simplifiedGraph = this.patternMatcher.collapsePatterns(
      nodes,
      branches,
      patterns
    );

    // Step 3: Place nodes with planarity optimization
    const allNodes = [
      ...simplifiedGraph.nodes,
      ...simplifiedGraph.superNodes.map((sn) => ({
        id: sn.id,
        connectedBranchIds: sn.externalConnections.map((ec) => ec.branchId),
      })),
    ];

    let superNodePositions: Map<NodeId, Point>;
    if (this.options.prioritizePlanarity) {
      superNodePositions = this.nodePlacer.placeNodesForPlanarity(
        allNodes,
        simplifiedGraph.branches,
        this.options.annealingIterations
      );
    } else {
      const placement = this.nodePlacer.placeNodes(allNodes, simplifiedGraph.branches);
      superNodePositions = placement.positions;
    }

    // Step 4: Expand patterns back to original nodes
    const expandedPositions = this.patternMatcher.expandPatterns(
      simplifiedGraph,
      superNodePositions,
      1.0
    );

    // Step 5: Refine layout with light force-directed touch
    const refinedPositions = this.nodePlacer.refineLayout(
      expandedPositions,
      nodes,
      branches,
      50
    );

    // Step 6: Route edges
    const edgeRouting = this.edgeRouter.routeEdges(branches, refinedPositions);

    // Step 7: Calculate bounds
    const nodePlacement = this.nodePlacer.placeNodes(nodes, branches);

    return {
      nodePlacement: {
        positions: refinedPositions,
        bounds: nodePlacement.bounds,
      },
      edgeRouting,
    };
  }

  /**
   * 🔧 Calculate layout using legacy optimization pipeline.
   *
   * Uses LayoutOptimizer for backward compatibility.
   *
   * @param nodes - Electrical nodes
   * @param branches - Filtered branches
   * @returns Node placement and edge routing
   */
  private calculateWithLegacyOptimization(
    nodes: ElectricalNode[],
    branches: Branch[]
  ): {
    nodePlacement: { positions: Map<NodeId, Point>; bounds: { x: number; y: number; width: number; height: number } };
    edgeRouting: Map<BranchId, { path: string; arrowPoint: ArrowPoint; isCurved: boolean }>;
  } {
    const optimal = this.layoutOptimizer.findOptimalLayout(nodes, branches);
    const nodePlacement = this.nodePlacer.placeNodes(nodes, branches);
    return {
      nodePlacement: {
        positions: optimal.nodePositions,
        bounds: nodePlacement.bounds,
      },
      edgeRouting: optimal.edgeRouting,
    };
  }

  /**
   * 🔨 Calculate layout using standard pipeline.
   *
   * Standard approach: NodePlacer → EdgeRouter
   *
   * @param nodes - Electrical nodes
   * @param branches - Filtered branches
   * @returns Node placement and edge routing
   */
  private calculateWithStandardPipeline(
    nodes: ElectricalNode[],
    branches: Branch[]
  ): {
    nodePlacement: { positions: Map<NodeId, Point>; bounds: { x: number; y: number; width: number; height: number } };
    edgeRouting: Map<BranchId, { path: string; arrowPoint: ArrowPoint; isCurved: boolean }>;
  } {
    const nodePlacement = this.nodePlacer.placeNodes(nodes, branches);
    const edgeRouting = this.edgeRouter.routeEdges(branches, nodePlacement.positions);

    return { nodePlacement, edgeRouting };
  }

  /**
   * ✅ Validate AnalysisGraph structure
   *
   * Checks for:
   * - Missing nodes referenced by branches
   * - Disconnected branches (branches with invalid node references)
   * - Empty graph
   *
   * @param graph - Graph to validate
   * @throws InvalidGraphError if validation fails
   */
  private validateGraph(graph: AnalysisGraph): void {
    if (graph.nodes.length === 0) {
      throw new InvalidGraphError("Graph has no nodes");
    }

    if (graph.branches.length === 0) {
      throw new InvalidGraphError("Graph has no branches");
    }

    const nodeIds = new Set(graph.nodes.map((node) => node.id));

    for (const branch of graph.branches) {
      this.validateBranchNodes(branch, nodeIds);
    }
  }

  /**
   * ✅ Validate that branch references valid nodes
   *
   * @param branch - Branch to validate
   * @param nodeIds - Set of valid node IDs
   * @throws InvalidGraphError if branch references invalid nodes
   */
  private validateBranchNodes(branch: Branch, nodeIds: Set<NodeId>): void {
    if (!nodeIds.has(branch.fromNodeId)) {
      throw new InvalidGraphError(
        `Branch ${branch.id} references missing node ${branch.fromNodeId}`
      );
    }

    if (!nodeIds.has(branch.toNodeId)) {
      throw new InvalidGraphError(
        `Branch ${branch.id} references missing node ${branch.toNodeId}`
      );
    }
  }

  /**
   * 🔋 Filter current sources from branches
   *
   * Current sources are treated as open circuits in graph topology,
   * so they are removed from the graph representation.
   *
   * @param branches - All branches from the circuit
   * @returns Filtered branches (excluding current sources)
   */
  private filterCurrentSources(branches: Branch[]): Branch[] {
    return branches.filter((branch) => branch.type !== "currentSource");
  }

  /**
   * 🏗️ Create LayoutNode array from node positions
   *
   * Converts node positions to LayoutNode format with initial label positions.
   * Label positions will be optimized later by LabelOptimizer.
   *
   * @param nodes - Electrical nodes from graph
   * @param positions - Calculated node positions
   * @returns Array of LayoutNode objects
   */
  private createLayoutNodes(
    nodes: ElectricalNode[],
    positions: Map<NodeId, Point>
  ): LayoutNode[] {
    return nodes.map((node) => {
      const pos = positions.get(node.id);
      if (!pos) {
        throw new InvalidGraphError(`Missing position for node ${node.id}`);
      }

      return {
        id: node.id,
        x: pos.x,
        y: pos.y,
        label: node.id,
        labelPos: { x: pos.x, y: pos.y - 10 }, // Initial position, will be optimized
      };
    });
  }

  /**
   * 🏗️ Create LayoutEdge array from edge routing results
   *
   * Converts edge routing results to LayoutEdge format with initial label positions.
   * Label positions will be optimized later by LabelOptimizer.
   *
   * @param branches - Filtered branches (excluding current sources)
   * @param edgeRouting - Edge routing results from EdgeRouter
   * @param nodePositions - Node positions for validation
   * @returns Array of LayoutEdge objects
   */
  private createLayoutEdges(
    branches: Branch[],
    edgeRouting: Map<BranchId, { path: string; arrowPoint: ArrowPoint; isCurved: boolean }>,
    nodePositions: Map<NodeId, Point>
  ): LayoutEdge[] {
    return branches.map((branch) => {
      const routing = edgeRouting.get(branch.id);
      if (!routing) {
        throw new InvalidGraphError(`Missing routing for branch ${branch.id}`);
      }

      const fromPos = nodePositions.get(branch.fromNodeId);
      const toPos = nodePositions.get(branch.toNodeId);
      if (!fromPos || !toPos) {
        throw new InvalidGraphError(
          `Missing node positions for branch ${branch.id}`
        );
      }

      return {
        id: branch.id,
        sourceId: branch.fromNodeId,
        targetId: branch.toNodeId,
        path: createPathData(routing.path),
        arrowPoint: routing.arrowPoint,
        label: branch.id,
        labelPos: routing.arrowPoint, // Initial position, will be optimized
        isCurved: routing.isCurved,
      };
    });
  }

  /**
   * 🏷️ Update labels with optimized positions (generic helper)
   *
   * @param elements - Array of elements with initial label positions
   * @param labelPositions - Optimized label positions from LabelOptimizer
   * @returns Updated elements with optimized label positions
   */
  private updateLabels<T extends { id: string; labelPos: Point }>(
    elements: T[],
    labelPositions: Map<string, Point>
  ): T[] {
    return elements.map((element) => {
      const labelPos = labelPositions.get(element.id);
      if (!labelPos) {
        return element;
      }

      return {
        ...element,
        labelPos,
      };
    });
  }

  /**
   * 🏷️ Update node labels with optimized positions
   *
   * @param nodes - Layout nodes with initial label positions
   * @param nodeLabels - Optimized label positions from LabelOptimizer
   * @returns Updated layout nodes with optimized label positions
   */
  private updateNodeLabels(
    nodes: LayoutNode[],
    nodeLabels: Map<string, Point>
  ): LayoutNode[] {
    return this.updateLabels(nodes, nodeLabels);
  }

  /**
   * 🏷️ Update edge labels with optimized positions
   *
   * @param edges - Layout edges with initial label positions
   * @param edgeLabels - Optimized label positions from LabelOptimizer
   * @returns Updated layout edges with optimized label positions
   */
  private updateEdgeLabels(
    edges: LayoutEdge[],
    edgeLabels: Map<string, Point>
  ): LayoutEdge[] {
    return this.updateLabels(edges, edgeLabels);
  }

  /**
   * 📦 Assemble final LayoutGraph with all calculated data
   *
   * @param nodes - Layout nodes with optimized label positions
   * @param edges - Layout edges with optimized label positions
   * @param bounds - Layout bounds from node placement
   * @returns Complete LayoutGraph ready for rendering
   */
  private assembleLayoutGraph(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    bounds: { x: number; y: number; width: number; height: number }
  ): LayoutGraph {
    return {
      width: bounds.width,
      height: bounds.height,
      nodes,
      edges,
    };
  }
}
