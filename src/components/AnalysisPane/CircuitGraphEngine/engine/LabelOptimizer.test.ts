/**
 * Unit tests for LabelOptimizer
 */

import { describe, it, expect } from "bun:test";
import { LabelOptimizer } from "./LabelOptimizer";
import type { LayoutNode, LayoutEdge } from "../types";
import { createPathData } from "../utils";

// Helper to create layout node
function createLayoutNode(params: {
  id: string;
  x: number;
  y: number;
  label: string;
  labelPos: { x: number; y: number };
}): LayoutNode {
  return {
    id: params.id,
    x: params.x,
    y: params.y,
    label: params.label,
    labelPos: params.labelPos,
  };
}

// Helper to create layout edge
function createLayoutEdge(params: {
  id: string;
  sourceId: string;
  targetId: string;
  path: string;
  arrowPoint: { x: number; y: number; angle: number };
  label: string;
  labelPos: { x: number; y: number };
  isCurved: boolean;
}): LayoutEdge {
  return {
    id: params.id,
    sourceId: params.sourceId,
    targetId: params.targetId,
    path: createPathData(params.path),
    arrowPoint: params.arrowPoint,
    label: params.label,
    labelPos: params.labelPos,
    isCurved: params.isCurved,
  };
}

// Helper to create simple node at position
function nodeAt(id: string, x: number, y: number): LayoutNode {
  return createLayoutNode({
    id,
    x,
    y,
    label: id.toUpperCase(),
    labelPos: { x, y: y - 10 },
  });
}

// Helper to create simple edge
function edgeBetween(params: {
  id: string;
  from: string;
  to: string;
  midpoint: { x: number; y: number };
  path: string;
  isCurved?: boolean;
}): LayoutEdge {
  return createLayoutEdge({
    id: params.id,
    sourceId: params.from,
    targetId: params.to,
    path: params.path,
    arrowPoint: { x: params.midpoint.x, y: params.midpoint.y, angle: 0 },
    label: params.id.toUpperCase(),
    labelPos: params.midpoint,
    isCurved: params.isCurved ?? false,
  });
}

// Helper to test label optimization
function testLabelOptimization(params: {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  assertions: (result: { nodeLabels: Map<string, { x: number; y: number }>; edgeLabels: Map<string, { x: number; y: number }> }) => void;
}): void {
  const optimizer = new LabelOptimizer();
  const result = optimizer.optimizeLabels(params.nodes, params.edges);
  params.assertions(result);
}

// Helper to assert label exists and has position
function assertLabelPosition(
  labels: Map<string, { x: number; y: number }>,
  id: string,
  expectedX: number,
  expectedY: number
): void {
  const label = labels.get(id);
  expect(label).toBeDefined();
  expect(label?.x).toBe(expectedX);
  expect(label?.y).toBe(expectedY);
}

// Helper to assert label exists with valid position
function assertValidLabelPosition(labels: Map<string, { x: number; y: number }>, id: string): void {
  const label = labels.get(id);
  expect(label).toBeDefined();
  expect(typeof label?.x).toBe("number");
  expect(typeof label?.y).toBe("number");
  expect(Number.isFinite(label?.x)).toBe(true);
  expect(Number.isFinite(label?.y)).toBe(true);
}

// Helper to assert labels are not at same position
function assertLabelsNotOverlapping(
  label1: { x: number; y: number } | undefined,
  label2: { x: number; y: number } | undefined
): void {
  expect(label1).toBeDefined();
  expect(label2).toBeDefined();
  const samePosition = label1?.x === label2?.x && label1?.y === label2?.y;
  expect(samePosition).toBe(false);
}

// Helper to assert all labels have valid positions
function assertAllLabelsValid(labels: Map<string, { x: number; y: number }>): void {
  for (const [, label] of labels) {
    expect(label).toBeDefined();
    expect(typeof label.x).toBe("number");
    expect(typeof label.y).toBe("number");
    expect(Number.isFinite(label.x)).toBe(true);
    expect(Number.isFinite(label.y)).toBe(true);
  }
}

// Helper to assert label map size
function assertLabelMapSize(
  result: { nodeLabels: Map<string, { x: number; y: number }>; edgeLabels: Map<string, { x: number; y: number }> },
  nodeCount: number,
  edgeCount: number
): void {
  expect(result.nodeLabels.size).toBe(nodeCount);
  expect(result.edgeLabels.size).toBe(edgeCount);
}

// Helper to test single valid label
function assertSingleValidLabel(
  labels: Map<string, { x: number; y: number }>,
  id: string
): void {
  expect(labels.size).toBe(1);
  assertValidLabelPosition(labels, id);
}

describe("LabelOptimizer", () => {
  // Test data constants
  const singleNodeScenario = {
    nodes: [nodeAt("node1", 100, 100)],
    edges: [] as LayoutEdge[],
  };

  const singleEdgeScenario = {
    nodes: [] as LayoutNode[],
    edges: [
      edgeBetween({
        id: "edge1",
        from: "node1",
        to: "node2",
        midpoint: { x: 50, y: 50 },
        path: "M 0 0 L 100 100",
      }),
    ],
  };

  const multipleNodesAndEdgesScenario = {
    nodes: [nodeAt("node1", 100, 100), nodeAt("node2", 200, 100)],
    edges: [
      edgeBetween({
        id: "edge1",
        from: "node1",
        to: "node2",
        midpoint: { x: 150, y: 100 },
        path: "M 100 100 L 200 100",
      }),
    ],
  };

  const overlappingNodesScenario = {
    nodes: [nodeAt("node1", 100, 100), nodeAt("node2", 100, 95)],
    edges: [] as LayoutEdge[],
  };

  const edgeOverlappingNodeScenario = {
    nodes: [nodeAt("node1", 100, 100)],
    edges: [
      edgeBetween({
        id: "edge1",
        from: "node1",
        to: "node2",
        midpoint: { x: 100, y: 100 },
        path: "M 100 100 L 200 100",
      }),
    ],
  };

  const closeNodesScenario = {
    nodes: [nodeAt("node1", 100, 100), nodeAt("node2", 100, 85)],
    edges: [] as LayoutEdge[],
  };

  const denseClusterScenario = {
    nodes: [
      nodeAt("node1", 100, 100),
      nodeAt("node2", 100, 90),
      nodeAt("node3", 100, 110),
      nodeAt("node4", 90, 100),
      nodeAt("node5", 110, 100),
    ],
    edges: [] as LayoutEdge[],
  };

  const emptyScenario = {
    nodes: [] as LayoutNode[],
    edges: [] as LayoutEdge[],
  };

  const longLabelScenario = {
    nodes: [
      createLayoutNode({
        id: "node1",
        x: 100,
        y: 100,
        label: "VeryLongNodeLabel",
        labelPos: { x: 100, y: 90 },
      }),
    ],
    edges: [] as LayoutEdge[],
  };

  const curvedEdgeScenario = {
    nodes: [] as LayoutNode[],
    edges: [
      edgeBetween({
        id: "edge1",
        from: "node1",
        to: "node2",
        midpoint: { x: 50, y: -15 },
        path: "M 0 0 Q 50 -30 100 0",
        isCurved: true,
      }),
    ],
  };

  describe("optimizeLabels", () => {
    it("should calculate initial positions for node labels", () => {
      testLabelOptimization({
        ...singleNodeScenario,
        assertions: (result) => {
          expect(result.nodeLabels.size).toBe(1);
          assertLabelPosition(result.nodeLabels, "node1", 100, 90);
        },
      });
    });

    it("should calculate initial positions for edge labels", () => {
      testLabelOptimization({
        ...singleEdgeScenario,
        assertions: (result) => {
          expect(result.edgeLabels.size).toBe(1);
          assertLabelPosition(result.edgeLabels, "edge1", 50, 40);
        },
      });
    });

    it("should handle multiple nodes and edges", () => {
      testLabelOptimization({
        ...multipleNodesAndEdgesScenario,
        assertions: (result) => {
          expect(result.nodeLabels.size).toBe(2);
          expect(result.edgeLabels.size).toBe(1);
        },
      });
    });
  });

  describe("collision detection", () => {
    it("should detect when labels would overlap with nodes", () => {
      testLabelOptimization({
        ...overlappingNodesScenario,
        assertions: (result) => {
          expect(result.nodeLabels.size).toBe(2);
          const label1 = result.nodeLabels.get("node1");
          const label2 = result.nodeLabels.get("node2");
          assertLabelsNotOverlapping(label1, label2);
        },
      });
    });

    it("should handle edge labels that might overlap with nodes", () => {
      testLabelOptimization({
        ...edgeOverlappingNodeScenario,
        assertions: (result) => {
          assertLabelMapSize(result, 1, 1);
          assertValidLabelPosition(result.edgeLabels, "edge1");
        },
      });
    });
  });

  describe("alternative position search", () => {
    it("should try alternative positions when initial position has collision", () => {
      testLabelOptimization({
        ...closeNodesScenario,
        assertions: (result) => {
          expect(result.nodeLabels.size).toBe(2);
          assertValidLabelPosition(result.nodeLabels, "node1");
          assertValidLabelPosition(result.nodeLabels, "node2");
        },
      });
    });
  });

  describe("fallback behavior", () => {
    it("should select position with minimum overlap when all positions collide", () => {
      testLabelOptimization({
        ...denseClusterScenario,
        assertions: (result) => {
          expect(result.nodeLabels.size).toBe(5);
          assertAllLabelsValid(result.nodeLabels);
        },
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", () => {
      testLabelOptimization({
        ...emptyScenario,
        assertions: (result) => {
          assertLabelMapSize(result, 0, 0);
        },
      });
    });

    it("should handle nodes with long labels", () => {
      testLabelOptimization({
        ...longLabelScenario,
        assertions: (result) => {
          assertSingleValidLabel(result.nodeLabels, "node1");
        },
      });
    });

    it("should handle edges with curved paths", () => {
      testLabelOptimization({
        ...curvedEdgeScenario,
        assertions: (result) => {
          assertSingleValidLabel(result.edgeLabels, "edge1");
        },
      });
    });
  });
});

