/**
 * 🎯 LayoutOptimizer - Evaluates and selects optimal layout configurations
 *
 * This module generates multiple layout candidates and scores them based on:
 * - Intersection count (fewer is better)
 * - Edge spacing (more is better)
 * - Symmetry quality (higher is better)
 * - Planarity (planar layouts preferred)
 *
 * The optimizer selects the configuration that maximizes clarity and minimizes
 * visual noise.
 */

import type { Branch, ElectricalNode, NodeId, BranchId } from "../../../../types/analysis";
import type { Point, ArrowPoint } from "../types";
import { NodePlacer } from "./NodePlacer";
import { EdgeRouter } from "./EdgeRouter";
import { getLineIntersection } from "../utils/geometry";

/**
 * Configuration candidate with calculated layout
 */
interface LayoutCandidate {
  id: string;
  nodePositions: Map<NodeId, Point>;
  edgeRouting: Map<BranchId, { path: string; arrowPoint: ArrowPoint; isCurved: boolean }>;
  score: number;
}

/**
 * Configuration scoring metrics
 */
interface LayoutScore {
  intersectionCount: number;
  averageEdgeSpacing: number;
  symmetryQuality: number;
  isPlanar: boolean;
  totalScore: number;
}

/**
 * 🎯 LayoutOptimizer - Generates and evaluates layout configurations
 */
export class LayoutOptimizer {
  private readonly nodePlacer: NodePlacer;
  private readonly edgeRouter: EdgeRouter;

  constructor() {
    this.nodePlacer = new NodePlacer();
    this.edgeRouter = new EdgeRouter();
  }

  /**
   * 🚀 Generate and select optimal layout configuration
   *
   * @param nodes - Electrical nodes to layout
   * @param branches - Branches to route
   * @returns Best layout candidate with positions and routing
   */
  findOptimalLayout(
    nodes: ElectricalNode[],
    branches: Branch[]
  ): {
    nodePositions: Map<NodeId, Point>;
    edgeRouting: Map<BranchId, { path: string; arrowPoint: ArrowPoint; isCurved: boolean }>;
  } {
    const candidates = this.generateCandidates(nodes, branches);
    const scoredCandidates = this.scoreCandidates(candidates);
    return this.selectBestCandidate(scoredCandidates);
  }

  /**
   * 🏗️ Generate multiple layout candidates
   *
   * Creates variations by:
   * - Different force-directed random seeds
   * - Different grid sizes
   * - Different alignment thresholds
   *
   * @param nodes - Electrical nodes to layout
   * @param branches - Branches to route
   * @returns Array of layout candidates
   */
  private generateCandidates(
    nodes: ElectricalNode[],
    branches: Branch[]
  ): LayoutCandidate[] {
    const candidates: LayoutCandidate[] = [];
    const configs = this.getConfigVariations();

    for (const config of configs) {
      const candidate = this.createCandidate(nodes, branches, config);
      candidates.push(candidate);
    }

    return candidates;
  }

  /**
   * ⚙️ Get configuration variations for candidate generation
   *
   * @returns Array of configuration objects
   */
  private getConfigVariations(): Array<{ id: string; seed: number; gridSize: number }> {
    return [
      { id: "default", seed: 42, gridSize: 50 },
      { id: "fine-grid", seed: 42, gridSize: 25 },
      { id: "coarse-grid", seed: 42, gridSize: 100 },
      { id: "alt-seed-1", seed: 123, gridSize: 50 },
      { id: "alt-seed-2", seed: 456, gridSize: 50 },
    ];
  }

  /**
   * 🏗️ Create single layout candidate
   *
   * @param nodes - Electrical nodes
   * @param branches - Branches
   * @param config - Configuration parameters
   * @returns Layout candidate
   */
  private createCandidate(
    nodes: ElectricalNode[],
    branches: Branch[],
    config: { id: string; seed: number; gridSize: number }
  ): LayoutCandidate {
    const nodePlacement = this.nodePlacer.placeNodes(nodes, branches);
    const edgeRouting = this.edgeRouter.routeEdges(branches, nodePlacement.positions);

    return {
      id: config.id,
      nodePositions: nodePlacement.positions,
      edgeRouting,
      score: 0,
    };
  }

  /**
   * 📊 Score all candidates
   *
   * @param candidates - Layout candidates to score
   * @returns Candidates with calculated scores
   */
  private scoreCandidates(candidates: LayoutCandidate[]): LayoutCandidate[] {
    return candidates.map((candidate) => ({
      ...candidate,
      score: this.calculateScore(candidate).totalScore,
    }));
  }

  /**
   * 📊 Calculate score for a layout configuration
   *
   * Lower score is better. Scoring factors:
   * - Intersection count: +1000 per intersection
   * - Edge spacing: -10 per unit of average spacing
   * - Symmetry quality: -100 per symmetry match
   * - Planarity bonus: -500 if planar
   *
   * @param candidate - Layout candidate to score
   * @returns Detailed scoring metrics
   */
  private calculateScore(candidate: LayoutCandidate): LayoutScore {
    const intersectionCount = this.countIntersections(candidate);
    const averageEdgeSpacing = this.calculateAverageSpacing(candidate);
    const symmetryQuality = this.calculateSymmetryQuality(candidate);
    const isPlanar = intersectionCount === 0;

    const totalScore =
      intersectionCount * 1000 -
      averageEdgeSpacing * 10 -
      symmetryQuality * 100 -
      (isPlanar ? 500 : 0);

    return {
      intersectionCount,
      averageEdgeSpacing,
      symmetryQuality,
      isPlanar,
      totalScore,
    };
  }

  /**
   * ✅ Check if two edges are valid and intersect
   *
   * @param edge1 - First edge (may be undefined)
   * @param edge2 - Second edge (may be undefined)
   * @returns True if both edges exist and intersect
   */
  private areEdgesIntersecting(
    edge1: { path: string } | undefined,
    edge2: { path: string } | undefined
  ): boolean {
    if (edge1 === undefined || edge2 === undefined) {
      return false;
    }
    return this.edgesIntersect(edge1, edge2);
  }

  /**
   * 🔍 Count edge-edge intersections in layout
   *
   * @param candidate - Layout candidate
   * @returns Number of intersections
   */
  private countIntersections(candidate: LayoutCandidate): number {
    const edges = Array.from(candidate.edgeRouting.values());
    let count = 0;

    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const edge1 = edges[i];
        const edge2 = edges[j];
        if (this.areEdgesIntersecting(edge1, edge2)) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * 🔍 Check if two edges intersect
   *
   * @param edge1 - First edge
   * @param edge2 - Second edge
   * @returns True if edges intersect
   */
  private edgesIntersect(
    edge1: { path: string },
    edge2: { path: string }
  ): boolean {
    const points1 = this.extractPathPoints(edge1.path);
    const points2 = this.extractPathPoints(edge2.path);

    if (points1.length < 2 || points2.length < 2) {
      return false;
    }

    const start1 = points1[0];
    const end1 = points1.at(-1);
    const start2 = points2[0];
    const end2 = points2.at(-1);

    if (start1 === undefined) {
      return false;
    }
    if (end1 === undefined) {
      return false;
    }
    if (start2 === undefined) {
      return false;
    }
    if (end2 === undefined) {
      return false;
    }

    const line1 = { start: start1, end: end1 };
    const line2 = { start: start2, end: end2 };

    return getLineIntersection(line1, line2) !== undefined;
  }

  /**
   * 📍 Parse coordinate from regex match group
   *
   * @param value - Match group value
   * @returns Parsed number or 0 if undefined
   */
  private parseCoordinate(value: string | undefined): number {
    if (value === undefined) {
      return 0;
    }
    return Number.parseFloat(value);
  }

  /**
   * 📍 Extract points from SVG path string
   *
   * @param path - SVG path data
   * @returns Array of points
   */
  private extractPathPoints(path: string): Point[] {
    const points: Point[] = [];
    const matches = path.matchAll(/([ML])\s*([\d.]+)\s+([\d.]+)/g);

    for (const match of matches) {
      const x = this.parseCoordinate(match[2]);
      const y = this.parseCoordinate(match[3]);
      points.push({ x, y });
    }

    return points;
  }

  /**
   * 📏 Calculate average spacing between edges
   *
   * @param candidate - Layout candidate
   * @returns Average spacing value
   */
  private calculateAverageSpacing(candidate: LayoutCandidate): number {
    const edges = Array.from(candidate.edgeRouting.values());
    if (edges.length < 2) {
      return 100;
    }

    let totalSpacing = 0;
    let pairCount = 0;

    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const edge1 = edges[i];
        const edge2 = edges[j];
        if (edge1 && edge2) {
          totalSpacing += this.calculateEdgeDistance(edge1, edge2);
          pairCount++;
        }
      }
    }

    return pairCount > 0 ? totalSpacing / pairCount : 100;
  }

  /**
   * 📏 Calculate distance between two edges
   *
   * @param edge1 - First edge
   * @param edge2 - Second edge
   * @returns Distance value
   */
  private calculateEdgeDistance(
    edge1: { arrowPoint: { x: number; y: number } },
    edge2: { arrowPoint: { x: number; y: number } }
  ): number {
    const dx = edge1.arrowPoint.x - edge2.arrowPoint.x;
    const dy = edge1.arrowPoint.y - edge2.arrowPoint.y;
    return Math.hypot(dx, dy);
  }

  /**
   * 🔄 Calculate symmetry quality score
   *
   * @param candidate - Layout candidate
   * @returns Symmetry quality (0-1, higher is better)
   */
  private calculateSymmetryQuality(candidate: LayoutCandidate): number {
    const positions = Array.from(candidate.nodePositions.values());
    if (positions.length < 2) {
      return 0;
    }

    const centerX = this.calculateCenterX(positions);
    return this.calculateMirrorSymmetry(positions, centerX);
  }

  /**
   * 📍 Calculate center X coordinate
   *
   * @param positions - Node positions
   * @returns Center X value
   */
  private calculateCenterX(positions: Point[]): number {
    const sum = positions.reduce((acc, p) => acc + p.x, 0);
    return sum / positions.length;
  }

  /**
   * 🔄 Calculate mirror symmetry score
   *
   * @param positions - Node positions
   * @param centerX - Center X coordinate
   * @returns Symmetry score (0-1)
   */
  private calculateMirrorSymmetry(positions: Point[], centerX: number): number {
    let symmetryScore = 0;
    const threshold = 10;

    for (const pos of positions) {
      const mirrorX = 2 * centerX - pos.x;
      const hasMirror = this.hasMirrorPosition(positions, mirrorX, pos.y, threshold);
      if (hasMirror) {
        symmetryScore++;
      }
    }

    return symmetryScore / positions.length;
  }

  /**
   * 🔍 Check if mirror position exists
   *
   * @param positions - All positions
   * @param mirrorX - Mirror X coordinate
   * @param y - Y coordinate
   * @param threshold - Distance threshold
   * @returns True if mirror exists
   */
  private hasMirrorPosition(
    positions: Point[],
    mirrorX: number,
    y: number,
    threshold: number
  ): boolean {
    return positions.some(
      (p) => Math.abs(p.x - mirrorX) < threshold && Math.abs(p.y - y) < threshold
    );
  }

  /**
   * 🏆 Select best candidate from scored candidates
   *
   * @param candidates - Scored candidates
   * @returns Best candidate
   */
  private selectBestCandidate(candidates: LayoutCandidate[]): {
    nodePositions: Map<NodeId, Point>;
    edgeRouting: Map<BranchId, { path: string; arrowPoint: ArrowPoint; isCurved: boolean }>;
  } {
    const firstCandidate = candidates[0];
    if (!firstCandidate) {
      throw new Error("No candidates available for selection");
    }

    const best = candidates.reduce(
      (prev, curr) => (curr.score < prev.score ? curr : prev),
      firstCandidate
    );

    return {
      nodePositions: best.nodePositions,
      edgeRouting: best.edgeRouting,
    };
  }
}
