/**
 * EdgeRouter: Path-Scored Edge Routing Algorithm
 *
 * Calculates optimal edge paths using intelligent candidate generation and scoring:
 * 1. Generate multiple path candidates (straight, curved)
 * 2. Score each candidate based on intersections, proximity, curvature
 * 3. Select best path with lowest penalty score
 * 4. Calculate arrow position and orientation
 */

import type { Branch, BranchId, NodeId } from "../../../../types/analysis";
import type {
  Point,
  EdgeRoutingResult,
  PathCandidate,
  LayoutNode,
  LayoutEdge,
  EdgeKey,
  PathData,
} from "../types";
import { createEdgeKey, createPathData } from "../utils";
import {
  getBezierPoint,
  getBezierTangent,
  getLineIntersection,
  pointToLineDistance,
} from "../utils/geometry";

/**
 * Bezier curve coordinates (start, control, end points)
 */
interface BezierCoords {
  start: Point;
  control: Point;
  end: Point;
}

/**
 * Line segment coordinates (start and end points)
 */
interface LineCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * 🛤️ EdgeRouter: Calculate optimal edge paths using path scoring system.
 *
 * Generates multiple candidate paths for each edge and selects the best one
 * based on intersection penalties, proximity penalties, and curvature bias.
 */
export class EdgeRouter {
  /**
   * 🚀 Main entry point: Route all edges with intelligent path selection.
   *
   * @param branches - Branches to route
   * @param nodePositions - Calculated node positions
   * @returns Map of branch IDs to edge routing results
   */
  routeEdges(
    branches: Branch[],
    nodePositions: Map<NodeId, Point>
  ): Map<BranchId, EdgeRoutingResult> {
    const results = new Map<BranchId, EdgeRoutingResult>();
    const existingElements: Array<LayoutNode | LayoutEdge> = [];

    // Convert node positions to LayoutNode format for collision detection
    const layoutNodes: LayoutNode[] = Array.from(nodePositions.entries()).map(
      ([id, pos]) => ({
        id,
        x: pos.x,
        y: pos.y,
        label: id,
        labelPos: { x: pos.x, y: pos.y - 10 },
      })
    );

    existingElements.push(...layoutNodes);

    // Detect parallel edges (multiple branches connecting same two nodes)
    const parallelGroups = this.detectParallelEdges(branches);

    for (const branch of branches) {
      const fromPos = nodePositions.get(branch.fromNodeId);
      const toPos = nodePositions.get(branch.toNodeId);

      if (!fromPos || !toPos) {
        continue;
      }

      // Check if this branch is part of a parallel group
      const parallelGroup = parallelGroups.get(this.getEdgeKey(branch));
      const parallelIndex = parallelGroup?.findIndex((b) => b.id === branch.id) ?? -1;
      const isParallel = parallelGroup && parallelGroup.length > 1 && parallelIndex >= 0;

      let candidates: PathCandidate[];

      if (isParallel) {
        // Generate symmetric curves for parallel edges
        // parallelGroup is guaranteed to exist here due to isParallel check
        candidates = this.generateParallelCandidates({
          from: fromPos,
          to: toPos,
          index: parallelIndex,
          total: parallelGroup.length,
        });
      } else {
        // Generate standard candidates
        candidates = this.generateCandidates({ from: fromPos, to: toPos });
      }

      // Score each candidate
      const scoredCandidates = candidates.map((candidate) => ({
        ...candidate,
        score: this.scorePath(candidate, existingElements),
      }));

      // Select best path
      const bestCandidate = this.selectBestPath(scoredCandidates);

      // Calculate arrow point
      const arrowPoint = this.calculateArrowPoint(bestCandidate.path);

      const result: EdgeRoutingResult = {
        path: bestCandidate.path,
        arrowPoint,
        isCurved: bestCandidate.isCurved,
      };

      results.set(branch.id, result);

      // Add this edge to existing elements for future collision checks
      const layoutEdge: LayoutEdge = {
        id: branch.id,
        sourceId: branch.fromNodeId,
        targetId: branch.toNodeId,
        path: result.path,
        arrowPoint: result.arrowPoint,
        label: branch.id,
        labelPos: arrowPoint,
        isCurved: result.isCurved,
      };
      existingElements.push(layoutEdge);
    }

    return results;
  }

  /**
   * 🔍 Detect parallel edges (multiple branches connecting same two nodes).
   *
   * Groups branches by their node pair (order-independent).
   *
   * @param branches - All branches to check
   * @returns Map of edge keys to branch groups
   */
  private detectParallelEdges(branches: Branch[]): Map<EdgeKey, Branch[]> {
    const groups = new Map<EdgeKey, Branch[]>();

    for (const branch of branches) {
      const key = this.getEdgeKey(branch);
      const group = groups.get(key) ?? [];
      group.push(branch);
      groups.set(key, group);
    }

    return groups;
  }

  /**
   * 🔑 Get a unique key for an edge (order-independent).
   *
   * @param branch - Branch to get key for
   * @returns Edge key string
   */
  private getEdgeKey(branch: Branch): EdgeKey {
    const ids = [branch.fromNodeId, branch.toNodeId].sort((a, b) => a.localeCompare(b));
    const id0 = ids[0];
    const id1 = ids[1];
    if (!id0 || !id1) {
      return createEdgeKey("");
    }
    return createEdgeKey(`${id0}-${id1}`);
  }

  /**
   * 🎨 Generate symmetric curves for parallel edges.
   *
   * Creates curves that bow outward symmetrically from the straight line.
   * Spacing increases with the number of parallel edges.
   *
   * @param params - Parallel edge generation parameters
   * @returns Array of path candidates
   */
  private generateParallelCandidates(params: {
    from: Point;
    to: Point;
    index: number;
    total: number;
  }): PathCandidate[] {
    const { from, to, index, total } = params;
    const candidates: PathCandidate[] = [];

    // Calculate perpendicular direction
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);

    if (length < 1e-6) {
      // Nodes at same position, return straight line
      const fromX = from.x.toString();
      const fromY = from.y.toString();
      const toX = to.x.toString();
      const toY = to.y.toString();
      const straightPath = createPathData(`M ${fromX} ${fromY} L ${toX} ${toY}`);
      return [{ path: straightPath, score: 0, isCurved: false }];
    }

    // Perpendicular unit vector
    const perpX = -dy / length;
    const perpY = dx / length;

    // Midpoint
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    // Calculate offset for this edge
    // Distribute edges symmetrically around the straight line
    const baseOffset = 40; // Base spacing between parallel edges
    const offset = this.calculateParallelOffset({ index, total, baseOffset });

    // Generate curved path with calculated offset
    const curvedPath = this.createCurvedPath({ from, to, midX, midY, perpX, perpY, offset });
    candidates.push({
      path: curvedPath,
      score: 0,
      isCurved: true,
    });

    return candidates;
  }

  /**
   * 📏 Calculate offset for a parallel edge.
   *
   * Distributes edges symmetrically around the center line.
   * For odd total: center edge at 0, others at ±baseOffset, ±2*baseOffset, etc.
   * For even total: edges at ±baseOffset/2, ±3*baseOffset/2, etc.
   *
   * @param params - Offset calculation parameters
   * @returns Offset in pixels (positive or negative)
   */
  private calculateParallelOffset(params: {
    index: number;
    total: number;
    baseOffset: number;
  }): number {
    const { index, total, baseOffset } = params;
    if (total === 1) {
      return 0;
    }

    // Calculate position relative to center
    const centerIndex = (total - 1) / 2;
    const relativeIndex = index - centerIndex;

    return relativeIndex * baseOffset;
  }

  /**
   * 🎨 Generate candidate paths for an edge.
   *
   * Creates four path options:
   * - Direct straight line
   * - Low-arc curve clockwise (+30px perpendicular offset)
   * - Low-arc curve counter-clockwise (-30px perpendicular offset)
   * - High-arc curve (+60px perpendicular offset)
   *
   * @param params - Edge endpoints
   * @returns Array of path candidates
   */
  private generateCandidates(params: { from: Point; to: Point }): PathCandidate[] {
    const { from, to } = params;
    const candidates: PathCandidate[] = [];

    // Path A: Direct straight line
    const fromX = from.x.toString();
    const fromY = from.y.toString();
    const toX = to.x.toString();
    const toY = to.y.toString();
    const straightPath = createPathData(`M ${fromX} ${fromY} L ${toX} ${toY}`);
    candidates.push({
      path: straightPath,
      score: 0,
      isCurved: false,
    });

    // Calculate perpendicular direction for curves
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);

    if (length < 1e-6) {
      // Nodes are at same position, only return straight line
      return candidates;
    }

    // Perpendicular unit vector (rotated 90 degrees)
    const perpX = -dy / length;
    const perpY = dx / length;

    // Midpoint between nodes
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    // Path B: Low-arc curve clockwise (+30px perpendicular)
    const lowArcCW = this.createCurvedPath({ from, to, midX, midY, perpX, perpY, offset: 30 });
    candidates.push({
      path: lowArcCW,
      score: 0,
      isCurved: true,
    });

    // Path C: Low-arc curve counter-clockwise (-30px perpendicular)
    const lowArcCCW = this.createCurvedPath({ from, to, midX, midY, perpX, perpY, offset: -30 });
    candidates.push({
      path: lowArcCCW,
      score: 0,
      isCurved: true,
    });

    // Path D: High-arc curve (+60px perpendicular)
    const highArc = this.createCurvedPath({ from, to, midX, midY, perpX, perpY, offset: 60 });
    candidates.push({
      path: highArc,
      score: 0,
      isCurved: true,
    });

    return candidates;
  }

  /**
   * 🎨 Create a curved path with specified control point offset.
   *
   * @param params - Path parameters
   * @returns SVG path data string
   */
  private createCurvedPath(params: {
    from: Point;
    to: Point;
    midX: number;
    midY: number;
    perpX: number;
    perpY: number;
    offset: number;
  }): PathData {
    const { from, to, midX, midY, perpX, perpY, offset } = params;
    const controlX = midX + perpX * offset;
    const controlY = midY + perpY * offset;

    const fromX = from.x.toString();
    const fromY = from.y.toString();
    const ctrlX = controlX.toString();
    const ctrlY = controlY.toString();
    const toX = to.x.toString();
    const toY = to.y.toString();

    return createPathData(`M ${fromX} ${fromY} Q ${ctrlX} ${ctrlY} ${toX} ${toY}`);
  }

  /**
   * 📊 Score a path candidate based on penalties and bonuses.
   *
   * Scoring formula:
   * score = intersectionPenalty + proximityPenalty + curvaturePenalty - symmetryBonus
   *
   * @param candidate - Path candidate to score
   * @param existingElements - Existing nodes and edges for collision detection
   * @returns Penalty score (lower is better)
   */
  private scorePath(
    candidate: PathCandidate,
    existingElements: Array<LayoutNode | LayoutEdge>
  ): number {
    let score = 0;

    // Curvature penalty: bias towards straight lines
    if (candidate.isCurved) {
      score += 10;
    }

    // Intersection penalty: +1000 per intersection with nodes/edges
    score += this.calculateIntersectionPenalty(candidate, existingElements);

    // Proximity penalty: +100 per pixel within 5px of other elements
    score += this.calculateProximityPenalty(candidate, existingElements);

    // Symmetry bonus: -50 if this path mirrors a partner edge
    score -= this.calculateSymmetryBonus(candidate, existingElements);

    return score;
  }

  /**
   * ⚠️ Calculate intersection penalty for a path.
   *
   * Checks for intersections with existing nodes and edges.
   * Each intersection adds 1000 to the penalty score.
   *
   * @param candidate - Path candidate to check
   * @param existingElements - Existing nodes and edges
   * @returns Intersection penalty
   */
  private calculateIntersectionPenalty(
    candidate: PathCandidate,
    existingElements: Array<LayoutNode | LayoutEdge>
  ): number {
    const pathPoints = this.parsePathPoints(candidate.path);
    if (!pathPoints) {
      return 0;
    }

    const intersections = this.countIntersections({ pathPoints, existingElements });
    return intersections * 1000;
  }

  /**
   * 🔢 Count intersections between path and existing elements.
   *
   * @param params - Intersection counting parameters
   * @returns Number of intersections
   */
  private countIntersections(params: {
    pathPoints: { start: Point; end: Point };
    existingElements: Array<LayoutNode | LayoutEdge>;
  }): number {
    const { pathPoints, existingElements } = params;
    let count = 0;
    const { start, end } = pathPoints;

    for (const element of existingElements) {
      if (this.elementIntersectsPath({ element, start, end })) {
        count++;
      }
    }

    return count;
  }

  /**
   * 🔍 Check if element intersects with path.
   *
   * @param params - Intersection check parameters
   * @returns True if intersection detected
   */
  private elementIntersectsPath(params: {
    element: LayoutNode | LayoutEdge;
    start: Point;
    end: Point;
  }): boolean {
    const { element, start, end } = params;
    if (this.isLayoutNode(element)) {
      return this.pathIntersectsNode({ start, end, node: element });
    }
    if (this.isLayoutEdge(element)) {
      return this.pathIntersectsEdge({ start, end, edge: element });
    }
    return false;
  }

  /**
   * 📏 Calculate proximity penalty for a path.
   *
   * Checks distance to other elements. Adds 100 penalty for each pixel
   * the path is within 5px of another element.
   *
   * @param candidate - Path candidate to check
   * @param existingElements - Existing nodes and edges
   * @returns Proximity penalty
   */
  private calculateProximityPenalty(
    candidate: PathCandidate,
    existingElements: Array<LayoutNode | LayoutEdge>
  ): number {
    const proximityThreshold = 5;
    const sampleCount = 10;

    let proximityPixels = 0;
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const point = this.getPointOnPath(candidate.path, t);
      proximityPixels += this.calculatePointProximity({
        point,
        existingElements,
        threshold: proximityThreshold,
      });
    }

    return Math.floor(proximityPixels * 100);
  }

  /**
   * 📏 Calculate proximity penalty for a single point.
   *
   * @param params - Proximity calculation parameters
   * @returns Proximity penalty for this point
   */
  private calculatePointProximity(params: {
    point: Point;
    existingElements: Array<LayoutNode | LayoutEdge>;
    threshold: number;
  }): number {
    const { point, existingElements, threshold } = params;
    let penalty = 0;

    for (const element of existingElements) {
      if (this.isLayoutNode(element)) {
        penalty += this.getNodeProximityPenalty({ point, node: element, threshold });
      }
    }

    return penalty;
  }

  /**
   * 📏 Get proximity penalty for a point near a node.
   *
   * @param params - Proximity check parameters
   * @returns Proximity penalty
   */
  private getNodeProximityPenalty(params: {
    point: Point;
    node: LayoutNode;
    threshold: number;
  }): number {
    const { point, node, threshold } = params;
    const distance = Math.hypot(point.x - node.x, point.y - node.y);
    if (distance < threshold) {
      return threshold - distance;
    }
    return 0;
  }

  /**
   * 🪞 Calculate symmetry bonus for a path.
   *
   * Detects if this path mirrors an existing edge.
   * Returns 50 if symmetry is detected, 0 otherwise.
   *
   * @param _candidate - Path candidate to check
   * @param _existingElements - Existing nodes and edges
   * @returns Symmetry bonus
   */
  private calculateSymmetryBonus(
    _candidate: PathCandidate,
    _existingElements: Array<LayoutNode | LayoutEdge>
  ): number {
    // Symmetry detection not yet implemented
    // For now, return 0 (no bonus)
    return 0;
  }

  /**
   * 🔍 Parse path data to extract start and end points.
   *
   * @param path - SVG path data string
   * @returns Start and end points, or undefined if parsing fails
   */
  private parsePathPoints(path: PathData): { start: Point; end: Point } | undefined {
    const coords = path.match(/[-+]?\d*\.?\d+/g);
    if (!coords || coords.length < 4) {
      return undefined;
    }

    const start = this.parseStartPoint(coords);
    if (!start) {
      return undefined;
    }

    const end = this.parseEndPoint(coords);
    if (!end) {
      return undefined;
    }

    return { start, end };
  }

  /**
   * 📍 Parse start point from coordinates.
   *
   * @param coords - Array of coordinate strings
   * @returns Start point or undefined if invalid
   */
  private parseStartPoint(coords: string[]): Point | undefined {
    const [coord0, coord1] = coords;
    if (!coord0 || !coord1) {
      return undefined;
    }

    return {
      x: Number.parseFloat(coord0),
      y: Number.parseFloat(coord1),
    };
  }

  /**
   * 📍 Parse end point from coordinates.
   *
   * @param coords - Array of coordinate strings
   * @returns End point or undefined if invalid
   */
  private parseEndPoint(coords: string[]): Point | undefined {
    // For straight line: M x1 y1 L x2 y2 (4 coords)
    // For curve: M x1 y1 Q cx cy x2 y2 (6 coords)
    const endIndex = coords.length >= 6 ? 4 : 2;
    const coordEndX = coords[endIndex];
    const coordEndY = coords[endIndex + 1];

    if (!coordEndX || !coordEndY) {
      return undefined;
    }

    return {
      x: Number.parseFloat(coordEndX),
      y: Number.parseFloat(coordEndY),
    };
  }

  /**
   * 🔍 Check if path intersects with a node.
   *
   * Treats node as a circle with radius 5px.
   *
   * @param params - Intersection check parameters
   * @returns True if intersection detected
   */
  private pathIntersectsNode(params: { start: Point; end: Point; node: LayoutNode }): boolean {
    const { start, end, node } = params;
    const nodeRadius = 5;
    const distance = pointToLineDistance({ x: node.x, y: node.y }, { start, end });
    return distance < nodeRadius;
  }

  /**
   * 🔍 Check if path intersects with an edge.
   *
   * Simplified check: tests if line segments intersect.
   *
   * @param params - Intersection check parameters
   * @returns True if intersection detected
   */
  private pathIntersectsEdge(params: { start: Point; end: Point; edge: LayoutEdge }): boolean {
    const { start, end, edge } = params;
    const edgePoints = this.parsePathPoints(edge.path);
    if (!edgePoints) {
      return false;
    }

    const { start: edgeStart, end: edgeEnd } = edgePoints;
    const intersection = getLineIntersection(
      { start, end },
      { start: edgeStart, end: edgeEnd }
    );

    return intersection !== undefined;
  }

  /**
   * 🎯 Get a point on the path at parameter t.
   *
   * @param path - SVG path data string
   * @param t - Parameter value (0 to 1)
   * @returns Point on the path
   */
  private getPointOnPath(path: PathData, t: number): Point {
    const isCurved = path.includes("Q");

    if (isCurved) {
      return this.getPointOnCurvedPath(path, t);
    }
    return this.getPointOnStraightPath(path, t);
  }

  /**
   * 🎯 Get a point on a curved path at parameter t.
   *
   * @param path - SVG path data string
   * @param t - Parameter value (0 to 1)
   * @returns Point on the path
   */
  private getPointOnCurvedPath(path: PathData, t: number): Point {
    const coords = path.match(/[-+]?\d*\.?\d+/g);
    if (!coords || coords.length < 6) {
      return { x: 0, y: 0 };
    }

    const bezierPoints = this.parseBezierCoords(coords);
    if (!bezierPoints) {
      return { x: 0, y: 0 };
    }

    return getBezierPoint(bezierPoints.start, bezierPoints.control, bezierPoints.end, t);
  }

  /**
   * 📐 Parse Bezier curve coordinates from array.
   *
   * @param coords - Array of coordinate strings
   * @returns Bezier points or undefined if invalid
   */
  private parseBezierCoords(coords: string[]): BezierCoords | undefined {
    const bezierCoords = coords.slice(0, 6);
    
    if (!this.hasValidBezierCoords(bezierCoords)) {
      return undefined;
    }

    // Type assertion is safe here because hasValidBezierCoords guarantees all values are strings
    const [coord0, coord1, coord2, coord3, coord4, coord5] = bezierCoords as [string, string, string, string, string, string];
    return {
      start: { x: Number.parseFloat(coord0), y: Number.parseFloat(coord1) },
      control: { x: Number.parseFloat(coord2), y: Number.parseFloat(coord3) },
      end: { x: Number.parseFloat(coord4), y: Number.parseFloat(coord5) },
    };
  }

  /**
   * ✅ Check if Bezier coordinates are valid.
   *
   * @param coords - Array of coordinate values to check
   * @returns True if all 6 coordinates are defined
   */
  private hasValidBezierCoords(coords: (string | undefined)[]): coords is string[] {
    return coords.length >= 6 && coords.slice(0, 6).every((coord) => coord !== undefined);
  }

  /**
   * 🎯 Get a point on a straight path at parameter t.
   *
   * @param path - SVG path data string
   * @param t - Parameter value (0 to 1)
   * @returns Point on the path
   */
  private getPointOnStraightPath(path: PathData, t: number): Point {
    const coords = path.match(/[-+]?\d*\.?\d+/g);
    if (!coords || coords.length < 4) {
      return { x: 0, y: 0 };
    }

    const linePoints = this.parseLineCoords(coords);
    if (!linePoints) {
      return { x: 0, y: 0 };
    }

    const { x1, y1, x2, y2 } = linePoints;
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  /**
   * 🔍 Type guard to check if element is a LayoutNode.
   *
   * @param element - Element to check
   * @returns True if element is a LayoutNode
   */
  private isLayoutNode(element: LayoutNode | LayoutEdge): element is LayoutNode {
    return "connectedBranchIds" in element || (!("sourceId" in element) && "x" in element);
  }

  /**
   * 🔍 Type guard to check if element is a LayoutEdge.
   *
   * @param element - Element to check
   * @returns True if element is a LayoutEdge
   */
  private isLayoutEdge(element: LayoutNode | LayoutEdge): element is LayoutEdge {
    return "sourceId" in element && "targetId" in element;
  }

  /**
   * 🏆 Select the best path from scored candidates.
   *
   * Chooses the candidate with the lowest score.
   * In case of tie, prefers straight over curved.
   *
   * @param candidates - Scored path candidates
   * @returns Best path candidate
   */
  private selectBestPath(candidates: PathCandidate[]): PathCandidate {
    const firstCandidate = candidates[0];
    if (!firstCandidate) {
      throw new Error("No path candidates available");
    }

    let best = firstCandidate;

    for (const candidate of candidates) {
      const isBetterScore = candidate.score < best.score;
      const isTieWithStraightPreference =
        candidate.score === best.score && !candidate.isCurved && best.isCurved;

      if (isBetterScore || isTieWithStraightPreference) {
        best = candidate;
      }
    }

    return best;
  }

  /**
   * 🎯 Calculate arrow position and orientation on a path.
   *
   * Evaluates the path at parameter t=0.5 (midpoint) to get position and tangent.
   * For straight lines, uses linear interpolation.
   * For curves, uses Bezier curve mathematics.
   *
   * @param path - SVG path data string
   * @returns Arrow point with position and rotation angle
   */
  private calculateArrowPoint(path: PathData): Point & { angle: number } {
    const t = 0.5; // Always use midpoint for arrow
    // Parse path data to determine if straight or curved
    const isCurved = path.includes("Q");

    if (isCurved) {
      return this.calculateArrowPointCurved({ path, t });
    }
    return this.calculateArrowPointStraight({ path, t });
  }

  /**
   * 🎯 Calculate arrow point for straight line path.
   *
   * @param params - Arrow calculation parameters
   * @returns Arrow point with position and rotation angle
   */
  private calculateArrowPointStraight(params: {
    path: PathData;
    t: number;
  }): Point & { angle: number } {
    const { path, t } = params;
    const coords = path.match(/[-+]?\d*\.?\d+/g);
    if (!coords || coords.length < 4) {
      throw new Error("Invalid straight line path");
    }

    const linePoints = this.parseLineCoords(coords);
    if (!linePoints) {
      throw new Error("Invalid straight line path");
    }

    return this.calculateLineArrowPoint({ linePoints, t });
  }

  /**
   * 📐 Parse line coordinates from array.
   *
   * @param coords - Array of coordinate strings
   * @returns Line points or undefined if invalid
   */
  private parseLineCoords(coords: string[]): LineCoords | undefined {
    if (coords.length < 4) {
      return undefined;
    }

    const lineCoords = this.extractLineCoords(coords);
    if (!lineCoords) {
      return undefined;
    }

    return {
      x1: Number.parseFloat(lineCoords.coord0),
      y1: Number.parseFloat(lineCoords.coord1),
      x2: Number.parseFloat(lineCoords.coord2),
      y2: Number.parseFloat(lineCoords.coord3),
    };
  }

  /**
   * 📦 Extract line coordinates from array.
   *
   * @param coords - Array of coordinate strings
   * @returns Extracted coordinates or undefined if any are missing
   */
  private extractLineCoords(
    coords: string[]
  ): { coord0: string; coord1: string; coord2: string; coord3: string } | undefined {
    const coord0 = coords[0];
    if (!coord0) return undefined;

    const coord1 = coords[1];
    if (!coord1) return undefined;

    const coord2 = coords[2];
    if (!coord2) return undefined;

    const coord3 = coords[3];
    if (!coord3) return undefined;

    return { coord0, coord1, coord2, coord3 };
  }

  /**
   * 🎯 Calculate arrow point on straight line.
   *
   * @param params - Arrow calculation parameters
   * @returns Arrow point with position and rotation angle
   */
  private calculateLineArrowPoint(params: {
    linePoints: LineCoords;
    t: number;
  }): Point & { angle: number } {
    const { linePoints, t } = params;
    const { x1, y1, x2, y2 } = linePoints;

    const x = x1 + t * (x2 - x1);
    const y = y1 + t * (y2 - y1);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);

    return { x, y, angle };
  }

  /**
   * 🎯 Calculate arrow point for curved path.
   *
   * @param params - Arrow calculation parameters
   * @returns Arrow point with position and rotation angle
   */
  private calculateArrowPointCurved(params: {
    path: PathData;
    t: number;
  }): Point & { angle: number } {
    const { path, t } = params;
    const coords = path.match(/[-+]?\d*\.?\d+/g);
    if (!coords || coords.length < 6) {
      throw new Error("Invalid curved path");
    }

    const bezierPoints = this.parseBezierCoords(coords);
    if (!bezierPoints) {
      throw new Error("Invalid curved path");
    }

    return this.calculateBezierArrowPoint({ bezierPoints, t });
  }

  /**
   * 🎯 Calculate arrow point on Bezier curve.
   *
   * @param params - Arrow calculation parameters
   * @returns Arrow point with position and rotation angle
   */
  private calculateBezierArrowPoint(params: {
    bezierPoints: BezierCoords;
    t: number;
  }): Point & { angle: number } {
    const { bezierPoints, t } = params;
    const { start, control, end } = bezierPoints;

    const point = getBezierPoint(start, control, end, t);
    const tangent = getBezierTangent(start, control, end, t);
    const angle = Math.atan2(tangent.dy, tangent.dx);

    return { x: point.x, y: point.y, angle };
  }
}
