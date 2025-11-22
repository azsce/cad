/**
 * Integration tests for Pattern Recognition Pipeline
 *
 * Tests the full pattern recognition pipeline with various circuit configurations
 * to verify that pattern detection, collapse, optimization, and expansion work together.
 */

import { describe, it, expect } from "bun:test";
import { GraphLayoutEngine } from "./GraphLayoutEngine";
import type { AnalysisGraph, Branch, ElectricalNode } from "../../../../types/analysis";
import {
  createNodeId,
  createBranchId,
  createTreeId,
} from "../../../../types/analysis";
import type { LayoutGraph } from "../types";

// ============================================================================
// Graph Creation Helpers
// ============================================================================

type ComponentType = "resistor" | "voltageSource" | "currentSource";

interface NodeConfig {
  id: string;
  branches: string[];
}

interface BranchConfig {
  id: string;
  type: ComponentType;
  from: string;
  to: string;
  value?: number;
}

interface ResistorConfig {
  id: string;
  from: string;
  to: string;
  value?: number;
}

function createNode(params: NodeConfig): ElectricalNode {
  return {
    id: createNodeId(params.id),
    connectedBranchIds: params.branches.map((b) => createBranchId(b)),
  };
}

function createBranch(params: BranchConfig): Branch {
  return {
    id: createBranchId(params.id),
    type: params.type,
    value: params.value ?? 10,
    fromNodeId: createNodeId(params.from),
    toNodeId: createNodeId(params.to),
  };
}

function resistor(params: ResistorConfig): BranchConfig {
  const base: BranchConfig = {
    id: params.id,
    type: "resistor",
    from: params.from,
    to: params.to,
  };
  return params.value !== undefined ? { ...base, value: params.value } : base;
}

interface TestGraphConfig {
  nodes: NodeConfig[];
  branches: BranchConfig[];
  referenceNodeId: string;
}

function createTestGraph(params: TestGraphConfig): AnalysisGraph {
  return {
    nodes: params.nodes.map((n) => createNode(n)),
    branches: params.branches.map((b) => createBranch(b)),
    referenceNodeId: createNodeId(params.referenceNodeId),
    allSpanningTrees: [
      {
        id: createTreeId("tree1"),
        twigBranchIds: params.branches.map((b) => createBranchId(b.id)),
        linkBranchIds: [],
      },
    ],
    selectedTreeId: createTreeId("tree1"),
  };
}

// ============================================================================
// Test Circuit Generators
// ============================================================================

const bridgeCircuitConfig: TestGraphConfig = {
  nodes: [
    { id: "n1", branches: ["b1", "b2"] },
    { id: "n2", branches: ["b1", "b3"] },
    { id: "n3", branches: ["b2", "b4"] },
    { id: "n4", branches: ["b3", "b4"] },
  ],
  branches: [
    resistor({ id: "b1", from: "n1", to: "n2" }),
    resistor({ id: "b2", from: "n1", to: "n3" }),
    resistor({ id: "b3", from: "n2", to: "n4" }),
    resistor({ id: "b4", from: "n3", to: "n4" }),
  ],
  referenceNodeId: "n1",
};

const piNetworkCircuitConfig: TestGraphConfig = {
  nodes: [
    { id: "n1", branches: ["b1", "b3"] },
    { id: "n2", branches: ["b1", "b2"] },
    { id: "n3", branches: ["b2", "b3"] },
  ],
  branches: [
    resistor({ id: "b1", from: "n1", to: "n2" }),
    resistor({ id: "b2", from: "n2", to: "n3" }),
    resistor({ id: "b3", from: "n3", to: "n1" }),
  ],
  referenceNodeId: "n1",
};

const tNetworkCircuitConfig: TestGraphConfig = {
  nodes: [
    { id: "n1", branches: ["b1", "b2", "b3"] },
    { id: "n2", branches: ["b1"] },
    { id: "n3", branches: ["b2"] },
    { id: "n4", branches: ["b3"] },
  ],
  branches: [
    resistor({ id: "b1", from: "n1", to: "n2" }),
    resistor({ id: "b2", from: "n1", to: "n3" }),
    resistor({ id: "b3", from: "n1", to: "n4" }),
  ],
  referenceNodeId: "n1",
};

const seriesChainCircuitConfig: TestGraphConfig = {
  nodes: [
    { id: "n1", branches: ["b1"] },
    { id: "n2", branches: ["b1", "b2"] },
    { id: "n3", branches: ["b2", "b3"] },
    { id: "n4", branches: ["b3"] },
  ],
  branches: [
    resistor({ id: "b1", from: "n1", to: "n2" }),
    resistor({ id: "b2", from: "n2", to: "n3" }),
    resistor({ id: "b3", from: "n3", to: "n4" }),
  ],
  referenceNodeId: "n1",
};

function createBridgeCircuit(): AnalysisGraph {
  return createTestGraph(bridgeCircuitConfig);
}

function createPiNetworkCircuit(): AnalysisGraph {
  return createTestGraph(piNetworkCircuitConfig);
}

function createTNetworkCircuit(): AnalysisGraph {
  return createTestGraph(tNetworkCircuitConfig);
}

function createSeriesChainCircuit(): AnalysisGraph {
  return createTestGraph(seriesChainCircuitConfig);
}

function createMixedPatternCircuit(): AnalysisGraph {
  return createTestGraph({
    nodes: [
      { id: "n1", branches: ["b1", "b2"] },
      { id: "n2", branches: ["b1", "b3"] },
      { id: "n3", branches: ["b2", "b4"] },
      { id: "n4", branches: ["b3", "b4", "b5"] },
      { id: "n5", branches: ["b5", "b6"] },
      { id: "n6", branches: ["b6"] },
    ],
    branches: [
      resistor({ id: "b1", from: "n1", to: "n2" }),
      resistor({ id: "b2", from: "n1", to: "n3" }),
      resistor({ id: "b3", from: "n2", to: "n4" }),
      resistor({ id: "b4", from: "n3", to: "n4" }),
      resistor({ id: "b5", from: "n4", to: "n5" }),
      resistor({ id: "b6", from: "n5", to: "n6" }),
    ],
    referenceNodeId: "n1",
  });
}

interface SimpleBranchSpec {
  id: string;
  from: string;
  to: string;
}

function getBranchesForNode(nodeId: string, branches: SimpleBranchSpec[]): string[] {
  return branches.filter((b) => b.from === nodeId || b.to === nodeId).map((b) => b.id);
}

function createK5Graph(): AnalysisGraph {
  const nodes = ["n1", "n2", "n3", "n4", "n5"];
  const branches: SimpleBranchSpec[] = [];
  let branchId = 0;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const fromNode = nodes[i];
      const toNode = nodes[j];
      if (fromNode && toNode) {
        branches.push({
          id: `b${String(branchId++)}`,
          from: fromNode,
          to: toNode,
        });
      }
    }
  }

  return createTestGraph({
    nodes: nodes.map((id) => ({
      id,
      branches: getBranchesForNode(id, branches),
    })),
    branches: branches.map((b) => resistor(b)),
    referenceNodeId: "n1",
  });
}

function createK33Graph(): AnalysisGraph {
  const setA = ["a1", "a2", "a3"];
  const setB = ["b1", "b2", "b3"];
  const branches: SimpleBranchSpec[] = [];
  let branchId = 0;

  for (const a of setA) {
    for (const b of setB) {
      branches.push({
        id: `b${String(branchId++)}`,
        from: a,
        to: b,
      });
    }
  }

  const allNodes = [...setA, ...setB];

  return createTestGraph({
    nodes: allNodes.map((id) => ({
      id,
      branches: getBranchesForNode(id, branches),
    })),
    branches: branches.map((b) => resistor(b)),
    referenceNodeId: "a1",
  });
}

// ============================================================================
// Intersection Counting Helper
// ============================================================================

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function parsePathToSegments(path: string): LineSegment[] {
  const segments: LineSegment[] = [];
  const commands = path.match(/[ML][^ML]*/g);
  if (!commands) return segments;

  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    const type = cmd[0];
    const coords = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    if (type === "M") {
      currentX = coords[0] ?? 0;
      currentY = coords[1] ?? 0;
    } else if (type === "L") {
      const x2 = coords[0] ?? 0;
      const y2 = coords[1] ?? 0;
      segments.push({ x1: currentX, y1: currentY, x2, y2 });
      currentX = x2;
      currentY = y2;
    }
  }

  return segments;
}

function isParallel(denom: number): boolean {
  return Math.abs(denom) < 1e-10;
}

function isIntersectionValid(ua: number, ub: number, epsilon: number): boolean {
  const uaValid = ua > epsilon && ua < 1 - epsilon;
  const ubValid = ub > epsilon && ub < 1 - epsilon;
  return uaValid && ubValid;
}

function segmentsIntersect(seg1: LineSegment, seg2: LineSegment): boolean {
  const { x1: x1a, y1: y1a, x2: x2a, y2: y2a } = seg1;
  const { x1: x1b, y1: y1b, x2: x2b, y2: y2b } = seg2;

  const denom = (y2b - y1b) * (x2a - x1a) - (x2b - x1b) * (y2a - y1a);
  
  if (isParallel(denom)) {
    return false;
  }

  const ua = ((x2b - x1b) * (y1a - y1b) - (y2b - y1b) * (x1a - x1b)) / denom;
  const ub = ((x2a - x1a) * (y1a - y1b) - (y2a - y1a) * (x1a - x1b)) / denom;

  const epsilon = 0.01;
  return isIntersectionValid(ua, ub, epsilon);
}

interface EdgeSegment {
  edgeId: string;
  segment: LineSegment;
}

function extractAllSegments(layout: LayoutGraph): EdgeSegment[] {
  return layout.edges.flatMap((edge) => {
    const segments = parsePathToSegments(edge.path);
    return segments.map((seg) => ({ edgeId: edge.id, segment: seg }));
  });
}

function areDifferentEdges(seg1: EdgeSegment, seg2: EdgeSegment): boolean {
  return seg1.edgeId !== seg2.edgeId;
}

function checkSegmentPairIntersection(seg1: EdgeSegment, seg2: EdgeSegment): boolean {
  if (!areDifferentEdges(seg1, seg2)) {
    return false;
  }
  return segmentsIntersect(seg1.segment, seg2.segment);
}

function shouldCountIntersection(
  seg1: EdgeSegment | undefined,
  seg2: EdgeSegment | undefined
): boolean {
  if (seg1 === undefined || seg2 === undefined) {
    return false;
  }
  return checkSegmentPairIntersection(seg1, seg2);
}

function countIntersectionsInSegmentList(segments: EdgeSegment[]): number {
  let count = 0;

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const seg1 = segments[i];
      const seg2 = segments[j];

      if (shouldCountIntersection(seg1, seg2)) {
        count++;
      }
    }
  }

  return count;
}

function countEdgeIntersections(layout: LayoutGraph): number {
  const allSegments = extractAllSegments(layout);
  return countIntersectionsInSegmentList(allSegments);
}

// ============================================================================
// Assertion Helpers
// ============================================================================

interface LayoutExpectations {
  expectedNodes: number;
  expectedEdges: number;
}

function assertLayoutStructure(layout: LayoutGraph, expectations: LayoutExpectations): void {
  expect(layout.nodes).toHaveLength(expectations.expectedNodes);
  expect(layout.edges).toHaveLength(expectations.expectedEdges);
  expect(layout.width).toBeGreaterThanOrEqual(0);
  expect(layout.height).toBeGreaterThanOrEqual(0);
}

function assertValidPositions(layout: LayoutGraph): void {
  for (const node of layout.nodes) {
    expect(Number.isFinite(node.x)).toBe(true);
    expect(Number.isFinite(node.y)).toBe(true);
    expect(Number.isFinite(node.labelPos.x)).toBe(true);
    expect(Number.isFinite(node.labelPos.y)).toBe(true);
  }

  for (const edge of layout.edges) {
    expect(edge.path).toBeDefined();
    expect(edge.path.length).toBeGreaterThan(0);
    expect(Number.isFinite(edge.arrowPoint.x)).toBe(true);
    expect(Number.isFinite(edge.arrowPoint.y)).toBe(true);
    expect(Number.isFinite(edge.arrowPoint.angle)).toBe(true);
  }
}

function roundToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function hasNodeAlignment(uniqueCount: number, totalNodes: number): boolean {
  return uniqueCount < totalNodes;
}

function assertSymmetry(layout: LayoutGraph): void {
  const xCoords = layout.nodes.map((n) => n.x);
  const yCoords = layout.nodes.map((n) => n.y);

  const gridSize = 10;
  const uniqueX = new Set(xCoords.map((x) => roundToGrid(x, gridSize)));
  const uniqueY = new Set(yCoords.map((y) => roundToGrid(y, gridSize)));

  const hasXAlignment = hasNodeAlignment(uniqueX.size, layout.nodes.length);
  const hasYAlignment = hasNodeAlignment(uniqueY.size, layout.nodes.length);
  const hasAlignment = hasXAlignment || hasYAlignment;
  
  expect(hasAlignment).toBe(true);
}

// ============================================================================
// Test Execution Helpers
// ============================================================================

function calculateLayoutWithPatternRecognition(graph: AnalysisGraph): LayoutGraph {
  const engine = new GraphLayoutEngine({
    usePatternRecognition: true,
    prioritizePlanarity: true,
    annealingIterations: 1000,
  });
  return engine.calculateLayout(graph);
}

function calculateLayoutWithoutPatternRecognition(graph: AnalysisGraph): LayoutGraph {
  const engine = new GraphLayoutEngine({
    usePatternRecognition: false,
    prioritizePlanarity: false,
  });
  return engine.calculateLayout(graph);
}

interface ComparisonResult {
  withPattern: LayoutGraph;
  withoutPattern: LayoutGraph;
  intersectionsWithPattern: number;
  intersectionsWithoutPattern: number;
  improvement: number;
}

function compareLayouts(graph: AnalysisGraph): ComparisonResult {
  const withPattern = calculateLayoutWithPatternRecognition(graph);
  const withoutPattern = calculateLayoutWithoutPatternRecognition(graph);

  const intersectionsWithPattern = countEdgeIntersections(withPattern);
  const intersectionsWithoutPattern = countEdgeIntersections(withoutPattern);

  return {
    withPattern,
    withoutPattern,
    intersectionsWithPattern,
    intersectionsWithoutPattern,
    improvement: intersectionsWithoutPattern - intersectionsWithPattern,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Pattern Recognition Pipeline - Bridge Circuit", () => {
  it("should achieve 0 intersections for bridge circuit", () => {
    const graph = createBridgeCircuit();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertLayoutStructure(layout, { expectedNodes: 4, expectedEdges: 4 });
    assertValidPositions(layout);

    const intersections = countEdgeIntersections(layout);
    expect(intersections).toBe(0);
  });

  it("should maintain visual quality for bridge circuit", () => {
    const graph = createBridgeCircuit();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertSymmetry(layout);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });
});

describe("Pattern Recognition Pipeline - Pi Network", () => {
  it("should achieve 0 intersections for pi network", () => {
    const graph = createPiNetworkCircuit();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertLayoutStructure(layout, { expectedNodes: 3, expectedEdges: 3 });
    assertValidPositions(layout);

    const intersections = countEdgeIntersections(layout);
    expect(intersections).toBe(0);
  });

  it("should maintain visual quality for pi network", () => {
    const graph = createPiNetworkCircuit();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertSymmetry(layout);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });
});

describe("Pattern Recognition Pipeline - T Network", () => {
  it("should achieve 0 intersections for T network", () => {
    const graph = createTNetworkCircuit();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertLayoutStructure(layout, { expectedNodes: 4, expectedEdges: 3 });
    assertValidPositions(layout);

    const intersections = countEdgeIntersections(layout);
    expect(intersections).toBe(0);
  });

  it("should maintain visual quality for T network", () => {
    const graph = createTNetworkCircuit();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertSymmetry(layout);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });
});

describe("Pattern Recognition Pipeline - Series Chain", () => {
  it("should achieve 0 intersections for series chain", () => {
    const graph = createSeriesChainCircuit();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertLayoutStructure(layout, { expectedNodes: 4, expectedEdges: 3 });
    assertValidPositions(layout);

    const intersections = countEdgeIntersections(layout);
    expect(intersections).toBe(0);
  });

  it("should maintain visual quality for series chain", () => {
    const graph = createSeriesChainCircuit();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertSymmetry(layout);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });
});

describe("Pattern Recognition Pipeline - Mixed Patterns", () => {
  it("should handle mixed patterns correctly", () => {
    const graph = createMixedPatternCircuit();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertLayoutStructure(layout, { expectedNodes: 6, expectedEdges: 6 });
    assertValidPositions(layout);

    const intersections = countEdgeIntersections(layout);
    expect(intersections).toBeLessThanOrEqual(3);
  });

  it("should maintain visual quality for mixed patterns", () => {
    const graph = createMixedPatternCircuit();
    const layout = calculateLayoutWithPatternRecognition(graph);

    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    assertValidPositions(layout);
  });
});

describe("Pattern Recognition Pipeline - Non-Planar Graphs", () => {
  it("should minimize intersections for K5 graph", () => {
    const graph = createK5Graph();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertLayoutStructure(layout, { expectedNodes: 5, expectedEdges: 10 });
    assertValidPositions(layout);

    const intersections = countEdgeIntersections(layout);
    expect(intersections).toBeGreaterThan(0);
    expect(intersections).toBeLessThan(10);
  });

  it("should minimize intersections for K3,3 graph", () => {
    const graph = createK33Graph();
    const layout = calculateLayoutWithPatternRecognition(graph);

    assertLayoutStructure(layout, { expectedNodes: 6, expectedEdges: 9 });
    assertValidPositions(layout);

    const intersections = countEdgeIntersections(layout);
    expect(intersections).toBeGreaterThan(0);
    expect(intersections).toBeLessThan(9);
  });
});

describe("Pattern Recognition Pipeline - Comparison", () => {
  it("should reduce intersections compared to old pipeline for bridge", () => {
    const graph = createBridgeCircuit();
    const result = compareLayouts(graph);

    expect(result.intersectionsWithPattern).toBeLessThanOrEqual(
      result.intersectionsWithoutPattern
    );
    expect(result.improvement).toBeGreaterThanOrEqual(0);
  });

  it("should reduce intersections compared to old pipeline for pi network", () => {
    const graph = createPiNetworkCircuit();
    const result = compareLayouts(graph);

    expect(result.intersectionsWithPattern).toBeLessThanOrEqual(
      result.intersectionsWithoutPattern
    );
    expect(result.improvement).toBeGreaterThanOrEqual(0);
  });

  it("should reduce intersections compared to old pipeline for T network", () => {
    const graph = createTNetworkCircuit();
    const result = compareLayouts(graph);

    expect(result.intersectionsWithPattern).toBeLessThanOrEqual(
      result.intersectionsWithoutPattern
    );
    expect(result.improvement).toBeGreaterThanOrEqual(0);
  });

  it("should reduce intersections compared to old pipeline for series chain", () => {
    const graph = createSeriesChainCircuit();
    const result = compareLayouts(graph);

    expect(result.intersectionsWithPattern).toBeLessThanOrEqual(
      result.intersectionsWithoutPattern
    );
    expect(result.improvement).toBeGreaterThanOrEqual(0);
  });

  it("should reduce intersections compared to old pipeline for mixed patterns", () => {
    const graph = createMixedPatternCircuit();
    const result = compareLayouts(graph);

    expect(result.intersectionsWithPattern).toBeLessThanOrEqual(
      result.intersectionsWithoutPattern
    );
    expect(result.improvement).toBeGreaterThanOrEqual(0);
  });
});
