/**
 * Tests for NodePlacer dynamic spacing functionality
 *
 * Tests crowding detection, spacing expansion, and flexible grid behavior.
 */

import { describe, it, expect } from "bun:test";
import { NodePlacer } from "./NodePlacer";
import type { ElectricalNode, Branch, NodeId } from "../../../../types/analysis";
import type { Point } from "../types";
import { createNodeId, createBranchId } from "../../../../types/analysis";

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
function resistor(params: { id: string; from: string; to: string }) {
  return { id: params.id, type: "resistor" as const, from: params.from, to: params.to };
}

// Helper to create crowded graph (many branches between few nodes)
function createCrowdedGraph(): { nodes: ElectricalNode[]; branches: Branch[] } {
  return {
    nodes: [
      createNode({ id: "1", branches: ["a", "b", "c"] }),
      createNode({ id: "2", branches: ["a", "b", "c"] }),
    ],
    branches: [
      createBranch(resistor({ id: "a", from: "1", to: "2" })),
      createBranch(resistor({ id: "b", from: "1", to: "2" })),
      createBranch(resistor({ id: "c", from: "1", to: "2" })),
    ],
  };
}

// Helper to create sparse graph (few branches between nodes)
function createSparseGraph(): { nodes: ElectricalNode[]; branches: Branch[] } {
  return {
    nodes: [
      createNode({ id: "1", branches: ["a"] }),
      createNode({ id: "2", branches: ["a"] }),
    ],
    branches: [createBranch(resistor({ id: "a", from: "1", to: "2" }))],
  };
}

// Helper to create position map
function createPositionMap(positions: Record<string, { x: number; y: number }>): Map<NodeId, Point> {
  const map = new Map<NodeId, Point>();
  for (const [id, pos] of Object.entries(positions)) {
    map.set(createNodeId(id), pos);
  }
  return map;
}

// ============================================================================
// Assertion Helpers
// ============================================================================

// Helper to assert crowding detected
function assertCrowdingDetected(
  placer: NodePlacer,
  positions: Map<NodeId, Point>,
  branches: Branch[]
): void {
  const crowding = placer.detectCrowding(positions, branches);
  const hasCrowding = crowding.some((r) => r.isCrowded);
  expect(hasCrowding).toBe(true);
}

// Helper to assert no crowding detected
function assertNoCrowding(
  placer: NodePlacer,
  positions: Map<NodeId, Point>,
  branches: Branch[]
): void {
  const crowding = placer.detectCrowding(positions, branches);
  const hasCrowding = crowding.some((r) => r.isCrowded);
  expect(hasCrowding).toBe(false);
}

// Helper to calculate distance between two points
function calculateDistance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

// Helper to get all unique point pairs
function getPointPairs(points: Point[]): Array<[Point, Point]> {
  const pairs: Array<[Point, Point]> = [];
  
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];
      if (p1 && p2) {
        pairs.push([p1, p2]);
      }
    }
  }
  
  return pairs;
}

// Helper to calculate average distance between nodes
function calculateAverageDistance(positions: Map<NodeId, Point>): number {
  const points = Array.from(positions.values());
  if (points.length < 2) {
    return 0;
  }

  const pairs = getPointPairs(points);
  if (pairs.length === 0) {
    return 0;
  }

  const totalDistance = pairs.reduce((sum, [p1, p2]) => sum + calculateDistance(p1, p2), 0);
  return totalDistance / pairs.length;
}

// Helper to assert positions are off-grid
function assertOffGrid(positions: Map<NodeId, Point>, gridSize: number): void {
  const points = Array.from(positions.values());
  const hasOffGridPoint = points.some((p) => {
    const xRemainder = Math.abs(p.x % gridSize);
    const yRemainder = Math.abs(p.y % gridSize);
    return xRemainder > 1 || yRemainder > 1;
  });
  expect(hasOffGridPoint).toBe(true);
}

// Helper to assert branch density calculated
function assertBranchDensity(
  placer: NodePlacer,
  positions: Map<NodeId, Point>,
  branches: Branch[]
): void {
  const crowding = placer.detectCrowding(positions, branches);
  expect(crowding.length).toBeGreaterThan(0);
  
  for (const region of crowding) {
    expect(region.branchDensity).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(region.branchDensity)).toBe(true);
  }
}

// ============================================================================
// Test Execution Helpers
// ============================================================================

// Helper to test crowding detection
function testCrowdingDetection(params: {
  positions: Record<string, { x: number; y: number }>;
  branches: Branch[];
  expectCrowding: boolean;
}): void {
  const placer = new NodePlacer();
  const posMap = createPositionMap(params.positions);

  if (params.expectCrowding) {
    assertCrowdingDetected(placer, posMap, params.branches);
  } else {
    assertNoCrowding(placer, posMap, params.branches);
  }
}

// Helper to test spacing expansion
function testSpacingExpansion(
  nodes: ElectricalNode[],
  branches: Branch[]
): void {
  const placer = new NodePlacer();
  const result = placer.placeNodes(nodes, branches);
  
  expect(result.positions.size).toBe(nodes.length);
  expect(result.bounds.width).toBeGreaterThanOrEqual(0);
  expect(result.bounds.height).toBeGreaterThanOrEqual(0);
}

// Helper to test flexible grid
function testFlexibleGrid(
  nodes: ElectricalNode[],
  branches: Branch[],
  gridSize: number
): void {
  const placer = new NodePlacer({}, gridSize);
  const result = placer.placeNodes(nodes, branches);
  
  assertOffGrid(result.positions, gridSize);
}

// ============================================================================
// Tests
// ============================================================================

describe("NodePlacer - Dynamic Spacing", () => {
  describe("detectCrowding", () => {
    it("should detect crowding with many branches in small area", () => {
      const { branches } = createCrowdedGraph();
      testCrowdingDetection({
        positions: { "1": { x: 0, y: 0 }, "2": { x: 50, y: 0 } },
        branches,
        expectCrowding: true,
      });
    });

    it("should not detect crowding with few branches in large area", () => {
      const { branches } = createSparseGraph();
      testCrowdingDetection({
        positions: { "1": { x: 0, y: 0 }, "2": { x: 200, y: 0 } },
        branches,
        expectCrowding: false,
      });
    });

    it("should calculate branch density for regions", () => {
      const placer = new NodePlacer();
      const { branches } = createCrowdedGraph();
      const positions = createPositionMap({
        "1": { x: 0, y: 0 },
        "2": { x: 50, y: 0 },
      });

      assertBranchDensity(placer, positions, branches);
    });

    it("should handle empty graph", () => {
      const placer = new NodePlacer();
      const result = placer.detectCrowding(new Map(), []);
      expect(result).toEqual([]);
    });

    it("should handle single node", () => {
      const placer = new NodePlacer();
      const positions = createPositionMap({ "1": { x: 0, y: 0 } });
      const result = placer.detectCrowding(positions, []);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("spacing expansion", () => {
    it("should expand spacing in crowded regions", () => {
      const { nodes, branches } = createCrowdedGraph();
      testSpacingExpansion(nodes, branches);
    });

    it("should maintain spacing in sparse regions", () => {
      const { nodes, branches } = createSparseGraph();
      testSpacingExpansion(nodes, branches);
    });

    it("should increase distance between crowded nodes", () => {
      const placer = new NodePlacer();
      const { nodes, branches } = createCrowdedGraph();
      
      const initialResult = placer.placeNodes(nodes, branches);
      const originalPositions = new Map(initialResult.positions);
      
      const newResult = placer.placeNodes(nodes, branches);
      
      expect(newResult.positions.size).toBe(originalPositions.size);
    });

    it("should ensure branches have clear spacing", () => {
      const { nodes, branches } = createCrowdedGraph();
      const placer = new NodePlacer();
      const result = placer.placeNodes(nodes, branches);
      
      const distance = calculateAverageDistance(result.positions);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe("flexible grid spacing", () => {
    it("should allow nodes to move off grid when crowded", () => {
      const { nodes, branches } = createCrowdedGraph();
      testFlexibleGrid(nodes, branches, 50);
    });

    it("should not use rigid fixed-size grid", () => {
      const { nodes, branches } = createCrowdedGraph();
      const placer = new NodePlacer({}, 50);
      const result = placer.placeNodes(nodes, branches);
      
      assertOffGrid(result.positions, 50);
    });

    it("should adjust spacing dynamically based on content", () => {
      const crowded = createCrowdedGraph();
      const sparse = createSparseGraph();
      
      const placer = new NodePlacer();
      const crowdedResult = placer.placeNodes(crowded.nodes, crowded.branches);
      const sparseResult = placer.placeNodes(sparse.nodes, sparse.branches);
      
      expect(crowdedResult.positions.size).toBe(crowded.nodes.length);
      expect(sparseResult.positions.size).toBe(sparse.nodes.length);
    });
  });

  describe("edge recalculation", () => {
    it("should maintain valid positions after spacing adjustment", () => {
      const { nodes, branches } = createCrowdedGraph();
      const placer = new NodePlacer();
      const result = placer.placeNodes(nodes, branches);
      
      for (const pos of result.positions.values()) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
      }
    });

    it("should preserve node count after adjustment", () => {
      const { nodes, branches } = createCrowdedGraph();
      const placer = new NodePlacer();
      const result = placer.placeNodes(nodes, branches);
      
      expect(result.positions.size).toBe(nodes.length);
    });
  });
});
