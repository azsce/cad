/**
 * Integration tests for GraphLayoutEngine
 *
 * Tests the full layout pipeline with various circuit configurations.
 */

import { describe, it, expect } from "bun:test";
import { GraphLayoutEngine, InvalidGraphError } from "./GraphLayoutEngine";
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

// Helper to create electrical node
function createNode(params: { id: string; branches: string[] }): ElectricalNode {
  return {
    id: createNodeId(params.id),
    connectedBranchIds: params.branches.map((b) => createBranchId(b)),
  };
}

// Helper to create branch
function createBranch(params: {
  id: string;
  type: ComponentType;
  from: string;
  to: string;
  value?: number;
}): Branch {
  return {
    id: createBranchId(params.id),
    type: params.type,
    value: params.value ?? 10,
    fromNodeId: createNodeId(params.from),
    toNodeId: createNodeId(params.to),
  };
}

// Helper to create resistor branch shorthand
function resistor(params: { id: string; from: string; to: string; value?: number }) {
  const base = { id: params.id, type: "resistor" as const, from: params.from, to: params.to };
  return params.value === undefined ? base : { ...base, value: params.value };
}

// Helper to create voltage source branch shorthand
function voltageSource(params: { id: string; from: string; to: string; value?: number }) {
  const base = { id: params.id, type: "voltageSource" as const, from: params.from, to: params.to };
  return params.value === undefined ? base : { ...base, value: params.value };
}

// Helper to create current source branch shorthand
function currentSource(params: { id: string; from: string; to: string; value?: number }) {
  const base = { id: params.id, type: "currentSource" as const, from: params.from, to: params.to };
  return params.value === undefined ? base : { ...base, value: params.value };
}

// Helper to create complete AnalysisGraph
function createTestGraph(params: {
  nodes: Array<{ id: string; branches: string[] }>;
  branches: Array<{
    id: string;
    type: ComponentType;
    from: string;
    to: string;
    value?: number;
  }>;
  referenceNodeId: string;
  treeId?: string;
  twigBranchIds?: string[];
  linkBranchIds?: string[];
}): AnalysisGraph {
  const treeId = params.treeId ?? "tree1";
  const twigBranchIds = params.twigBranchIds ?? params.branches.map((b) => b.id);
  const linkBranchIds = params.linkBranchIds ?? [];

  return {
    nodes: params.nodes.map((n) => createNode(n)),
    branches: params.branches.map((b) => createBranch(b)),
    referenceNodeId: createNodeId(params.referenceNodeId),
    allSpanningTrees: [
      {
        id: createTreeId(treeId),
        twigBranchIds: twigBranchIds.map((id) => createBranchId(id)),
        linkBranchIds: linkBranchIds.map((id) => createBranchId(id)),
      },
    ],
    selectedTreeId: createTreeId(treeId),
  };
}

// Helper to create simple 2-node, 1-resistor graph
function createSimpleGraph(): AnalysisGraph {
  return createTestGraph({
    nodes: [
      { id: "1", branches: ["a"] },
      { id: "2", branches: ["a"] },
    ],
    branches: [resistor({ id: "a", from: "1", to: "2" })],
    referenceNodeId: "1",
  });
}

// Helper to create complex 5-node graph
function createComplexGraph(): AnalysisGraph {
  return createTestGraph({
    nodes: [
      { id: "1", branches: ["a", "b"] },
      { id: "2", branches: ["a", "c"] },
      { id: "3", branches: ["b", "d"] },
      { id: "4", branches: ["c", "d", "e"] },
      { id: "5", branches: ["e"] },
    ],
    branches: [
      resistor({ id: "a", from: "1", to: "2", value: 10 }),
      resistor({ id: "b", from: "1", to: "3", value: 20 }),
      resistor({ id: "c", from: "2", to: "4", value: 30 }),
      resistor({ id: "d", from: "3", to: "4", value: 40 }),
      voltageSource({ id: "e", from: "4", to: "5", value: 12 }),
    ],
    referenceNodeId: "1",
    twigBranchIds: ["a", "b", "c", "e"],
    linkBranchIds: ["d"],
  });
}

// Helper to create parallel branches graph
function createParallelBranchesGraph(): AnalysisGraph {
  return createTestGraph({
    nodes: [
      { id: "1", branches: ["a", "b"] },
      { id: "2", branches: ["a", "b"] },
    ],
    branches: [
      resistor({ id: "a", from: "1", to: "2", value: 10 }),
      resistor({ id: "b", from: "1", to: "2", value: 20 }),
    ],
    referenceNodeId: "1",
    twigBranchIds: ["a"],
    linkBranchIds: ["b"],
  });
}

// Helper to create graph with current source
function createGraphWithCurrentSource(): AnalysisGraph {
  return createTestGraph({
    nodes: [
      { id: "1", branches: ["a", "b"] },
      { id: "2", branches: ["a", "b"] },
    ],
    branches: [
      resistor({ id: "a", from: "1", to: "2" }),
      currentSource({ id: "b", from: "1", to: "2", value: 2 }),
    ],
    referenceNodeId: "1",
    twigBranchIds: ["a"],
  });
}

// Helper to create empty graph
function createEmptyGraph(): AnalysisGraph {
  return {
    nodes: [],
    branches: [],
    referenceNodeId: createNodeId("1"),
    allSpanningTrees: [],
    selectedTreeId: createTreeId("tree1"),
  };
}

// Helper to create graph with no branches
function createNoBranchesGraph(): AnalysisGraph {
  return {
    nodes: [{ id: createNodeId("1"), connectedBranchIds: [] }],
    branches: [],
    referenceNodeId: createNodeId("1"),
    allSpanningTrees: [],
    selectedTreeId: createTreeId("tree1"),
  };
}

// Helper to create graph with disconnected branch
function createDisconnectedBranchGraph(): AnalysisGraph {
  return createTestGraph({
    nodes: [{ id: "1", branches: ["a"] }],
    branches: [resistor({ id: "a", from: "1", to: "999" })],
    referenceNodeId: "1",
  });
}

// ============================================================================
// Assertion Helpers
// ============================================================================

// Helper to assert basic layout structure
function assertLayoutStructure(layout: LayoutGraph, expectedNodes: number, expectedEdges: number): void {
  expect(layout.nodes).toHaveLength(expectedNodes);
  expect(layout.edges).toHaveLength(expectedEdges);
  expect(layout.width).toBeGreaterThanOrEqual(0);
  expect(layout.height).toBeGreaterThanOrEqual(0);
}

// Helper to assert all nodes have valid positions
function assertNodePositions(layout: LayoutGraph): void {
  for (const node of layout.nodes) {
    expect(node.x).toBeDefined();
    expect(node.y).toBeDefined();
    expect(node.label).toBeDefined();
    expect(node.labelPos).toBeDefined();
  }
}

// Helper to assert all edges have valid paths
function assertEdgePaths(layout: LayoutGraph): void {
  for (const edge of layout.edges) {
    expect(edge.path).toBeDefined();
    expect(edge.arrowPoint).toBeDefined();
    expect(edge.arrowPoint.angle).toBeDefined();
    expect(edge.label).toBeDefined();
    expect(edge.labelPos).toBeDefined();
  }
}

// Helper to assert numeric validity
function assertNumericValidity(layout: LayoutGraph): void {
  for (const node of layout.nodes) {
    expect(typeof node.x).toBe("number");
    expect(typeof node.y).toBe("number");
    expect(Number.isFinite(node.x)).toBe(true);
    expect(Number.isFinite(node.y)).toBe(true);
  }

  for (const edge of layout.edges) {
    expect(edge.path).toMatch(/^M/);
    expect(typeof edge.arrowPoint.angle).toBe("number");
    expect(Number.isFinite(edge.arrowPoint.angle)).toBe(true);
  }
}

// Helper to assert layout dimensions are positive
function assertPositiveDimensions(layout: LayoutGraph): void {
  expect(layout.width).toBeGreaterThan(0);
  expect(layout.height).toBeGreaterThan(0);
}

// Helper to assert parallel edges are curved
function assertCurvedEdges(layout: LayoutGraph): void {
  const edge1 = layout.edges[0];
  const edge2 = layout.edges[1];
  expect(edge1).toBeDefined();
  expect(edge2).toBeDefined();
  expect(edge1?.isCurved || edge2?.isCurved).toBe(true);
}

// Helper to assert LayoutNode structure
function assertLayoutNodeStructure(layout: LayoutGraph): void {
  const node = layout.nodes[0];
  expect(node).toBeDefined();
  expect(node).toHaveProperty("id");
  expect(node).toHaveProperty("x");
  expect(node).toHaveProperty("y");
  expect(node).toHaveProperty("label");
  expect(node).toHaveProperty("labelPos");
  expect(node?.labelPos).toHaveProperty("x");
  expect(node?.labelPos).toHaveProperty("y");
}

// Helper to assert LayoutEdge structure
function assertLayoutEdgeStructure(layout: LayoutGraph): void {
  const edge = layout.edges[0];
  expect(edge).toBeDefined();
  expect(edge).toHaveProperty("id");
  expect(edge).toHaveProperty("sourceId");
  expect(edge).toHaveProperty("targetId");
  expect(edge).toHaveProperty("path");
  expect(edge).toHaveProperty("arrowPoint");
  expect(edge).toHaveProperty("label");
  expect(edge).toHaveProperty("labelPos");
  expect(edge).toHaveProperty("isCurved");
  expect(edge?.arrowPoint).toHaveProperty("x");
  expect(edge?.arrowPoint).toHaveProperty("y");
  expect(edge?.arrowPoint).toHaveProperty("angle");
}

// Helper to assert complete layout properties
function assertCompleteLayout(layout: LayoutGraph): void {
  expect(layout).toHaveProperty("width");
  expect(layout).toHaveProperty("height");
  expect(layout).toHaveProperty("nodes");
  expect(layout).toHaveProperty("edges");
}

// ============================================================================
// Test Execution Helpers
// ============================================================================

// Helper to test invalid graph error
function testInvalidGraph(graph: AnalysisGraph, expectedMessage: string): void {
  const engine = new GraphLayoutEngine();
  expect(() => engine.calculateLayout(graph)).toThrow(InvalidGraphError);
  expect(() => engine.calculateLayout(graph)).toThrow(expectedMessage);
}

// Helper to calculate layout from graph
function calculateLayout(graph: AnalysisGraph): LayoutGraph {
  const engine = new GraphLayoutEngine();
  return engine.calculateLayout(graph);
}

// ============================================================================
// Tests
// ============================================================================

describe("GraphLayoutEngine", () => {
  describe("calculateLayout", () => {
    it("should calculate layout for simple circuit (2 nodes, 1 resistor)", () => {
      const graph = createSimpleGraph();
      const layout = calculateLayout(graph);

      assertLayoutStructure(layout, 2, 1);
      assertNodePositions(layout);
      assertEdgePaths(layout);
    });

    it("should calculate layout with pattern recognition enabled (default)", () => {
      const graph = createSimpleGraph();
      const engine = new GraphLayoutEngine({ usePatternRecognition: true });
      const layout = engine.calculateLayout(graph);

      assertLayoutStructure(layout, 2, 1);
      assertNodePositions(layout);
      assertEdgePaths(layout);
    });

    it("should calculate layout with pattern recognition and planarity optimization", () => {
      const graph = createComplexGraph();
      const engine = new GraphLayoutEngine({
        usePatternRecognition: true,
        prioritizePlanarity: true,
        annealingIterations: 500,
      });
      const layout = engine.calculateLayout(graph);

      assertLayoutStructure(layout, 5, 5);
      assertPositiveDimensions(layout);
      assertNumericValidity(layout);
    });

    it("should calculate layout with pattern recognition disabled", () => {
      const graph = createSimpleGraph();
      const engine = new GraphLayoutEngine({ usePatternRecognition: false });
      const layout = engine.calculateLayout(graph);

      assertLayoutStructure(layout, 2, 1);
      assertNodePositions(layout);
      assertEdgePaths(layout);
    });

    it("should calculate layout with pattern recognition for parallel branches", () => {
      const graph = createParallelBranchesGraph();
      const engine = new GraphLayoutEngine({ usePatternRecognition: true });
      const layout = engine.calculateLayout(graph);

      assertLayoutStructure(layout, 2, 2);
      assertCurvedEdges(layout);
    });

    it("should calculate layout with optimization enabled", () => {
      const graph = createSimpleGraph();
      const engine = new GraphLayoutEngine({ useOptimization: true });
      const layout = engine.calculateLayout(graph);

      assertLayoutStructure(layout, 2, 1);
      assertNodePositions(layout);
      assertEdgePaths(layout);
    });

    it("should calculate layout with optimization for complex circuit", () => {
      const graph = createComplexGraph();
      const engine = new GraphLayoutEngine({ useOptimization: true });
      const layout = engine.calculateLayout(graph);

      assertLayoutStructure(layout, 5, 5);
      assertPositiveDimensions(layout);
      assertNumericValidity(layout);
    });

    it("should calculate layout for complex circuit (5+ nodes, multiple branches)", () => {
      const graph = createComplexGraph();
      const layout = calculateLayout(graph);

      assertLayoutStructure(layout, 5, 5);
      assertPositiveDimensions(layout);
      assertNumericValidity(layout);
    });

    it("should handle parallel branches", () => {
      const graph = createParallelBranchesGraph();
      const layout = calculateLayout(graph);

      assertLayoutStructure(layout, 2, 2);
      assertCurvedEdges(layout);
    });

    it("should filter current sources from graph", () => {
      const graph = createGraphWithCurrentSource();
      const layout = calculateLayout(graph);

      expect(layout.nodes).toHaveLength(2);
      expect(layout.edges).toHaveLength(1);
      expect(layout.edges[0]?.id).toBe(createBranchId("a"));
    });

    it("should throw InvalidGraphError for empty graph", () => {
      const graph = createEmptyGraph();
      testInvalidGraph(graph, "Graph has no nodes");
    });

    it("should throw InvalidGraphError for graph with no branches", () => {
      const graph = createNoBranchesGraph();
      testInvalidGraph(graph, "Graph has no branches");
    });

    it("should throw InvalidGraphError for disconnected branch", () => {
      const graph = createDisconnectedBranchGraph();
      testInvalidGraph(graph, "references missing node");
    });

    it("should verify LayoutGraph structure", () => {
      const graph = createSimpleGraph();
      const layout = calculateLayout(graph);

      assertCompleteLayout(layout);
      assertLayoutNodeStructure(layout);
      assertLayoutEdgeStructure(layout);
    });
  });
});
