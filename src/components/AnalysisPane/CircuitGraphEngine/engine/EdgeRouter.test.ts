/**
 * Unit tests for EdgeRouter class
 */

import { describe, it, expect } from "bun:test";
import { EdgeRouter } from "./EdgeRouter";
import type { Branch, NodeId } from "../../../../types/analysis";
import { createNodeId, createBranchId } from "../../../../types/analysis";
import type { Point } from "../types";

/**
 * 🏗️ Create a test branch with default values.
 */
function createTestBranch(params: {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  value?: number;
}): Branch {
  return {
    id: createBranchId(params.id),
    type: "resistor",
    value: params.value ?? 100,
    fromNodeId: createNodeId(params.fromNodeId),
    toNodeId: createNodeId(params.toNodeId),
  };
}

/**
 * 🗺️ Create a node positions map from coordinate pairs.
 */
function createNodePositions(nodes: Array<{ id: string; x: number; y: number }>): Map<NodeId, Point> {
  return new Map(nodes.map((node) => [createNodeId(node.id), { x: node.x, y: node.y }]));
}

/**
 * 🧪 Run edge routing and return result for a branch.
 */
function routeEdge(params: {
  nodes: Array<{ id: string; x: number; y: number }>;
  branches: Array<{ id: string; fromNodeId: string; toNodeId: string; value?: number }>;
  branchId: string;
}) {
  const router = new EdgeRouter();
  const nodePositions = createNodePositions(params.nodes);
  const branches = params.branches.map((b) => createTestBranch(b));
  const result = router.routeEdges(branches, nodePositions);
  return result.get(createBranchId(params.branchId));
}

/**
 * ✅ Assert edge has expected curved state.
 */
function assertCurvedState(
  edgeResult: { path: string; arrowPoint: { x: number; y: number; angle: number }; isCurved: boolean } | undefined,
  expectedCurved: boolean
): void {
  expect(edgeResult).toBeDefined();
  expect(edgeResult?.isCurved).toBe(expectedCurved);
}

/**
 * ✅ Assert edge path contains expected SVG commands.
 */
function assertPathContains(
  edgeResult: { path: string; arrowPoint: { x: number; y: number; angle: number }; isCurved: boolean } | undefined,
  commands: string[]
): void {
  expect(edgeResult).toBeDefined();
  for (const cmd of commands) {
    expect(edgeResult?.path).toContain(cmd);
  }
}

/**
 * ✅ Assert arrow point position.
 */
function assertArrowPosition(
  edgeResult: { path: string; arrowPoint: { x: number; y: number; angle: number }; isCurved: boolean } | undefined,
  expectedX: number,
  expectedY: number,
  tolerance = 1
): void {
  expect(edgeResult?.arrowPoint).toBeDefined();
  expect(edgeResult?.arrowPoint.x).toBeCloseTo(expectedX, tolerance);
  expect(edgeResult?.arrowPoint.y).toBeCloseTo(expectedY, tolerance);
}

/**
 * ✅ Assert arrow angle.
 */
function assertArrowAngle(
  edgeResult: { path: string; arrowPoint: { x: number; y: number; angle: number }; isCurved: boolean } | undefined,
  expectedAngle: number,
  tolerance = 2
): void {
  expect(edgeResult?.arrowPoint).toBeDefined();
  expect(edgeResult?.arrowPoint.angle).toBeCloseTo(expectedAngle, tolerance);
}

/**
 * ✅ Assert arrow is within bounds.
 */
function assertArrowInBounds(
  edgeResult: { path: string; arrowPoint: { x: number; y: number; angle: number }; isCurved: boolean } | undefined,
  minX: number,
  maxX: number
): void {
  expect(edgeResult?.arrowPoint).toBeDefined();
  expect(edgeResult?.arrowPoint.x).toBeGreaterThan(minX);
  expect(edgeResult?.arrowPoint.x).toBeLessThan(maxX);
}

/**
 * 🧪 Test straight line routing scenario.
 */
function testStraightLine(params: {
  nodes: Array<{ id: string; x: number; y: number }>;
  branchId: string;
  fromNodeId: string;
  toNodeId: string;
  expectedCommands?: string[];
}): void {
  const edgeResult = routeEdge({
    nodes: params.nodes,
    branches: [{ id: params.branchId, fromNodeId: params.fromNodeId, toNodeId: params.toNodeId }],
    branchId: params.branchId,
  });

  assertCurvedState(edgeResult, false);
  if (params.expectedCommands) {
    assertPathContains(edgeResult, params.expectedCommands);
  }
}

/**
 * 🧪 Test curved path routing scenario.
 */
function testCurvedPath(params: {
  nodes: Array<{ id: string; x: number; y: number }>;
  branches: Array<{ id: string; fromNodeId: string; toNodeId: string; value?: number }>;
  branchId: string;
}): void {
  const edgeResult = routeEdge(params);
  assertCurvedState(edgeResult, true);
}

/**
 * 🧪 Test arrow calculation for a simple edge.
 */
function testArrowCalculation(params: {
  nodes: Array<{ id: string; x: number; y: number }>;
  expectedX: number;
  expectedY: number;
  expectedAngle: number;
}): void {
  const edgeResult = routeEdge({
    nodes: params.nodes,
    branches: [{ id: "a", fromNodeId: "1", toNodeId: "2" }],
    branchId: "a",
  });

  assertArrowPosition(edgeResult, params.expectedX, params.expectedY);
  assertArrowAngle(edgeResult, params.expectedAngle);
}

/**
 * 🧪 Route multiple branches and return results.
 */
function routeMultipleBranches(params: {
  nodes: Array<{ id: string; x: number; y: number }>;
  branches: Array<{ id: string; fromNodeId: string; toNodeId: string; value?: number }>;
}) {
  const router = new EdgeRouter();
  const nodePositions = createNodePositions(params.nodes);
  const branches = params.branches.map((b) => createTestBranch(b));
  return router.routeEdges(branches, nodePositions);
}

/**
 * ✅ Assert symmetric offsets for parallel edges.
 */
function assertSymmetricOffsets(
  edgeA: { path: string; arrowPoint: { x: number; y: number; angle: number }; isCurved: boolean } | undefined,
  edgeB: { path: string; arrowPoint: { x: number; y: number; angle: number }; isCurved: boolean } | undefined,
  baselineY: number
): void {
  if (edgeA && edgeB) {
    const offsetA = edgeA.arrowPoint.y - baselineY;
    const offsetB = edgeB.arrowPoint.y - baselineY;
    expect(offsetA * offsetB).toBeLessThan(0);
  }
}

describe("EdgeRouter", () => {
  const horizontalEdge = {
    nodes: [
      { id: "1", x: 0, y: 0 },
      { id: "2", x: 100, y: 0 },
    ],
    branchId: "a",
    fromNodeId: "1",
    toNodeId: "2",
  };

  const verticalEdge = {
    nodes: [
      { id: "1", x: 0, y: 0 },
      { id: "2", x: 0, y: 100 },
    ],
    branchId: "a",
    fromNodeId: "1",
    toNodeId: "2",
  };

  const diagonalEdge = {
    nodes: [
      { id: "1", x: 0, y: 0 },
      { id: "2", x: 100, y: 100 },
    ],
    branchId: "a",
    fromNodeId: "1",
    toNodeId: "2",
  };

  const longHorizontalEdge = {
    nodes: [
      { id: "1", x: 0, y: 0 },
      { id: "2", x: 200, y: 0 },
    ],
    branchId: "a",
    fromNodeId: "1",
    toNodeId: "2",
  };

  const edgeWithObstacle = {
    nodes: [
      { id: "1", x: 0, y: 0 },
      { id: "2", x: 200, y: 0 },
      { id: "3", x: 100, y: 0 },
    ],
    branches: [{ id: "a", fromNodeId: "1", toNodeId: "2" }],
    branchId: "a",
  };

  describe("routeEdges", () => {
    it("should return empty result for empty branches", () => {
      const router = new EdgeRouter();
      const nodePositions = new Map<NodeId, Point>();

      const result = router.routeEdges([], nodePositions);

      expect(result.size).toBe(0);
    });

    it("should route single edge between two nodes", () => {
      const router = new EdgeRouter();
      const nodePositions = createNodePositions(horizontalEdge.nodes);
      const branches = [createTestBranch({ id: "a", fromNodeId: "1", toNodeId: "2" })];

      const result = router.routeEdges(branches, nodePositions);

      expect(result.size).toBe(1);
      const edgeResult = result.get(createBranchId("a"));
      expect(edgeResult).toBeDefined();
      expect(edgeResult?.path).toBeDefined();
      expect(edgeResult?.arrowPoint).toBeDefined();
      expect(edgeResult?.isCurved).toBeDefined();
    });

    it("should skip branches with missing node positions", () => {
      const router = new EdgeRouter();
      const nodePositions = createNodePositions([{ id: "1", x: 0, y: 0 }]);
      const branches = [createTestBranch({ id: "a", fromNodeId: "1", toNodeId: "2" })];

      const result = router.routeEdges(branches, nodePositions);

      expect(result.size).toBe(0);
    });
  });

  describe("candidate generation", () => {
    it("should generate straight line for horizontal edge", () => {
      testStraightLine({ ...horizontalEdge, expectedCommands: ["M 0 0", "L 100 0"] });
    });

    it("should generate straight line for vertical edge", () => {
      testStraightLine({ ...verticalEdge, expectedCommands: ["M 0 0", "L 0 100"] });
    });

    it("should generate straight line for diagonal edge", () => {
      testStraightLine(diagonalEdge);
    });
  });

  describe("path scoring", () => {
    it("should prefer straight line over curved when no obstacles", () => {
      testStraightLine(longHorizontalEdge);
    });

    it("should avoid nodes in the path", () => {
      testCurvedPath(edgeWithObstacle);
    });
  });

  describe("arrow calculation", () => {
    it("should calculate arrow at midpoint for straight line", () => {
      testArrowCalculation({
        nodes: horizontalEdge.nodes,
        expectedX: 50,
        expectedY: 0,
        expectedAngle: 0,
      });
    });

    it("should calculate correct angle for vertical line", () => {
      testArrowCalculation({
        nodes: verticalEdge.nodes,
        expectedX: 0,
        expectedY: 50,
        expectedAngle: Math.PI / 2,
      });
    });

    it("should calculate correct angle for diagonal line", () => {
      testArrowCalculation({
        nodes: diagonalEdge.nodes,
        expectedX: 50,
        expectedY: 50,
        expectedAngle: Math.PI / 4,
      });
    });

    it("should calculate arrow on curved path", () => {
      const edgeResult = routeEdge(edgeWithObstacle);

      assertCurvedState(edgeResult, true);
      assertArrowInBounds(edgeResult, 50, 150);
    });
  });

  describe("parallel edge handling", () => {
    const parallelEdgesSetup = {
      nodes: [
        { id: "1", x: 0, y: 0 },
        { id: "2", x: 100, y: 0 },
      ],
      branches: [
        { id: "a", fromNodeId: "1", toNodeId: "2", value: 100 },
        { id: "b", fromNodeId: "1", toNodeId: "2", value: 200 },
      ],
    };

    it("should detect parallel edges", () => {
      const result = routeMultipleBranches(parallelEdgesSetup);

      expect(result.size).toBe(2);
      const edgeA = result.get(createBranchId("a"));
      const edgeB = result.get(createBranchId("b"));

      expect(edgeA).toBeDefined();
      expect(edgeB).toBeDefined();
      expect(edgeA?.isCurved).toBe(true);
      expect(edgeB?.isCurved).toBe(true);
    });

    it("should generate symmetric curves for parallel edges", () => {
      const result = routeMultipleBranches(parallelEdgesSetup);

      const edgeA = result.get(createBranchId("a"));
      const edgeB = result.get(createBranchId("b"));

      assertSymmetricOffsets(edgeA, edgeB, 0);
    });

    it("should handle three parallel edges", () => {
      const result = routeMultipleBranches({
        nodes: parallelEdgesSetup.nodes,
        branches: [
          { id: "a", fromNodeId: "1", toNodeId: "2", value: 100 },
          { id: "b", fromNodeId: "1", toNodeId: "2", value: 200 },
          { id: "c", fromNodeId: "1", toNodeId: "2", value: 300 },
        ],
      });

      expect(result.size).toBe(3);
      expect(result.get(createBranchId("a"))).toBeDefined();
      expect(result.get(createBranchId("b"))).toBeDefined();
      expect(result.get(createBranchId("c"))).toBeDefined();

      const edgeB = result.get(createBranchId("b"));
      if (edgeB) {
        expect(Math.abs(edgeB.arrowPoint.y)).toBeLessThan(20);
      }
    });

    it("should ensure sufficient spacing between parallel edges", () => {
      const result = routeMultipleBranches(parallelEdgesSetup);

      const edgeA = result.get(createBranchId("a"));
      const edgeB = result.get(createBranchId("b"));

      if (edgeA && edgeB) {
        const distance = Math.abs(edgeA.arrowPoint.y - edgeB.arrowPoint.y);
        expect(distance).toBeGreaterThanOrEqual(20);
      }
    });
  });

  describe("straight line preference", () => {
    const diagonalWithFarNode = {
      nodes: [
        { id: "1", x: 0, y: 0 },
        { id: "2", x: 100, y: 100 },
        { id: "3", x: 200, y: 200 },
      ],
      branchId: "a",
      fromNodeId: "1",
      toNodeId: "2",
    };

    const separateEdges = {
      nodes: [
        { id: "1", x: 0, y: 0 },
        { id: "2", x: 100, y: 0 },
        { id: "3", x: 200, y: 0 },
        { id: "4", x: 300, y: 0 },
      ],
      branches: [
        { id: "a", fromNodeId: "1", toNodeId: "2", value: 100 },
        { id: "b", fromNodeId: "3", toNodeId: "4", value: 200 },
      ],
    };

    it("should prefer straight line when no obstacles present", () => {
      testStraightLine(diagonalWithFarNode);
    });

    it("should use curve only when necessary", () => {
      const result = routeMultipleBranches(separateEdges);

      expect(result.get(createBranchId("a"))?.isCurved).toBe(false);
      expect(result.get(createBranchId("b"))?.isCurved).toBe(false);
    });
  });
});
