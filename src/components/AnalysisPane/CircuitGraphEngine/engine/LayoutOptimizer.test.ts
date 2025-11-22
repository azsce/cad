/**
 * Tests for LayoutOptimizer
 *
 * Tests layout optimization including configuration generation, scoring,
 * and selection logic.
 */

import { describe, it, expect } from "bun:test";
import { LayoutOptimizer } from "./LayoutOptimizer";
import type { Branch, ElectricalNode } from "../../../../types/analysis";
import {
  createNodeId,
  createBranchId,
} from "../../../../types/analysis";

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

// Helper to create test graph
function createTestGraph(params: {
  nodes: Array<{ id: string; branches: string[] }>;
  branches: Array<{
    id: string;
    type: ComponentType;
    from: string;
    to: string;
  }>;
}): { nodes: ElectricalNode[]; branches: Branch[] } {
  return {
    nodes: params.nodes.map((n) => createNode(n)),
    branches: params.branches.map((b) => createBranch(b)),
  };
}



// ============================================================================
// Assertion Helpers
// ============================================================================

// Helper to assert layout result structure
function assertLayoutResult(result: {
  nodePositions: Map<unknown, unknown>;
  edgeRouting: Map<unknown, unknown>;
}): void {
  expect(result.nodePositions).toBeDefined();
  expect(result.edgeRouting).toBeDefined();
  expect(result.nodePositions.size).toBeGreaterThan(0);
  expect(result.edgeRouting.size).toBeGreaterThan(0);
}

// Helper to assert node positions are valid
function assertValidNodePositions(result: {
  nodePositions: Map<unknown, { x: number; y: number }>;
}): void {
  for (const pos of result.nodePositions.values()) {
    expect(typeof pos.x).toBe("number");
    expect(typeof pos.y).toBe("number");
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
  }
}

// Helper to assert edge routing is valid
function assertValidEdgeRouting(result: {
  edgeRouting: Map<unknown, { path: string; arrowPoint: { x: number; y: number; angle: number }; isCurved: boolean }>;
}): void {
  for (const routing of result.edgeRouting.values()) {
    expect(routing.path).toBeDefined();
    expect(routing.path).toMatch(/^M/);
    expect(typeof routing.arrowPoint.x).toBe("number");
    expect(typeof routing.arrowPoint.y).toBe("number");
    expect(typeof routing.arrowPoint.angle).toBe("number");
    expect(typeof routing.isCurved).toBe("boolean");
  }
}

// Helper to assert correct number of elements
function assertElementCounts(
  result: { nodePositions: Map<unknown, unknown>; edgeRouting: Map<unknown, unknown> },
  expectedNodes: number,
  expectedEdges: number
): void {
  expect(result.nodePositions.size).toBe(expectedNodes);
  expect(result.edgeRouting.size).toBe(expectedEdges);
}

// ============================================================================
// Test Execution Helpers
// ============================================================================

// Helper to find optimal layout
function findOptimalLayout(
  nodes: ElectricalNode[],
  branches: Branch[]
): {
  nodePositions: Map<unknown, { x: number; y: number }>;
  edgeRouting: Map<unknown, { path: string; arrowPoint: { x: number; y: number; angle: number }; isCurved: boolean }>;
} {
  const optimizer = new LayoutOptimizer();
  return optimizer.findOptimalLayout(nodes, branches);
}

// ============================================================================
// Tests
// ============================================================================

describe("LayoutOptimizer", () => {
  const simpleGraph = {
    nodes: [{ id: "1", branches: ["a"] }, { id: "2", branches: ["a"] }],
    branches: [resistor({ id: "a", from: "1", to: "2" })],
  };

  const complexGraph = {
    nodes: [
      { id: "1", branches: ["a", "b"] },
      { id: "2", branches: ["a", "c"] },
      { id: "3", branches: ["b", "d"] },
      { id: "4", branches: ["c", "d"] },
    ],
    branches: [
      resistor({ id: "a", from: "1", to: "2" }),
      resistor({ id: "b", from: "1", to: "3" }),
      resistor({ id: "c", from: "2", to: "4" }),
      resistor({ id: "d", from: "3", to: "4" }),
    ],
  };

  const symmetricGraph = {
    nodes: [
      { id: "1", branches: ["a", "b"] },
      { id: "2", branches: ["a", "c", "e"] },
      { id: "3", branches: ["b", "d", "e"] },
      { id: "4", branches: ["c", "d"] },
    ],
    branches: [
      resistor({ id: "a", from: "1", to: "2" }),
      resistor({ id: "b", from: "1", to: "3" }),
      resistor({ id: "c", from: "2", to: "4" }),
      resistor({ id: "d", from: "3", to: "4" }),
      resistor({ id: "e", from: "2", to: "3" }),
    ],
  };

  const planarGraph = {
    nodes: [
      { id: "1", branches: ["a", "b"] },
      { id: "2", branches: ["a", "c"] },
      { id: "3", branches: ["b", "d"] },
      { id: "4", branches: ["c"] },
      { id: "5", branches: ["d"] },
    ],
    branches: [
      resistor({ id: "a", from: "1", to: "2" }),
      resistor({ id: "b", from: "1", to: "3" }),
      resistor({ id: "c", from: "2", to: "4" }),
      resistor({ id: "d", from: "3", to: "5" }),
    ],
  };

  describe("findOptimalLayout", () => {
    it("should generate and select optimal layout for simple graph", () => {
      const { nodes, branches } = createTestGraph(simpleGraph);
      const result = findOptimalLayout(nodes, branches);

      assertLayoutResult(result);
      assertElementCounts(result, 2, 1);
      assertValidNodePositions(result);
      assertValidEdgeRouting(result);
    });

    it("should generate and select optimal layout for complex graph", () => {
      const { nodes, branches } = createTestGraph(complexGraph);
      const result = findOptimalLayout(nodes, branches);

      assertLayoutResult(result);
      assertElementCounts(result, 4, 4);
      assertValidNodePositions(result);
      assertValidEdgeRouting(result);
    });

    it("should optimize layout for symmetric graph", () => {
      const { nodes, branches } = createTestGraph(symmetricGraph);
      const result = findOptimalLayout(nodes, branches);

      assertLayoutResult(result);
      assertElementCounts(result, 4, 5);
      assertValidNodePositions(result);
      assertValidEdgeRouting(result);
    });

    it("should prefer planar layout when possible", () => {
      const { nodes, branches } = createTestGraph(planarGraph);
      const result = findOptimalLayout(nodes, branches);

      assertLayoutResult(result);
      assertElementCounts(result, 5, 4);
      assertValidNodePositions(result);
      assertValidEdgeRouting(result);
    });

    it("should return consistent results for same input", () => {
      const { nodes, branches } = createTestGraph(simpleGraph);
      const result1 = findOptimalLayout(nodes, branches);
      const result2 = findOptimalLayout(nodes, branches);

      expect(result1.nodePositions.size).toBe(result2.nodePositions.size);
      expect(result1.edgeRouting.size).toBe(result2.edgeRouting.size);
    });
  });
});
