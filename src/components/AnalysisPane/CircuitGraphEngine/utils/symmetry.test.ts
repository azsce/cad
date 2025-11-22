import { describe, it, expect } from "bun:test";
import {
  findIsomorphicSubgraphs,
  calculateCentralAxis,
  mirrorPositions,
} from "./symmetry";
import type { ElectricalNode, Branch, NodeId } from "../../../../types/analysis";
import type { Point } from "../types";
import { createNodeId, createBranchId } from "../../../../types/analysis";

// Helper to create electrical node
function createNode(params: { id: string; branches: string[] }): ElectricalNode {
  return {
    id: createNodeId(params.id),
    connectedBranchIds: params.branches.map((b) => createBranchId(b)),
  };
}

type ComponentType = "resistor" | "voltageSource" | "currentSource";

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
    value: params.value ?? 1,
    fromNodeId: createNodeId(params.from),
    toNodeId: createNodeId(params.to),
  };
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

// Helper to create resistor branch shorthand
function resistor(params: { id: string; from: string; to: string }) {
  return { id: params.id, type: "resistor" as const, from: params.from, to: params.to };
}

// Helper to test isomorphic subgraph detection
function testIsomorphicDetection(
  graphParams: {
    nodes: Array<{ id: string; branches: string[] }>;
    branches: Array<{
      id: string;
      type: ComponentType;
      from: string;
      to: string;
    }>;
  },
  assertion: (result: Array<{ nodes: NodeId[]; branches: string[] }>) => void
): void {
  const { nodes, branches } = createTestGraph(graphParams);
  const result = findIsomorphicSubgraphs(nodes, branches);
  assertion(result);
}

// Helper to create position map
function createPositionMap(positions: Record<string, { x: number; y: number }>): Map<NodeId, Point> {
  const map = new Map<NodeId, Point>();
  for (const [id, pos] of Object.entries(positions)) {
    map.set(createNodeId(id), pos);
  }
  return map;
}

// Helper to test mirror operation
function testMirrorOperation(params: {
  positions: Record<string, { x: number; y: number }>;
  axis: { type: "vertical" | "horizontal"; position: number };
  assertions: Array<{ nodeId: string; expectedX: number; expectedY: number }>;
}): void {
  const positions = createPositionMap(params.positions);
  const result = mirrorPositions(positions, params.axis);
  
  for (const assertion of params.assertions) {
    assertMirroredPosition({
      result,
      nodeId: assertion.nodeId,
      expectedX: assertion.expectedX,
      expectedY: assertion.expectedY,
    });
  }
}

// Helper to test axis calculation
function testAxisCalculation(
  positions: Record<string, { x: number; y: number }>,
  expectedType: "vertical" | "horizontal",
  expectedPosition: number
): void {
  const posMap = createPositionMap(positions);
  const result = calculateCentralAxis(posMap);
  assertAxis(result, expectedType, expectedPosition);
}

// Helper to test coordinate preservation
function testCoordinatePreservation(params: {
  positions: Record<string, { x: number; y: number }>;
  axis: { type: "vertical" | "horizontal"; position: number };
  coord: "x" | "y";
  expectations: Array<{ nodeId: string; value: number }>;
}): void {
  const positions = createPositionMap(params.positions);
  const result = mirrorPositions(positions, params.axis);
  
  for (const expectation of params.expectations) {
    assertCoordinate(result, expectation.nodeId, params.coord, expectation.value);
  }
}

// Helper to assert coordinate value
function assertCoordinate(
  result: Map<NodeId, Point>,
  nodeId: string,
  coord: "x" | "y",
  expected: number,
  tolerance = 5
): void {
  const point = result.get(createNodeId(nodeId));
  expect(point?.[coord]).toBeCloseTo(expected, tolerance);
}

// Helper to assert mirrored position
function assertMirroredPosition(params: {
  result: Map<NodeId, Point>;
  nodeId: string;
  expectedX: number;
  expectedY: number;
  tolerance?: number;
}): void {
  const { result, nodeId, expectedX, expectedY, tolerance = 5 } = params;
  const mirrored = result.get(createNodeId(nodeId));
  expect(mirrored?.x).toBeCloseTo(expectedX, tolerance);
  expect(mirrored?.y).toBeCloseTo(expectedY, tolerance);
}

// Helper to assert axis properties
function assertAxis(
  result: { type: "vertical" | "horizontal"; position: number },
  expectedType: "vertical" | "horizontal",
  expectedPosition: number,
  tolerance = 5
): void {
  expect(result.type).toBe(expectedType);
  expect(result.position).toBeCloseTo(expectedPosition, tolerance);
}

// Helper to check nodes in subgraph
function checkNodesInSubgraph(
  result: Array<{ nodes: NodeId[]; branches: string[] }>,
  nodeIds: string[]
): void {
  const foundNodeIds = result.flatMap((sg) => sg.nodes);
  for (const id of nodeIds) {
    expect(foundNodeIds).toContain(createNodeId(id));
  }
}

// Helper to check branches in subgraph
function checkBranchesInSubgraph(
  result: Array<{ nodes: NodeId[]; branches: string[] }>,
  branchIds: string[]
): void {
  const foundBranchIds = result.flatMap((sg) => sg.branches.map((b) => b));
  for (const id of branchIds) {
    expect(foundBranchIds).toContain(createBranchId(id));
  }
}

// Helper to assert subgraph contains items
function assertSubgraphContains(
  result: Array<{ nodes: NodeId[]; branches: string[] }>,
  nodeIds?: string[],
  branchIds?: string[]
): void {
  expect(result.length).toBeGreaterThan(0);
  
  if (nodeIds) {
    checkNodesInSubgraph(result, nodeIds);
  }
  
  if (branchIds) {
    checkBranchesInSubgraph(result, branchIds);
  }
}

describe("findIsomorphicSubgraphs", () => {
  const parallelBranchesGraph = {
    nodes: [{ id: "n1", branches: ["b1", "b2"] }, { id: "n2", branches: ["b1", "b2"] }],
    branches: [resistor({ id: "b1", from: "n1", to: "n2" }), resistor({ id: "b2", from: "n1", to: "n2" })],
  };

  const triangleGraph = {
    nodes: [
      { id: "n1", branches: ["b1", "b2"] },
      { id: "n2", branches: ["b1", "b3"] },
      { id: "n3", branches: ["b2", "b3"] },
    ],
    branches: [
      resistor({ id: "b1", from: "n1", to: "n2" }),
      resistor({ id: "b2", from: "n1", to: "n3" }),
      resistor({ id: "b3", from: "n2", to: "n3" }),
    ],
  };

  const singleBranchGraph = {
    nodes: [{ id: "n1", branches: ["b1"] }, { id: "n2", branches: ["b1"] }],
    branches: [resistor({ id: "b1", from: "n1", to: "n2" })],
  };

  const multiParallelGraph = {
    nodes: [
      { id: "n1", branches: ["b1", "b2", "b3", "b4"] },
      { id: "n2", branches: ["b1", "b2"] },
      { id: "n3", branches: ["b3", "b4"] },
    ],
    branches: [
      resistor({ id: "b1", from: "n1", to: "n2" }),
      resistor({ id: "b2", from: "n1", to: "n2" }),
      resistor({ id: "b3", from: "n1", to: "n3" }),
      resistor({ id: "b4", from: "n1", to: "n3" }),
    ],
  };

  it("should detect parallel branches between same two nodes", () => {
    testIsomorphicDetection(parallelBranchesGraph, (result) => {
      assertSubgraphContains(result, undefined, ["b1", "b2"]);
    });
  });

  it("should detect symmetric node pairs with same degree", () => {
    testIsomorphicDetection(triangleGraph, (result) => {
      expect(result.length).toBeGreaterThan(0);
      expect(result.flatMap((sg) => sg.nodes).length).toBeGreaterThan(0);
    });
  });

  it("should detect symmetric nodes even with single branch", () => {
    testIsomorphicDetection(singleBranchGraph, (result) => {
      expect(result.length).toBeGreaterThanOrEqual(1);
      assertSubgraphContains(result, ["n1", "n2"]);
    });
  });

  it("should handle empty graph", () => {
    expect(findIsomorphicSubgraphs([], [])).toEqual([]);
  });

  it("should detect multiple parallel branch groups", () => {
    testIsomorphicDetection(multiParallelGraph, (result) => {
      expect(result.length).toBeGreaterThan(0);
      expect(result.flatMap((sg) => sg.branches).length).toBeGreaterThan(0);
    });
  });
});

describe("calculateCentralAxis", () => {
  it("should calculate vertical axis for horizontally spread nodes", () => {
    testAxisCalculation(
      { n1: { x: 0, y: 50 }, n2: { x: 100, y: 50 }, n3: { x: 50, y: 60 } },
      "vertical",
      50
    );
  });

  it("should calculate horizontal axis for vertically spread nodes", () => {
    testAxisCalculation(
      { n1: { x: 50, y: 0 }, n2: { x: 50, y: 100 }, n3: { x: 60, y: 50 } },
      "horizontal",
      50
    );
  });

  it("should prefer vertical axis when spreads are equal", () => {
    testAxisCalculation({ n1: { x: 0, y: 0 }, n2: { x: 100, y: 100 } }, "vertical", 50);
  });

  it("should handle single node", () => {
    testAxisCalculation({ n1: { x: 42, y: 73 } }, "vertical", 42);
  });

  it("should handle empty position map", () => {
    const positions = new Map<NodeId, Point>();

    const result = calculateCentralAxis(positions);

    expect(result.type).toBe("vertical");
    expect(result.position).toBe(0);
  });

  it("should calculate axis at center of bounding box", () => {
    testAxisCalculation(
      { n1: { x: 10, y: 20 }, n2: { x: 90, y: 30 }, n3: { x: 50, y: 25 } },
      "vertical",
      50
    );
  });
});

describe("mirrorPositions", () => {
  const verticalMirrorTest = {
    positions: { n1: { x: 20, y: 50 }, n2: { x: 80, y: 50 }, n3: { x: 50, y: 75 } },
    axis: { type: "vertical" as const, position: 50 },
    assertions: [
      { nodeId: "n1", expectedX: 80, expectedY: 50 },
      { nodeId: "n2", expectedX: 20, expectedY: 50 },
      { nodeId: "n3", expectedX: 50, expectedY: 75 },
    ],
  };

  const horizontalMirrorTest = {
    positions: { n1: { x: 50, y: 20 }, n2: { x: 50, y: 80 }, n3: { x: 75, y: 50 } },
    axis: { type: "horizontal" as const, position: 50 },
    assertions: [
      { nodeId: "n1", expectedX: 50, expectedY: 80 },
      { nodeId: "n2", expectedX: 50, expectedY: 20 },
      { nodeId: "n3", expectedX: 75, expectedY: 50 },
    ],
  };

  const verticalPreserveYTest = {
    positions: { n1: { x: 10, y: 25 }, n2: { x: 30, y: 75 } },
    axis: { type: "vertical" as const, position: 20 },
    coord: "y" as const,
    expectations: [{ nodeId: "n1", value: 25 }, { nodeId: "n2", value: 75 }],
  };

  const horizontalPreserveXTest = {
    positions: { n1: { x: 25, y: 10 }, n2: { x: 75, y: 30 } },
    axis: { type: "horizontal" as const, position: 20 },
    coord: "x" as const,
    expectations: [{ nodeId: "n1", value: 25 }, { nodeId: "n2", value: 75 }],
  };

  it("should mirror positions across vertical axis", () => {
    testMirrorOperation(verticalMirrorTest);
  });

  it("should mirror positions across horizontal axis", () => {
    testMirrorOperation(horizontalMirrorTest);
  });

  it("should preserve y-coordinates when mirroring across vertical axis", () => {
    testCoordinatePreservation(verticalPreserveYTest);
  });

  it("should preserve x-coordinates when mirroring across horizontal axis", () => {
    testCoordinatePreservation(horizontalPreserveXTest);
  });

  it("should handle empty position map", () => {
    const result = mirrorPositions(new Map<NodeId, Point>(), { type: "vertical", position: 50 });
    expect(result.size).toBe(0);
  });

  it("should create new map without modifying original", () => {
    const positions = createPositionMap({ n1: { x: 20, y: 50 } });
    const result = mirrorPositions(positions, { type: "vertical", position: 50 });

    assertCoordinate(positions, "n1", "x", 20);
    assertCoordinate(result, "n1", "x", 80);
  });

  it("should handle symmetric layout (bridge circuit)", () => {
    testCoordinatePreservation({
      positions: {
        n1: { x: 0, y: 50 },
        n2: { x: 50, y: 0 },
        n3: { x: 100, y: 50 },
        n4: { x: 50, y: 100 },
        n5: { x: 50, y: 50 },
      },
      axis: { type: "vertical", position: 50 },
      coord: "x",
      expectations: [
        { nodeId: "n1", value: 100 },
        { nodeId: "n3", value: 0 },
        { nodeId: "n2", value: 50 },
        { nodeId: "n5", value: 50 },
      ],
    });
  });
});
