/**
 * NodePlacer: Hybrid Force-Grid Node Positioning Algorithm
 *
 * Calculates optimal node positions using a multi-phase approach:
 * 1. Force-directed relaxation for natural topology
 * 2. Grid snapping for clean alignment
 * 3. Alignment pass for axis-aligned nodes
 * 4. Symmetry enforcement for aesthetic quality
 */

import type { ElectricalNode, Branch, NodeId } from "../../../../types/analysis";
import type { Point, NodePlacementResult } from "../types";
import {
  findIsomorphicSubgraphs,
  calculateCentralAxis,
  mirrorPositions,
} from "../utils/symmetry";

/**
 * Configuration parameters for force-directed algorithm
 */
interface ForceConfig {
  /** Preferred distance between connected nodes */
  linkLength: number;
  /** Strength of repulsion between nodes */
  repulsionStrength: number;
  /** Strength of centering force */
  centeringStrength: number;
  /** Maximum iterations before stopping */
  maxIterations: number;
  /** Energy threshold for convergence */
  energyThreshold: number;
}

/**
 * Region crowding information
 */
interface RegionCrowding {
  /** Node IDs in this region */
  nodeIds: NodeId[];
  /** Branch density (branches per unit area) */
  branchDensity: number;
  /** Whether this region is crowded */
  isCrowded: boolean;
}

/**
 * Default force-directed configuration
 */
const DEFAULT_FORCE_CONFIG: ForceConfig = {
  linkLength: 150,
  repulsionStrength: 5000,
  centeringStrength: 0.1,
  maxIterations: 300,
  energyThreshold: 0.1,
};

/**
 * 🎯 NodePlacer: Calculate optimal node positions using hybrid force-grid algorithm.
 *
 * Combines force-directed layout with grid snapping, alignment, and symmetry
 * enforcement to produce textbook-quality circuit graph layouts.
 */
export class NodePlacer {
  private readonly config: ForceConfig;
  private readonly gridSize: number;
  private readonly alignmentThreshold: number;
  private readonly crowdingThreshold: number;
  private readonly regionSize: number;

  constructor(
    config: Partial<ForceConfig> = {},
    gridSize = 50,
    alignmentThreshold = 20,
    crowdingThreshold = 0.5,
    regionSize = 100
  ) {
    this.config = { ...DEFAULT_FORCE_CONFIG, ...config };
    this.gridSize = gridSize;
    this.alignmentThreshold = alignmentThreshold;
    this.crowdingThreshold = crowdingThreshold;
    this.regionSize = regionSize;
  }

  /**
   * 🚀 Main entry point: Calculate node positions with full pipeline.
   *
   * @param nodes - Electrical nodes from the circuit graph
   * @param branches - Branches defining connectivity
   * @returns Node positions and layout bounds
   */
  placeNodes(nodes: ElectricalNode[], branches: Branch[]): NodePlacementResult {
    if (nodes.length === 0) {
      return {
        positions: new Map(),
        bounds: { x: 0, y: 0, width: 0, height: 0 },
      };
    }

    // Phase A: Force-directed relaxation
    let positions = this.applyForceDirected(nodes, branches);

    // Phase B: Grid snapping
    positions = this.snapToGrid(positions, this.gridSize);

    // Phase C: Alignment pass
    positions = this.alignNodes(positions, this.alignmentThreshold);

    // Phase D: Symmetry enforcement
    positions = this.enforceSymmetry(positions, nodes, branches);

    // Phase E: Dynamic spacing adjustment
    positions = this.adjustSpacing(positions, branches);

    // Phase F: Centering and bounds calculation
    const result = this.centerAndCalculateBounds(positions);

    return result;
  }

  /**
   * ⚡ Apply force-directed relaxation to untangle the graph.
   *
   * Uses centering, link, and repulsion forces to create a natural layout.
   * Iterates until energy stabilizes or max iterations reached.
   *
   * @param nodes - Electrical nodes
   * @param branches - Branches defining connectivity
   * @returns Initial node positions after force-directed layout
   */
  private applyForceDirected(
    nodes: ElectricalNode[],
    branches: Branch[]
  ): Map<NodeId, Point> {
    const positions = this.initializePositions(nodes);
    const velocities = new Map<NodeId, Point>();

    // Initialize velocities to zero
    for (const node of nodes) {
      velocities.set(node.id, { x: 0, y: 0 });
    }

    let previousEnergy = Number.POSITIVE_INFINITY;

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      const forces = new Map<NodeId, Point>();

      // Initialize forces to zero
      for (const node of nodes) {
        forces.set(node.id, { x: 0, y: 0 });
      }

      // Apply centering force
      this.applyCenteringForce(positions, forces);

      // Apply link forces (attraction between connected nodes)
      this.applyLinkForces(positions, branches, forces);

      // Apply repulsion forces (push nodes apart)
      this.applyRepulsionForces(positions, nodes, forces);

      // Update positions based on forces
      this.updatePositions(positions, velocities, forces, iteration);

      // Calculate total energy
      const energy = this.calculateEnergy(forces);

      // Check for convergence
      const energyDelta = Math.abs(energy - previousEnergy);
      if (energyDelta < this.config.energyThreshold) {
        break;
      }

      previousEnergy = energy;
    }

    return positions;
  }

  /**
   * 🏗️ Initialize node positions randomly.
   *
   * @param nodes - Electrical nodes
   * @returns Map of initial random positions
   */
  private initializePositions(nodes: ElectricalNode[]): Map<NodeId, Point> {
    const positions = new Map<NodeId, Point>();
    const radius = 200;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;

      // Distribute nodes in a circle initially
      const angle = (i / nodes.length) * 2 * Math.PI;
      positions.set(node.id, {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
    }

    return positions;
  }

  /**
   * 🎯 Apply centering force to pull nodes toward origin.
   *
   * @param positions - Current node positions
   * @param forces - Force accumulator map
   */
  private applyCenteringForce(
    positions: Map<NodeId, Point>,
    forces: Map<NodeId, Point>
  ): void {
    for (const [nodeId, pos] of positions.entries()) {
      const force = forces.get(nodeId);
      if (!force) continue;

      force.x -= pos.x * this.config.centeringStrength;
      force.y -= pos.y * this.config.centeringStrength;
    }
  }

  /**
   * 🔗 Apply link forces (attraction between connected nodes).
   *
   * @param positions - Current node positions
   * @param branches - Branches defining connectivity
   * @param forces - Force accumulator map
   */
  private applyLinkForces(
    positions: Map<NodeId, Point>,
    branches: Branch[],
    forces: Map<NodeId, Point>
  ): void {
    for (const branch of branches) {
      this.applyLinkForce(branch, positions, forces);
    }
  }

  /**
   * 🔗 Apply link force for a single branch.
   *
   * @param branch - Branch to apply force to
   * @param positions - Current node positions
   * @param forces - Force accumulator map
   */
  private applyLinkForce(
    branch: Branch,
    positions: Map<NodeId, Point>,
    forces: Map<NodeId, Point>
  ): void {
    const branchData = this.getBranchData(branch, positions, forces);
    if (!branchData) return;

    const { pos1, pos2, force1, force2 } = branchData;
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1e-6) return;

    // Spring force: F = k * (distance - restLength)
    const displacement = distance - this.config.linkLength;
    const forceMagnitude = displacement * 0.1;

    const fx = (dx / distance) * forceMagnitude;
    const fy = (dy / distance) * forceMagnitude;

    force1.x += fx;
    force1.y += fy;
    force2.x -= fx;
    force2.y -= fy;
  }

  /**
   * 📦 Get branch data (positions and forces).
   *
   * @param branch - Branch to get data for
   * @param positions - Current node positions
   * @param forces - Force accumulator map
   * @returns Branch data or undefined if any data is missing
   */
  private getBranchData(
    branch: Branch,
    positions: Map<NodeId, Point>,
    forces: Map<NodeId, Point>
  ): { pos1: Point; pos2: Point; force1: Point; force2: Point } | undefined {
    const pos1 = positions.get(branch.fromNodeId);
    if (!pos1) return undefined;

    const pos2 = positions.get(branch.toNodeId);
    if (!pos2) return undefined;

    const force1 = forces.get(branch.fromNodeId);
    if (!force1) return undefined;

    const force2 = forces.get(branch.toNodeId);
    if (!force2) return undefined;

    return { pos1, pos2, force1, force2 };
  }



  /**
   * 💥 Apply repulsion forces (push nodes apart).
   *
   * @param positions - Current node positions
   * @param nodes - All electrical nodes
   * @param forces - Force accumulator map
   */
  private applyRepulsionForces(
    positions: Map<NodeId, Point>,
    nodes: ElectricalNode[],
    forces: Map<NodeId, Point>
  ): void {
    for (let i = 0; i < nodes.length; i++) {
      const node1 = nodes[i];
      if (!node1) continue;

      this.applyRepulsionForNode({ sourceNode: node1, startIndex: i, nodes, positions, forces });
    }
  }

  /**
   * 💥 Apply repulsion force from one node to all subsequent nodes.
   *
   * @param params - Repulsion parameters
   */
  private applyRepulsionForNode(params: {
    sourceNode: ElectricalNode;
    startIndex: number;
    nodes: ElectricalNode[];
    positions: Map<NodeId, Point>;
    forces: Map<NodeId, Point>;
  }): void {
    const { sourceNode, startIndex, nodes, positions, forces } = params;
    const pos1 = positions.get(sourceNode.id);
    const force1 = forces.get(sourceNode.id);
    if (!pos1 || !force1) return;

    for (let j = startIndex + 1; j < nodes.length; j++) {
      const node2 = nodes[j];
      if (!node2) continue;

      this.applyRepulsionBetweenNodes({ node2, pos1, force1, positions, forces });
    }
  }

  /**
   * 💥 Apply repulsion force between two nodes.
   *
   * @param params - Repulsion parameters
   */
  private applyRepulsionBetweenNodes(params: {
    node2: ElectricalNode;
    pos1: Point;
    force1: Point;
    positions: Map<NodeId, Point>;
    forces: Map<NodeId, Point>;
  }): void {
    const { node2, pos1, force1, positions, forces } = params;
    const pos2 = positions.get(node2.id);
    const force2 = forces.get(node2.id);
    if (!pos2 || !force2) return;

    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared < 1e-6) return;

    // Coulomb's law: F = k / r^2
    const forceMagnitude = this.config.repulsionStrength / distanceSquared;
    const distance = Math.sqrt(distanceSquared);

    const fx = (dx / distance) * forceMagnitude;
    const fy = (dy / distance) * forceMagnitude;

    force1.x -= fx;
    force1.y -= fy;
    force2.x += fx;
    force2.y += fy;
  }

  /**
   * 📍 Update node positions based on accumulated forces.
   *
   * @param positions - Current node positions (modified in place)
   * @param velocities - Current node velocities (modified in place)
   * @param forces - Accumulated forces
   * @param iteration - Current iteration number
   */
  private updatePositions(
    positions: Map<NodeId, Point>,
    velocities: Map<NodeId, Point>,
    forces: Map<NodeId, Point>,
    iteration: number
  ): void {
    // Cooling schedule: reduce step size over time
    const cooling = 1 - iteration / this.config.maxIterations;
    const damping = 0.9;

    for (const [nodeId, force] of forces.entries()) {
      const pos = positions.get(nodeId);
      const vel = velocities.get(nodeId);
      if (!pos || !vel) continue;

      // Update velocity with damping
      vel.x = vel.x * damping + force.x * cooling;
      vel.y = vel.y * damping + force.y * cooling;

      // Update position
      pos.x += vel.x;
      pos.y += vel.y;
    }
  }

  /**
   * ⚡ Calculate total energy in the system.
   *
   * @param forces - Current forces on all nodes
   * @returns Total energy (sum of force magnitudes)
   */
  private calculateEnergy(forces: Map<NodeId, Point>): number {
    let energy = 0;

    for (const force of forces.values()) {
      energy += Math.hypot(force.x, force.y);
    }

    return energy;
  }

  /**
   * 📐 Snap node positions to grid.
   *
   * @param positions - Current node positions
   * @param gridSize - Grid spacing in pixels
   * @returns Snapped positions
   */
  private snapToGrid(
    positions: Map<NodeId, Point>,
    gridSize: number
  ): Map<NodeId, Point> {
    const snapped = new Map<NodeId, Point>();

    for (const [nodeId, pos] of positions.entries()) {
      snapped.set(nodeId, {
        x: Math.round(pos.x / gridSize) * gridSize,
        y: Math.round(pos.y / gridSize) * gridSize,
      });
    }

    return snapped;
  }

  /**
   * 📏 Align nodes that are nearly on the same axis.
   *
   * @param positions - Current node positions
   * @param threshold - Distance threshold for alignment
   * @returns Aligned positions
   */
  private alignNodes(
    positions: Map<NodeId, Point>,
    threshold: number
  ): Map<NodeId, Point> {
    const aligned = new Map(positions);
    const nodeIds = Array.from(positions.keys());

    // Align vertically (same x-coordinate)
    this.alignVertically(aligned, nodeIds, threshold);

    // Align horizontally (same y-coordinate)
    this.alignHorizontally(aligned, nodeIds, threshold);

    return aligned;
  }

  /**
   * 📏 Align nodes vertically (snap to common x-coordinate).
   *
   * @param positions - Node positions (modified in place)
   * @param nodeIds - Array of node IDs
   * @param threshold - Distance threshold for alignment
   */
  private alignVertically(
    positions: Map<NodeId, Point>,
    nodeIds: NodeId[],
    threshold: number
  ): void {
    this.alignNodesInAxis(positions, nodeIds, threshold, "x");
  }

  /**
   * 📏 Align nodes horizontally (snap to common y-coordinate).
   *
   * @param positions - Node positions (modified in place)
   * @param nodeIds - Array of node IDs
   * @param threshold - Distance threshold for alignment
   */
  private alignHorizontally(
    positions: Map<NodeId, Point>,
    nodeIds: NodeId[],
    threshold: number
  ): void {
    this.alignNodesInAxis(positions, nodeIds, threshold, "y");
  }

  /**
   * 📏 Align nodes along a specific axis.
   *
   * @param positions - Node positions (modified in place)
   * @param nodeIds - Array of node IDs
   * @param threshold - Distance threshold for alignment
   * @param axis - Axis to align along ("x" or "y")
   */
  private alignNodesInAxis(
    positions: Map<NodeId, Point>,
    nodeIds: NodeId[],
    threshold: number,
    axis: "x" | "y"
  ): void {
    for (let i = 0; i < nodeIds.length; i++) {
      this.alignNodeWithSubsequent(i, nodeIds, positions, threshold, axis);
    }
  }

  /**
   * 📏 Align one node with all subsequent nodes along an axis.
   *
   * @param index - Index of the node to align
   * @param nodeIds - Array of all node IDs
   * @param positions - Node positions (modified in place)
   * @param threshold - Distance threshold for alignment
   * @param axis - Axis to align along ("x" or "y")
   */
  private alignNodeWithSubsequent(
    index: number,
    nodeIds: NodeId[],
    positions: Map<NodeId, Point>,
    threshold: number,
    axis: "x" | "y"
  ): void {
    const id1 = nodeIds[index];
    if (!id1) return;

    const pos1 = positions.get(id1);
    if (!pos1) return;

    for (let j = index + 1; j < nodeIds.length; j++) {
      this.alignTwoNodes(pos1, nodeIds[j], positions, threshold, axis);
    }
  }

  /**
   * 📏 Align two nodes along an axis if they are close enough.
   *
   * @param pos1 - Position of first node
   * @param id2 - ID of second node
   * @param positions - Node positions map
   * @param threshold - Distance threshold for alignment
   * @param axis - Axis to align along ("x" or "y")
   */
  private alignTwoNodes(
    pos1: Point,
    id2: NodeId | undefined,
    positions: Map<NodeId, Point>,
    threshold: number,
    axis: "x" | "y"
  ): void {
    if (!id2) return;

    const pos2 = positions.get(id2);
    if (!pos2) return;

    const diff = Math.abs(pos2[axis] - pos1[axis]);
    if (diff < threshold) {
      const avg = (pos1[axis] + pos2[axis]) / 2;
      pos1[axis] = avg;
      pos2[axis] = avg;
    }
  }

  /**
   * 🪞 Enforce symmetry for isomorphic sub-graphs.
   *
   * @param positions - Current node positions
   * @param nodes - All electrical nodes
   * @param branches - All branches
   * @returns Positions with symmetry enforced
   */
  private enforceSymmetry(
    positions: Map<NodeId, Point>,
    nodes: ElectricalNode[],
    branches: Branch[]
  ): Map<NodeId, Point> {
    const subgraphs = findIsomorphicSubgraphs(nodes, branches);

    if (subgraphs.length === 0) {
      return positions;
    }

    const axis = calculateCentralAxis(positions);
    const mirrored = mirrorPositions(positions, axis);

    // Apply mirroring to isomorphic sub-graphs
    const result = new Map(positions);

    for (const subgraph of subgraphs) {
      for (const nodeId of subgraph.nodes) {
        const mirroredPos = mirrored.get(nodeId);
        if (mirroredPos) {
          result.set(nodeId, mirroredPos);
        }
      }
    }

    return result;
  }

  /**
   * 🎯 Center the graph and calculate bounds.
   *
   * @param positions - Node positions
   * @returns Node placement result with centered positions and bounds
   */
  private centerAndCalculateBounds(
    positions: Map<NodeId, Point>
  ): NodePlacementResult {
    if (positions.size === 0) {
      return {
        positions: new Map(),
        bounds: { x: 0, y: 0, width: 0, height: 0 },
      };
    }

    const points = Array.from(positions.values());

    // Calculate bounding box
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    const width = maxX - minX;
    const height = maxY - minY;

    // Calculate center offset
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Center all positions
    const centered = new Map<NodeId, Point>();
    for (const [nodeId, pos] of positions.entries()) {
      centered.set(nodeId, {
        x: pos.x - centerX,
        y: pos.y - centerY,
      });
    }

    return {
      positions: centered,
      bounds: {
        x: -width / 2,
        y: -height / 2,
        width,
        height,
      },
    };
  }

  /**
   * � Adjust spacing dynamically based on crowding.
   *
   * Detects crowded regions and expands spacing between nodes
   * to ensure clear visual separation of branches.
   *
   * @param positions - Current node positions
   * @param branches - All branches
   * @returns Adjusted positions with expanded spacing
   */
  private adjustSpacing(
    positions: Map<NodeId, Point>,
    branches: Branch[]
  ): Map<NodeId, Point> {
    const crowdingInfo = this.detectCrowding(positions, branches);
    const crowdedRegions = crowdingInfo.filter((r) => r.isCrowded);

    if (crowdedRegions.length === 0) {
      return positions;
    }

    return this.expandSpacing(positions, crowdedRegions);
  }

  /**
   * 📐 Expand spacing in crowded regions.
   *
   * Increases distance between nodes in crowded areas to provide
   * clear spacing for branches and labels.
   *
   * @param positions - Current node positions
   * @param crowdedRegions - Regions that need spacing expansion
   * @returns Positions with expanded spacing
   */
  private expandSpacing(
    positions: Map<NodeId, Point>,
    crowdedRegions: RegionCrowding[]
  ): Map<NodeId, Point> {
    const adjusted = new Map(positions);

    for (const region of crowdedRegions) {
      this.expandRegionSpacing(adjusted, region);
    }

    return adjusted;
  }

  /**
   * 📐 Expand spacing within a single region.
   *
   * @param positions - Node positions (modified in place)
   * @param region - Region to expand
   */
  private expandRegionSpacing(
    positions: Map<NodeId, Point>,
    region: RegionCrowding
  ): void {
    if (region.nodeIds.length < 2) {
      return;
    }

    const center = this.calculateRegionCenter(region.nodeIds, positions);
    const expansionFactor = this.calculateExpansionFactor(region.branchDensity);

    for (const nodeId of region.nodeIds) {
      this.expandNodePosition(positions, nodeId, center, expansionFactor);
    }
  }

  /**
   * 🎯 Calculate center point of a region.
   *
   * @param nodeIds - Nodes in the region
   * @param positions - Node positions
   * @returns Center point
   */
  private calculateRegionCenter(
    nodeIds: NodeId[],
    positions: Map<NodeId, Point>
  ): Point {
    const points = nodeIds
      .map((id) => positions.get(id))
      .filter((p): p is Point => p !== undefined);

    if (points.length === 0) {
      return { x: 0, y: 0 };
    }

    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);

    return {
      x: sumX / points.length,
      y: sumY / points.length,
    };
  }

  /**
   * 📊 Calculate expansion factor based on branch density.
   *
   * Higher density requires more expansion.
   *
   * @param density - Branch density in region
   * @returns Expansion factor (1.0 = no expansion, >1.0 = expand)
   */
  private calculateExpansionFactor(density: number): number {
    const baseExpansion = 1.2;
    const densityMultiplier = Math.min(density / this.crowdingThreshold, 3);
    return baseExpansion + densityMultiplier * 0.3;
  }

  /**
   * 📍 Expand a single node's position away from region center.
   *
   * @param positions - Node positions (modified in place)
   * @param nodeId - Node to expand
   * @param center - Region center point
   * @param factor - Expansion factor
   */
  private expandNodePosition(
    positions: Map<NodeId, Point>,
    nodeId: NodeId,
    center: Point,
    factor: number
  ): void {
    const pos = positions.get(nodeId);
    if (!pos) {
      return;
    }

    const dx = pos.x - center.x;
    const dy = pos.y - center.y;

    positions.set(nodeId, {
      x: center.x + dx * factor,
      y: center.y + dy * factor,
    });
  }

  /**
   * 🔍 Detect crowding in regions between nodes.
   *
   * Divides the layout into regions and calculates branch density
   * for each region to identify crowded areas.
   *
   * @param positions - Current node positions
   * @param branches - All branches in the graph
   * @returns Array of region crowding information
   */
  detectCrowding(
    positions: Map<NodeId, Point>,
    branches: Branch[]
  ): RegionCrowding[] {
    if (positions.size === 0) {
      return [];
    }

    const regions = this.divideIntoRegions(positions);
    const crowdingInfo: RegionCrowding[] = [];

    for (const region of regions) {
      const density = this.calculateBranchDensity(region, branches, positions);
      crowdingInfo.push({
        nodeIds: region,
        branchDensity: density,
        isCrowded: density > this.crowdingThreshold,
      });
    }

    return crowdingInfo;
  }

  /**
   * 📦 Divide layout into spatial regions.
   *
   * Groups nodes into regions based on proximity.
   *
   * @param positions - Node positions
   * @returns Array of node ID groups (regions)
   */
  private divideIntoRegions(positions: Map<NodeId, Point>): NodeId[][] {
    const regions: NodeId[][] = [];
    const processed = new Set<NodeId>();

    for (const [nodeId, pos] of positions.entries()) {
      if (processed.has(nodeId)) {
        continue;
      }

      const region = this.findNodesInRegion(nodeId, pos, positions, processed);
      if (region.length > 0) {
        regions.push(region);
      }
    }

    return regions;
  }

  /**
   * 🔍 Find all nodes within region around a center node.
   *
   * @param centerId - Center node ID
   * @param centerPos - Center node position
   * @param positions - All node positions
   * @param processed - Set of already processed nodes
   * @returns Array of node IDs in this region
   */
  private findNodesInRegion(
    centerId: NodeId,
    centerPos: Point,
    positions: Map<NodeId, Point>,
    processed: Set<NodeId>
  ): NodeId[] {
    const region: NodeId[] = [centerId];
    processed.add(centerId);

    for (const [nodeId, pos] of positions.entries()) {
      if (this.isNodeInRegion(nodeId, pos, centerPos, processed)) {
        region.push(nodeId);
        processed.add(nodeId);
      }
    }

    return region;
  }

  /**
   * ✅ Check if node is within region.
   *
   * @param nodeId - Node ID to check
   * @param pos - Node position
   * @param centerPos - Region center position
   * @param processed - Set of already processed nodes
   * @returns True if node is in region
   */
  private isNodeInRegion(
    nodeId: NodeId,
    pos: Point,
    centerPos: Point,
    processed: Set<NodeId>
  ): boolean {
    if (processed.has(nodeId)) {
      return false;
    }

    const distance = Math.hypot(pos.x - centerPos.x, pos.y - centerPos.y);
    return distance <= this.regionSize;
  }

  /**
   * 📊 Calculate branch density in a region.
   *
   * Density is the number of branches per unit area in the region.
   *
   * @param nodeIds - Nodes in the region
   * @param branches - All branches
   * @param positions - Node positions
   * @returns Branch density (branches per 1000 square pixels)
   */
  private calculateBranchDensity(
    nodeIds: NodeId[],
    branches: Branch[],
    positions: Map<NodeId, Point>
  ): number {
    const nodeSet = new Set(nodeIds);
    const branchCount = this.countBranchesInRegion(branches, nodeSet);
    const area = this.calculateRegionArea(nodeIds, positions);

    if (area === 0) {
      return 0;
    }

    return (branchCount / area) * 1000;
  }

  /**
   * 🔢 Count branches within a region.
   *
   * @param branches - All branches
   * @param nodeSet - Set of node IDs in region
   * @returns Number of branches in region
   */
  private countBranchesInRegion(
    branches: Branch[],
    nodeSet: Set<NodeId>
  ): number {
    let count = 0;

    for (const branch of branches) {
      if (this.isBranchInRegion(branch, nodeSet)) {
        count++;
      }
    }

    return count;
  }

  /**
   * ✅ Check if branch is within region.
   *
   * @param branch - Branch to check
   * @param nodeSet - Set of node IDs in region
   * @returns True if both endpoints are in region
   */
  private isBranchInRegion(branch: Branch, nodeSet: Set<NodeId>): boolean {
    return nodeSet.has(branch.fromNodeId) && nodeSet.has(branch.toNodeId);
  }

  /**
   * 📐 Calculate area of a region.
   *
   * Uses bounding box of nodes in the region.
   *
   * @param nodeIds - Nodes in the region
   * @param positions - Node positions
   * @returns Area in square pixels
   */
  private calculateRegionArea(
    nodeIds: NodeId[],
    positions: Map<NodeId, Point>
  ): number {
    if (nodeIds.length === 0) {
      return 0;
    }

    const points = nodeIds
      .map((id) => positions.get(id))
      .filter((p): p is Point => p !== undefined);

    if (points.length === 0) {
      return 0;
    }

    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    const width = maxX - minX;
    const height = maxY - minY;

    return Math.max(width * height, 1);
  }

  /**
   * 🎯 Place nodes optimized for planarity using simulated annealing.
   *
   * Uses simulated annealing to minimize edge intersections and total edge length.
   * The cost function heavily penalizes intersections while also considering layout compactness.
   *
   * @param nodes - Electrical nodes to place
   * @param branches - Branches defining connectivity
   * @param iterations - Number of annealing iterations (default: 1000)
   * @returns Optimized node positions
   */
  placeNodesForPlanarity(
    nodes: ElectricalNode[],
    branches: Branch[],
    iterations = 1000
  ): Map<NodeId, Point> {
    if (nodes.length === 0) {
      return new Map();
    }

    let positions = this.applyForceDirected(nodes, branches);
    let currentScore = this.calculatePlanarityScore(positions, branches);
    let bestPositions = new Map(positions);
    let bestScore = currentScore;

    const initialTemp = 100;
    const coolingRate = 0.995;
    let temperature = initialTemp;

    for (let i = 0; i < iterations; i++) {
      const newPositions = this.perturbPositions(positions, temperature);
      const newScore = this.calculatePlanarityScore(newPositions, branches);
      const deltaE = newScore - currentScore;

      if (this.shouldAcceptMove(deltaE, temperature)) {
        positions = newPositions;
        currentScore = newScore;

        if (currentScore < bestScore) {
          bestPositions = new Map(positions);
          bestScore = currentScore;
        }
      }

      temperature *= coolingRate;
    }

    return bestPositions;
  }

  /**
   * 📊 Calculate planarity score for a layout.
   *
   * Cost = Intersections × 1000 + EdgeLength × 1
   * Lower scores are better. Intersections are heavily penalized.
   *
   * @param positions - Node positions
   * @param branches - Branches to evaluate
   * @returns Planarity score (lower is better)
   */
  calculatePlanarityScore(
    positions: Map<NodeId, Point>,
    branches: Branch[]
  ): number {
    const intersectionCount = this.countIntersections(positions, branches);
    const totalEdgeLength = this.calculateTotalEdgeLength(positions, branches);

    return intersectionCount * 1000 + totalEdgeLength;
  }

  /**
   * 🔍 Count edge intersections with look-ahead.
   *
   * Checks all pairs of edges to detect intersections.
   * Uses line-line intersection detection from geometry utilities.
   *
   * @param positions - Node positions
   * @param branches - Branches to check
   * @returns Number of edge intersections
   */
  private countIntersections(
    positions: Map<NodeId, Point>,
    branches: Branch[]
  ): number {
    let count = 0;

    for (let i = 0; i < branches.length; i++) {
      count += this.countIntersectionsForBranch(i, branches, positions);
    }

    return count;
  }

  /**
   * 🔢 Count intersections for a single branch with all subsequent branches.
   */
  private countIntersectionsForBranch(
    index: number,
    branches: Branch[],
    positions: Map<NodeId, Point>
  ): number {
    const branch1 = branches[index];
    if (!branch1) return 0;

    let count = 0;
    for (let j = index + 1; j < branches.length; j++) {
      const branch2 = branches[j];
      if (!branch2) continue;

      if (this.edgesIntersect(branch1, branch2, positions)) {
        count++;
      }
    }

    return count;
  }

  /**
   * ✅ Check if two edges intersect.
   *
   * @param branch1 - First branch
   * @param branch2 - Second branch
   * @param positions - Node positions
   * @returns True if edges intersect
   */
  private edgesIntersect(
    branch1: Branch,
    branch2: Branch,
    positions: Map<NodeId, Point>
  ): boolean {
    const pos1Start = positions.get(branch1.fromNodeId);
    const pos1End = positions.get(branch1.toNodeId);
    const pos2Start = positions.get(branch2.fromNodeId);
    const pos2End = positions.get(branch2.toNodeId);

    const allPositions = this.getAllPositions(pos1Start, pos1End, pos2Start, pos2End);
    if (!allPositions) {
      return false;
    }

    if (this.sharesEndpoint(branch1, branch2)) {
      return false;
    }

    const line1 = { start: allPositions.pos1Start, end: allPositions.pos1End };
    const line2 = { start: allPositions.pos2Start, end: allPositions.pos2End };

    const intersection = this.getLineIntersection(line1, line2);
    return intersection !== undefined;
  }

  /**
   * ✅ Get all four positions if they are all defined.
   */
  private getAllPositions(
    pos1Start: Point | undefined,
    pos1End: Point | undefined,
    pos2Start: Point | undefined,
    pos2End: Point | undefined
  ): { pos1Start: Point; pos1End: Point; pos2Start: Point; pos2End: Point } | undefined {
    if (!pos1Start) return undefined;
    if (!pos1End) return undefined;
    if (!pos2Start) return undefined;
    if (!pos2End) return undefined;
    
    return { pos1Start, pos1End, pos2Start, pos2End };
  }

  /**
   * ✅ Check if two branches share an endpoint.
   *
   * @param branch1 - First branch
   * @param branch2 - Second branch
   * @returns True if branches share a node
   */
  private sharesEndpoint(branch1: Branch, branch2: Branch): boolean {
    return (
      branch1.fromNodeId === branch2.fromNodeId ||
      branch1.fromNodeId === branch2.toNodeId ||
      branch1.toNodeId === branch2.fromNodeId ||
      branch1.toNodeId === branch2.toNodeId
    );
  }

  /**
   * 🔍 Calculate line-line intersection (wrapper for geometry utility).
   *
   * @param line1 - First line segment
   * @param line2 - Second line segment
   * @returns Intersection point or undefined
   */
  private getLineIntersection(
    line1: { start: Point; end: Point },
    line2: { start: Point; end: Point }
  ): Point | undefined {
    const { start: p1, end: p2 } = line1;
    const { start: p3, end: p4 } = line2;

    const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

    if (Math.abs(denominator) < 1e-10) {
      return undefined;
    }

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

    if (!this.isValidIntersectionParameter(ua, ub)) {
      return undefined;
    }

    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  }

  /**
   * ✅ Check if intersection parameters are valid (within [0, 1] range).
   */
  private isValidIntersectionParameter(ua: number, ub: number): boolean {
    if (ua < 0 || ua > 1) return false;
    if (ub < 0 || ub > 1) return false;
    return true;
  }

  /**
   * 📏 Calculate total edge length.
   *
   * @param positions - Node positions
   * @param branches - Branches to measure
   * @returns Sum of all edge lengths
   */
  private calculateTotalEdgeLength(
    positions: Map<NodeId, Point>,
    branches: Branch[]
  ): number {
    let total = 0;

    for (const branch of branches) {
      const pos1 = positions.get(branch.fromNodeId);
      const pos2 = positions.get(branch.toNodeId);

      if (pos1 && pos2) {
        total += Math.hypot(pos2.x - pos1.x, pos2.y - pos1.y);
      }
    }

    return total;
  }

  /**
   * 🎲 Perturb node positions randomly.
   *
   * Applies random displacement to a random node.
   * Displacement magnitude scales with temperature.
   *
   * @param positions - Current positions
   * @param temperature - Current temperature
   * @returns New positions with one node perturbed
   */
  private perturbPositions(
    positions: Map<NodeId, Point>,
    temperature: number
  ): Map<NodeId, Point> {
    const newPositions = new Map(positions);
    const nodeIds = Array.from(positions.keys());

    if (nodeIds.length === 0) {
      return newPositions;
    }

    // eslint-disable-next-line sonarjs/pseudo-random
    const randomIndex = Math.floor(Math.random() * nodeIds.length);
    const nodeId = nodeIds[randomIndex];
    if (!nodeId) {
      return newPositions;
    }

    const pos = positions.get(nodeId);
    if (!pos) {
      return newPositions;
    }

    const maxDisplacement = temperature * 2;
    // eslint-disable-next-line sonarjs/pseudo-random
    const dx = (Math.random() - 0.5) * maxDisplacement;
    // eslint-disable-next-line sonarjs/pseudo-random
    const dy = (Math.random() - 0.5) * maxDisplacement;

    newPositions.set(nodeId, {
      x: pos.x + dx,
      y: pos.y + dy,
    });

    return newPositions;
  }

  /**
   * ✅ Decide whether to accept a move in simulated annealing.
   *
   * Always accept improvements (deltaE < 0).
   * Accept worse moves with probability exp(-deltaE / T).
   *
   * @param deltaE - Change in energy (score)
   * @param temperature - Current temperature
   * @returns True if move should be accepted
   */
  private shouldAcceptMove(deltaE: number, temperature: number): boolean {
    if (deltaE < 0) {
      return true;
    }

    if (temperature <= 0) {
      return false;
    }

    const acceptanceProbability = Math.exp(-deltaE / temperature);
    // eslint-disable-next-line sonarjs/pseudo-random
    return Math.random() < acceptanceProbability;
  }

  /**
   * 🎨 Refine layout with light force-directed touch.
   *
   * Applies a few iterations of force-directed layout to smooth out
   * the positions after pattern expansion or other transformations.
   *
   * @param positions - Current node positions
   * @param nodes - Electrical nodes
   * @param branches - Branches defining connectivity
   * @param iterations - Number of refinement iterations (default: 50)
   * @returns Refined positions
   */
  refineLayout(
    positions: Map<NodeId, Point>,
    nodes: ElectricalNode[],
    branches: Branch[],
    iterations = 50
  ): Map<NodeId, Point> {
    const refined = new Map(positions);
    const velocities = new Map<NodeId, Point>();

    for (const node of nodes) {
      velocities.set(node.id, { x: 0, y: 0 });
    }

    for (let iteration = 0; iteration < iterations; iteration++) {
      const forces = new Map<NodeId, Point>();

      for (const node of nodes) {
        forces.set(node.id, { x: 0, y: 0 });
      }

      this.applyLinkForces(refined, branches, forces);
      this.applyRepulsionForces(refined, nodes, forces);

      this.updatePositions(refined, velocities, forces, iteration);
    }

    return refined;
  }
}
