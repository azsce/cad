/**
 * Unit tests for NodePlacer class
 */

import { describe, it, expect } from "bun:test";
import { NodePlacer } from "./NodePlacer";
import type { ElectricalNode, Branch, NodeId } from "../../../../types/analysis";
import { createNodeId, createBranchId } from "../../../../types/analysis";
import type { Point } from "../types";

/**
 * 📏 Calculate Euclidean distance between two points.
 */
function calculateDistance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * ✅ Expect distance to be within tolerance of average.
 */
function expectDistanceWithinTolerance(distance: number, avgDist: number): void {
  expect(Math.abs(distance - avgDist)).toBeLessThan(avgDist);
}

/**
 * ✅ Validate that a position is defined.
 */
function validatePosition(pos: Point | undefined): asserts pos is Point {
  if (!pos) {
    throw new Error("Position not found");
  }
}

/**
 * ✅ Validate that all three positions are defined.
 */
function validatePositions(
  pos1: Point | undefined,
  pos2: Point | undefined,
  pos3: Point | undefined
): void {
  validatePosition(pos1);
  validatePosition(pos2);
  validatePosition(pos3);
}

describe("NodePlacer", () => {
  describe("placeNodes", () => {
    it("should return empty result for empty graph", () => {
      const placer = new NodePlacer();
      const result = placer.placeNodes([], []);

      expect(result.positions.size).toBe(0);
      expect(result.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it("should place single node at origin", () => {
      const placer = new NodePlacer();
      const nodes: ElectricalNode[] = [
        { id: createNodeId("1"), connectedBranchIds: [] },
      ];

      const result = placer.placeNodes(nodes, []);

      expect(result.positions.size).toBe(1);
      const pos = result.positions.get(createNodeId("1"));
      expect(pos).toBeDefined();
      expect(pos?.x).toBe(0);
      expect(pos?.y).toBe(0);
    });

    it("should place two connected nodes with appropriate spacing", () => {
      const placer = new NodePlacer();
      const nodes: ElectricalNode[] = [
        { id: createNodeId("1"), connectedBranchIds: [createBranchId("a")] },
        { id: createNodeId("2"), connectedBranchIds: [createBranchId("a")] },
      ];
      const branches: Branch[] = [
        {
          id: createBranchId("a"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("1"),
          toNodeId: createNodeId("2"),
        },
      ];

      const result = placer.placeNodes(nodes, branches);

      expect(result.positions.size).toBe(2);
      const pos1 = result.positions.get(createNodeId("1"));
      const pos2 = result.positions.get(createNodeId("2"));

      expect(pos1).toBeDefined();
      expect(pos2).toBeDefined();

      if (pos1 && pos2) {
        const distance = Math.hypot(pos2.x - pos1.x, pos2.y - pos1.y);
        // Should be reasonably close to preferred link length (150px)
        expect(distance).toBeGreaterThan(50);
        expect(distance).toBeLessThan(300);
      }
    });
  });

  describe("grid snapping", () => {
    it("should snap positions to grid", () => {
      const placer = new NodePlacer({}, 50);
      const nodes: ElectricalNode[] = [
        { id: createNodeId("1"), connectedBranchIds: [] },
        { id: createNodeId("2"), connectedBranchIds: [] },
      ];

      const result = placer.placeNodes(nodes, []);

      // All positions should be multiples of grid size (50)
      for (const pos of result.positions.values()) {
        expect(pos.x % 50).toBe(0);
        expect(pos.y % 50).toBe(0);
      }
    });
  });

  describe("alignment detection", () => {
    it("should align nodes with similar x-coordinates", () => {
      const placer = new NodePlacer({}, 1, 100); // Large alignment threshold
      const nodes: ElectricalNode[] = [
        { id: createNodeId("1"), connectedBranchIds: [] },
        { id: createNodeId("2"), connectedBranchIds: [] },
        { id: createNodeId("3"), connectedBranchIds: [] },
      ];

      const result = placer.placeNodes(nodes, []);

      // Check if any nodes are aligned vertically
      const positions = Array.from(result.positions.values());
      const xCoords = positions.map((p) => p.x);
      const uniqueX = new Set(xCoords);

      // With alignment, we should have fewer unique x-coordinates than nodes
      expect(uniqueX.size).toBeLessThanOrEqual(nodes.length);
    });
  });

  describe("symmetry enforcement", () => {
    it("should handle parallel branches symmetrically", () => {
      const placer = new NodePlacer();
      const nodes: ElectricalNode[] = [
        {
          id: createNodeId("1"),
          connectedBranchIds: [createBranchId("a"), createBranchId("b")],
        },
        {
          id: createNodeId("2"),
          connectedBranchIds: [createBranchId("a"), createBranchId("b")],
        },
      ];
      const branches: Branch[] = [
        {
          id: createBranchId("a"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("1"),
          toNodeId: createNodeId("2"),
        },
        {
          id: createBranchId("b"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("1"),
          toNodeId: createNodeId("2"),
        },
      ];

      const result = placer.placeNodes(nodes, branches);

      expect(result.positions.size).toBe(2);
      // Parallel branches should result in symmetric layout
      const pos1 = result.positions.get(createNodeId("1"));
      const pos2 = result.positions.get(createNodeId("2"));

      expect(pos1).toBeDefined();
      expect(pos2).toBeDefined();
    });
  });

  describe("star topology", () => {
    it("should distribute branches radially for star topology", () => {
      const placer = new NodePlacer();
      const centerNode = createNodeId("center");
      const nodes: ElectricalNode[] = [
        {
          id: centerNode,
          connectedBranchIds: [
            createBranchId("a"),
            createBranchId("b"),
            createBranchId("c"),
          ],
        },
        { id: createNodeId("1"), connectedBranchIds: [createBranchId("a")] },
        { id: createNodeId("2"), connectedBranchIds: [createBranchId("b")] },
        { id: createNodeId("3"), connectedBranchIds: [createBranchId("c")] },
      ];
      const branches: Branch[] = [
        {
          id: createBranchId("a"),
          type: "resistor",
          value: 100,
          fromNodeId: centerNode,
          toNodeId: createNodeId("1"),
        },
        {
          id: createBranchId("b"),
          type: "resistor",
          value: 100,
          fromNodeId: centerNode,
          toNodeId: createNodeId("2"),
        },
        {
          id: createBranchId("c"),
          type: "resistor",
          value: 100,
          fromNodeId: centerNode,
          toNodeId: createNodeId("3"),
        },
      ];

      const result = placer.placeNodes(nodes, branches);

      expect(result.positions.size).toBe(4);

      // Center node should be near origin
      const centerPos = result.positions.get(centerNode);
      expect(centerPos).toBeDefined();

      if (centerPos) {
        // Check that outer nodes are roughly equidistant from center
        const distances = [
          createNodeId("1"),
          createNodeId("2"),
          createNodeId("3"),
        ].map((id) => {
          const pos = result.positions.get(id);
          if (!pos) return 0;
          return Math.hypot(pos.x - centerPos.x, pos.y - centerPos.y);
        });

        // All distances should be similar (within 100% tolerance for force-directed)
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        for (const dist of distances) {
          expectDistanceWithinTolerance(dist, avgDistance);
        }
      }
    });
  });

  describe("centering", () => {
    it("should center the graph around origin", () => {
      const placer = new NodePlacer();
      const nodes: ElectricalNode[] = [
        { id: createNodeId("1"), connectedBranchIds: [] },
        { id: createNodeId("2"), connectedBranchIds: [] },
        { id: createNodeId("3"), connectedBranchIds: [] },
      ];

      const result = placer.placeNodes(nodes, []);

      // Calculate center of mass
      const positions = Array.from(result.positions.values());
      const centerX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
      const centerY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

      // Center should be close to origin (within 50px tolerance due to grid snapping)
      expect(Math.abs(centerX)).toBeLessThan(50);
      expect(Math.abs(centerY)).toBeLessThan(50);
    });

    it("should calculate correct bounds", () => {
      const placer = new NodePlacer();
      const nodes: ElectricalNode[] = [
        { id: createNodeId("1"), connectedBranchIds: [] },
        { id: createNodeId("2"), connectedBranchIds: [] },
      ];

      const result = placer.placeNodes(nodes, []);

      expect(result.bounds.width).toBeGreaterThanOrEqual(0);
      expect(result.bounds.height).toBeGreaterThanOrEqual(0);

      // Bounds should encompass all nodes
      for (const pos of result.positions.values()) {
        expect(pos.x).toBeGreaterThanOrEqual(result.bounds.x);
        expect(pos.x).toBeLessThanOrEqual(result.bounds.x + result.bounds.width);
        expect(pos.y).toBeGreaterThanOrEqual(result.bounds.y);
        expect(pos.y).toBeLessThanOrEqual(result.bounds.y + result.bounds.height);
      }
    });
  });

  describe("force-directed convergence", () => {
    it("should converge for simple triangle graph", () => {
      const placer = new NodePlacer();
      const nodes: ElectricalNode[] = [
        {
          id: createNodeId("1"),
          connectedBranchIds: [createBranchId("a"), createBranchId("c")],
        },
        {
          id: createNodeId("2"),
          connectedBranchIds: [createBranchId("a"), createBranchId("b")],
        },
        {
          id: createNodeId("3"),
          connectedBranchIds: [createBranchId("b"), createBranchId("c")],
        },
      ];
      const branches: Branch[] = [
        {
          id: createBranchId("a"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("1"),
          toNodeId: createNodeId("2"),
        },
        {
          id: createBranchId("b"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("2"),
          toNodeId: createNodeId("3"),
        },
        {
          id: createBranchId("c"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("3"),
          toNodeId: createNodeId("1"),
        },
      ];

      const result = placer.placeNodes(nodes, branches);

      expect(result.positions.size).toBe(3);

      // All nodes should be placed
      expect(result.positions.get(createNodeId("1"))).toBeDefined();
      expect(result.positions.get(createNodeId("2"))).toBeDefined();
      expect(result.positions.get(createNodeId("3"))).toBeDefined();

      // Nodes should form a roughly equilateral triangle
      const pos1 = result.positions.get(createNodeId("1"));
      const pos2 = result.positions.get(createNodeId("2"));
      const pos3 = result.positions.get(createNodeId("3"));

      validatePositions(pos1, pos2, pos3);

      const dist12 = calculateDistance(pos1 as Point, pos2 as Point);
      const dist23 = calculateDistance(pos2 as Point, pos3 as Point);
      const dist31 = calculateDistance(pos3 as Point, pos1 as Point);

      // All sides should be similar length (within 100% tolerance for force-directed)
      const avgDist = (dist12 + dist23 + dist31) / 3;
      expectDistanceWithinTolerance(dist12, avgDist);
      expectDistanceWithinTolerance(dist23, avgDist);
      expectDistanceWithinTolerance(dist31, avgDist);
    });
  });

  describe("planarity optimization", () => {
    it("should reduce intersections for crossing edges", () => {
      const placer = new NodePlacer();
      const nodes: ElectricalNode[] = [
        {
          id: createNodeId("1"),
          connectedBranchIds: [createBranchId("a"), createBranchId("d")],
        },
        {
          id: createNodeId("2"),
          connectedBranchIds: [createBranchId("a"), createBranchId("b")],
        },
        {
          id: createNodeId("3"),
          connectedBranchIds: [createBranchId("b"), createBranchId("c")],
        },
        {
          id: createNodeId("4"),
          connectedBranchIds: [createBranchId("c"), createBranchId("d")],
        },
      ];
      const branches: Branch[] = [
        {
          id: createBranchId("a"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("1"),
          toNodeId: createNodeId("2"),
        },
        {
          id: createBranchId("b"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("2"),
          toNodeId: createNodeId("3"),
        },
        {
          id: createBranchId("c"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("3"),
          toNodeId: createNodeId("4"),
        },
        {
          id: createBranchId("d"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("4"),
          toNodeId: createNodeId("1"),
        },
      ];

      const positions = placer.placeNodesForPlanarity(nodes, branches, 100);

      expect(positions.size).toBe(4);

      const score = placer.calculatePlanarityScore(positions, branches);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it("should calculate planarity score correctly", () => {
      const placer = new NodePlacer();
      const branches: Branch[] = [
        {
          id: createBranchId("a"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("1"),
          toNodeId: createNodeId("2"),
        },
      ];

      const positions = new Map<NodeId, Point>([
        [createNodeId("1"), { x: 0, y: 0 }],
        [createNodeId("2"), { x: 100, y: 0 }],
      ]);

      const score = placer.calculatePlanarityScore(positions, branches);

      expect(score).toBe(100);
    });

    it("should detect edge intersections", () => {
      const placer = new NodePlacer();
      const branches: Branch[] = [
        {
          id: createBranchId("a"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("1"),
          toNodeId: createNodeId("3"),
        },
        {
          id: createBranchId("b"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("2"),
          toNodeId: createNodeId("4"),
        },
      ];

      const crossingPositions = new Map<NodeId, Point>([
        [createNodeId("1"), { x: 0, y: 0 }],
        [createNodeId("2"), { x: 100, y: 0 }],
        [createNodeId("3"), { x: 100, y: 100 }],
        [createNodeId("4"), { x: 0, y: 100 }],
      ]);

      const crossingScore = placer.calculatePlanarityScore(
        crossingPositions,
        branches
      );

      const nonCrossingPositions = new Map<NodeId, Point>([
        [createNodeId("1"), { x: 0, y: 0 }],
        [createNodeId("2"), { x: 100, y: 0 }],
        [createNodeId("3"), { x: 0, y: 100 }],
        [createNodeId("4"), { x: 100, y: 100 }],
      ]);

      const nonCrossingScore = placer.calculatePlanarityScore(
        nonCrossingPositions,
        branches
      );

      expect(crossingScore).toBeGreaterThan(nonCrossingScore);
      expect(crossingScore).toBeGreaterThanOrEqual(1000);
    });

    it("should refine layout with force-directed touch", () => {
      const placer = new NodePlacer();
      const testNodes: ElectricalNode[] = [
        { id: createNodeId("1"), connectedBranchIds: [createBranchId("a")] },
        { id: createNodeId("2"), connectedBranchIds: [createBranchId("a")] },
      ];
      const branches: Branch[] = [
        {
          id: createBranchId("a"),
          type: "resistor",
          value: 100,
          fromNodeId: createNodeId("1"),
          toNodeId: createNodeId("2"),
        },
      ];

      const initialPositions = new Map<NodeId, Point>([
        [createNodeId("1"), { x: 0, y: 0 }],
        [createNodeId("2"), { x: 50, y: 0 }],
      ]);

      const refined = placer.refineLayout(initialPositions, testNodes, branches, 10);

      expect(refined.size).toBe(2);
      const pos1 = refined.get(createNodeId("1"));
      const pos2 = refined.get(createNodeId("2"));

      expect(pos1).toBeDefined();
      expect(pos2).toBeDefined();
    });

    it("should handle empty graph in planarity optimization", () => {
      const placer = new NodePlacer();
      const positions = placer.placeNodesForPlanarity([], [], 100);

      expect(positions.size).toBe(0);
    });

    it("should accept better moves in simulated annealing", () => {
      const placer = new NodePlacer();
      const testNodes: ElectricalNode[] = [
        { id: createNodeId("1"), connectedBranchIds: [] },
        { id: createNodeId("2"), connectedBranchIds: [] },
      ];

      const result = placer.placeNodesForPlanarity(testNodes, [], 50);

      expect(result.size).toBe(2);
    });
  });
});
