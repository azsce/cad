/**
 * Unit tests for PatternMatcher
 */

import { describe, it, expect } from "bun:test";
import { PatternMatcher } from "./PatternMatcher";
import type { PatternMatch } from "./PatternMatcher";
import type { ElectricalNode, Branch, NodeId, BranchId } from "../../../../types/analysis";

// Helper functions for creating test data

function createNode(id: string, connectedBranches: string[]): ElectricalNode {
  return {
    id: id as NodeId,
    connectedBranchIds: connectedBranches as BranchId[],
  };
}

function createBranch(id: string, from: string, to: string): Branch {
  return {
    id: id as BranchId,
    type: "resistor",
    value: 10,
    fromNodeId: from as NodeId,
    toNodeId: to as NodeId,
  };
}

function createTestGraph(params: {
  nodes: Array<{ id: string; branches: string[] }>;
  branches: Array<{ id: string; from: string; to: string }>;
}): { nodes: ElectricalNode[]; branches: Branch[] } {
  return {
    nodes: params.nodes.map((n) => createNode(n.id, n.branches)),
    branches: params.branches.map((b) => createBranch(b.id, b.from, b.to)),
  };
}

// Test data constants

const bridgeCircuitData = {
  nodes: [
    { id: "n1", branches: ["b1", "b2"] },
    { id: "n2", branches: ["b1", "b3"] },
    { id: "n3", branches: ["b2", "b4"] },
    { id: "n4", branches: ["b3", "b4"] },
  ],
  branches: [
    { id: "b1", from: "n1", to: "n2" },
    { id: "b2", from: "n1", to: "n3" },
    { id: "b3", from: "n2", to: "n4" },
    { id: "b4", from: "n3", to: "n4" },
  ],
};

const piCircuitData = {
  nodes: [
    { id: "n1", branches: ["b1", "b3"] },
    { id: "n2", branches: ["b1", "b2"] },
    { id: "n3", branches: ["b2", "b3"] },
  ],
  branches: [
    { id: "b1", from: "n1", to: "n2" },
    { id: "b2", from: "n2", to: "n3" },
    { id: "b3", from: "n3", to: "n1" },
  ],
};

const tCircuitData = {
  nodes: [
    { id: "n1", branches: ["b1", "b2", "b3"] },
    { id: "n2", branches: ["b1"] },
    { id: "n3", branches: ["b2"] },
    { id: "n4", branches: ["b3"] },
  ],
  branches: [
    { id: "b1", from: "n1", to: "n2" },
    { id: "b2", from: "n1", to: "n3" },
    { id: "b3", from: "n1", to: "n4" },
  ],
};

const seriesCircuitData = {
  nodes: [
    { id: "n1", branches: ["b1"] },
    { id: "n2", branches: ["b1", "b2"] },
    { id: "n3", branches: ["b2", "b3"] },
    { id: "n4", branches: ["b3"] },
  ],
  branches: [
    { id: "b1", from: "n1", to: "n2" },
    { id: "b2", from: "n2", to: "n3" },
    { id: "b3", from: "n3", to: "n4" },
  ],
};

// Helper functions for test execution

type GraphData = typeof bridgeCircuitData;
type PatternType = "bridge" | "pi" | "t" | "series";

interface PatternTestParams {
  graphData: GraphData;
  patternType: PatternType;
  expectedNodes: number;
  expectedBranches: number;
}

interface TemplateTestParams {
  graphData: GraphData;
  patternType: PatternType;
  expectedLength: number;
  firstPoint: { x: number; y: number };
}

function runPatternMatcher(graphData: GraphData): {
  matcher: PatternMatcher;
  matches: PatternMatch[];
  nodes: ElectricalNode[];
  branches: Branch[];
} {
  const { nodes, branches } = createTestGraph(graphData);
  const matcher = new PatternMatcher();
  const matches = matcher.findPatterns(nodes, branches);
  return { matcher, matches, nodes, branches };
}

function testPatternDetection(params: PatternTestParams): void {
  const { matches } = runPatternMatcher(params.graphData);
  expect(matches.length).toBeGreaterThanOrEqual(1);
  const match = matches.find((m) => m.pattern.type === params.patternType);
  expect(match).toBeDefined();
  expect(match?.pattern.nodes).toHaveLength(params.expectedNodes);
  expect(match?.pattern.branches).toHaveLength(params.expectedBranches);
}

function testGeometricTemplate(params: TemplateTestParams): void {
  const { matches } = runPatternMatcher(params.graphData);
  const match = matches.find((m) => m.pattern.type === params.patternType);
  expect(match?.pattern.geometricTemplate).toHaveLength(params.expectedLength);
  expect(match?.pattern.geometricTemplate[0]).toEqual(params.firstPoint);
}

function testNodeMapping(params: PatternTestParams): void {
  const { matches } = runPatternMatcher(params.graphData);
  const match = matches.find((m) => m.pattern.type === params.patternType);
  expect(match?.nodeMapping.size).toBe(params.expectedNodes);
  expect(match?.branchMapping.size).toBe(params.expectedBranches);
}

function findPatternMatch(graphData: GraphData, patternType: PatternType): PatternMatch | undefined {
  const { matches } = runPatternMatcher(graphData);
  return matches.find((m) => m.pattern.type === patternType);
}

function assertUniqueNodeUsage(matches: PatternMatch[]): void {
  const allUsedNodes = new Set<NodeId>();
  for (const match of matches) {
    for (const nodeId of match.pattern.nodes) {
      expect(allUsedNodes.has(nodeId)).toBe(false);
      allUsedNodes.add(nodeId);
    }
  }
}

function assertUniqueBranchUsage(matches: PatternMatch[]): void {
  const allUsedBranches = new Set<BranchId>();
  for (const match of matches) {
    for (const branchId of match.pattern.branches) {
      expect(allUsedBranches.has(branchId)).toBe(false);
      allUsedBranches.add(branchId);
    }
  }
}

interface CollapseTestParams {
  graphData: GraphData;
  expectedSuperNodes: number;
  expectedNodes: number;
  expectedBranches: number;
}

interface ExpandTestParams {
  graphData: GraphData;
  superNodePosition: { x: number; y: number };
  scale: number;
  expectedSize: number;
}

interface ExpandSetup {
  matcher: PatternMatcher;
  matches: PatternMatch[];
  simplified: ReturnType<PatternMatcher["collapsePatterns"]>;
  positions: Map<NodeId, { x: number; y: number }>;
}

function testCollapsePattern(params: CollapseTestParams): void {
  const { matcher, matches, nodes, branches } = runPatternMatcher(params.graphData);
  const simplified = matcher.collapsePatterns(nodes, branches, matches);
  expect(simplified.superNodes).toHaveLength(params.expectedSuperNodes);
  expect(simplified.nodes).toHaveLength(params.expectedNodes);
  expect(simplified.branches).toHaveLength(params.expectedBranches);
}

function createSuperNodePositions(
  superNodeId: NodeId | undefined,
  position: { x: number; y: number }
): Map<NodeId, { x: number; y: number }> {
  const map = new Map<NodeId, { x: number; y: number }>();
  if (superNodeId) {
    map.set(superNodeId, position);
  }
  return map;
}

function setupExpandTest(
  graphData: GraphData,
  position: { x: number; y: number }
): ExpandSetup {
  const { matcher, matches, nodes, branches } = runPatternMatcher(graphData);
  const simplified = matcher.collapsePatterns(nodes, branches, matches);
  const superNodeId = simplified.superNodes[0]?.id;
  const positions = createSuperNodePositions(superNodeId, position);
  return { matcher, matches, simplified, positions };
}

function testExpandPattern(params: ExpandTestParams): void {
  const setup = setupExpandTest(params.graphData, params.superNodePosition);
  const expanded = setup.matcher.expandPatterns(setup.simplified, setup.positions, params.scale);
  expect(expanded.size).toBe(params.expectedSize);
}

function assertTemplatePositions(
  expanded: Map<NodeId, { x: number; y: number }>,
  match: PatternMatch,
  offset: { x: number; y: number },
  scale: number
): void {
  for (const [nodeId, templateIndex] of match.nodeMapping) {
    const pos = expanded.get(nodeId);
    const templatePos = match.pattern.geometricTemplate[templateIndex];
    expect(pos).toBeDefined();
    expect(pos?.x).toBe(offset.x + (templatePos?.x ?? 0) * scale);
    expect(pos?.y).toBe(offset.y + (templatePos?.y ?? 0) * scale);
  }
}

// Tests

describe("PatternMatcher - Bridge Pattern", () => {
  it("should detect bridge pattern in diamond circuit", () => {
    testPatternDetection({
      graphData: bridgeCircuitData,
      patternType: "bridge",
      expectedNodes: 4,
      expectedBranches: 4,
    });
  });

  it("should create correct geometric template for bridge", () => {
    testGeometricTemplate({
      graphData: bridgeCircuitData,
      patternType: "bridge",
      expectedLength: 4,
      firstPoint: { x: 0, y: 50 },
    });

    const match = findPatternMatch(bridgeCircuitData, "bridge");
    expect(match?.pattern.geometricTemplate[3]).toEqual({ x: 100, y: 50 });
  });

  it("should create correct node mapping for bridge", () => {
    testNodeMapping({
      graphData: bridgeCircuitData,
      patternType: "bridge",
      expectedNodes: 4,
      expectedBranches: 4,
    });
  });
});

describe("PatternMatcher - Pi Pattern", () => {
  it("should detect pi network pattern in triangle circuit", () => {
    testPatternDetection({
      graphData: piCircuitData,
      patternType: "pi",
      expectedNodes: 3,
      expectedBranches: 3,
    });
  });

  it("should create correct geometric template for pi", () => {
    testGeometricTemplate({
      graphData: piCircuitData,
      patternType: "pi",
      expectedLength: 3,
      firstPoint: { x: 50, y: 0 },
    });
  });

  it("should create correct node mapping for pi", () => {
    testNodeMapping({
      graphData: piCircuitData,
      patternType: "pi",
      expectedNodes: 3,
      expectedBranches: 3,
    });
  });
});

describe("PatternMatcher - T Pattern", () => {
  it("should detect T network pattern", () => {
    testPatternDetection({
      graphData: tCircuitData,
      patternType: "t",
      expectedNodes: 4,
      expectedBranches: 3,
    });
  });

  it("should create correct geometric template for T", () => {
    testGeometricTemplate({
      graphData: tCircuitData,
      patternType: "t",
      expectedLength: 4,
      firstPoint: { x: 50, y: 50 },
    });
  });

  it("should create correct node mapping for T", () => {
    testNodeMapping({
      graphData: tCircuitData,
      patternType: "t",
      expectedNodes: 4,
      expectedBranches: 3,
    });
  });
});

describe("PatternMatcher - Series Pattern", () => {
  it("should detect series chain pattern", () => {
    testPatternDetection({
      graphData: seriesCircuitData,
      patternType: "series",
      expectedNodes: 4,
      expectedBranches: 3,
    });
  });

  it("should create correct geometric template for series", () => {
    const match = findPatternMatch(seriesCircuitData, "series");
    expect(match?.pattern.geometricTemplate).toHaveLength(4);
    expect(match?.pattern.geometricTemplate[0]?.x).toBe(0);
    expect(match?.pattern.geometricTemplate[3]?.x).toBeCloseTo(100, 1);
  });

  it("should create correct node mapping for series", () => {
    testNodeMapping({
      graphData: seriesCircuitData,
      patternType: "series",
      expectedNodes: 4,
      expectedBranches: 3,
    });
  });
});

describe("PatternMatcher - Mixed Patterns", () => {
  const mixedCircuitData = {
    nodes: [
      { id: "n1", branches: ["b1", "b2"] },
      { id: "n2", branches: ["b1", "b3"] },
      { id: "n3", branches: ["b2", "b4"] },
      { id: "n4", branches: ["b3", "b4", "b5"] },
      { id: "n5", branches: ["b5", "b6"] },
      { id: "n6", branches: ["b6"] },
    ],
    branches: [
      { id: "b1", from: "n1", to: "n2" },
      { id: "b2", from: "n1", to: "n3" },
      { id: "b3", from: "n2", to: "n4" },
      { id: "b4", from: "n3", to: "n4" },
      { id: "b5", from: "n4", to: "n5" },
      { id: "b6", from: "n5", to: "n6" },
    ],
  };

  it("should detect multiple patterns in complex circuit", () => {
    const { nodes, branches } = createTestGraph(mixedCircuitData);
    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns(nodes, branches);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("should not reuse nodes across patterns", () => {
    const { nodes, branches } = createTestGraph(bridgeCircuitData);
    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns(nodes, branches);
    assertUniqueNodeUsage(matches);
  });

  it("should not reuse branches across patterns", () => {
    const { nodes, branches } = createTestGraph(bridgeCircuitData);
    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns(nodes, branches);
    assertUniqueBranchUsage(matches);
  });
});

describe("PatternMatcher - Edge Cases", () => {
  it("should handle empty graph", () => {
    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns([], []);

    expect(matches).toHaveLength(0);
  });

  it("should handle single node", () => {
    const nodes = [createNode("n1", [])];
    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns(nodes, []);

    expect(matches).toHaveLength(0);
  });

  it("should handle two connected nodes", () => {
    const branches = [createBranch("b1", "n1", "n2")];
    const nodes = [createNode("n1", ["b1"]), createNode("n2", ["b1"])];

    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns(nodes, branches);

    expect(matches).toHaveLength(0);
  });
});

describe("PatternMatcher - Collapse Patterns", () => {
  const bridgeWithExternalData = {
    nodes: [
      { id: "n1", branches: ["b1", "b2"] },
      { id: "n2", branches: ["b1", "b3"] },
      { id: "n3", branches: ["b2", "b4"] },
      { id: "n4", branches: ["b3", "b4", "b5"] },
      { id: "n5", branches: ["b5"] },
    ],
    branches: [
      { id: "b1", from: "n1", to: "n2" },
      { id: "b2", from: "n1", to: "n3" },
      { id: "b3", from: "n2", to: "n4" },
      { id: "b4", from: "n3", to: "n4" },
      { id: "b5", from: "n4", to: "n5" },
    ],
  };

  const doubleBridgeData = {
    nodes: [
      { id: "n1", branches: ["b1", "b2"] },
      { id: "n2", branches: ["b1", "b3"] },
      { id: "n3", branches: ["b2", "b4"] },
      { id: "n4", branches: ["b3", "b4"] },
      { id: "n5", branches: ["b5", "b6"] },
      { id: "n6", branches: ["b5", "b7"] },
      { id: "n7", branches: ["b6", "b8"] },
      { id: "n8", branches: ["b7", "b8"] },
    ],
    branches: [
      { id: "b1", from: "n1", to: "n2" },
      { id: "b2", from: "n1", to: "n3" },
      { id: "b3", from: "n2", to: "n4" },
      { id: "b4", from: "n3", to: "n4" },
      { id: "b5", from: "n5", to: "n6" },
      { id: "b6", from: "n5", to: "n7" },
      { id: "b7", from: "n6", to: "n8" },
      { id: "b8", from: "n7", to: "n8" },
    ],
  };

  it("should collapse bridge pattern into super node", () => {
    testCollapsePattern({
      graphData: bridgeCircuitData,
      expectedSuperNodes: 1,
      expectedNodes: 0,
      expectedBranches: 0,
    });
  });

  it("should preserve external connections when collapsing", () => {
    const { nodes, branches } = createTestGraph(bridgeWithExternalData);
    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns(nodes, branches);
    const simplified = matcher.collapsePatterns(nodes, branches, matches);

    expect(simplified.superNodes).toHaveLength(1);
    const superNode = simplified.superNodes[0];
    expect(superNode?.externalConnections).toHaveLength(1);
    expect(superNode?.externalConnections[0]?.externalNodeId).toBe("n5" as NodeId);
  });

  it("should keep non-pattern nodes in simplified graph", () => {
    const { nodes, branches } = createTestGraph(bridgeCircuitData);
    const extraNode = createNode("n5", []);
    const allNodes = [...nodes, extraNode];

    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns(nodes, branches);
    const simplified = matcher.collapsePatterns(allNodes, branches, matches);

    expect(simplified.nodes).toHaveLength(1);
    expect(simplified.nodes[0]?.id).toBe("n5" as NodeId);
  });

  it("should collapse multiple patterns independently", () => {
    const { nodes, branches } = createTestGraph(doubleBridgeData);
    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns(nodes, branches);
    const simplified = matcher.collapsePatterns(nodes, branches, matches);

    expect(simplified.superNodes.length).toBeGreaterThanOrEqual(1);
    expect(simplified.nodes).toHaveLength(0);
  });
});

describe("PatternMatcher - Expand Patterns", () => {
  it("should expand bridge pattern using geometric template", () => {
    testExpandPattern({
      graphData: bridgeCircuitData,
      superNodePosition: { x: 0, y: 0 },
      scale: 1,
      expectedSize: 4,
    });

    const setup = setupExpandTest(bridgeCircuitData, { x: 0, y: 0 });
    const expanded = setup.matcher.expandPatterns(setup.simplified, setup.positions, 1);
    const bridgeMatch = setup.matches.find((m) => m.pattern.type === "bridge");

    if (bridgeMatch) {
      assertTemplatePositions(expanded, bridgeMatch, { x: 0, y: 0 }, 1);
    }
  });

  it("should scale pattern template when expanding", () => {
    const setup = setupExpandTest(bridgeCircuitData, { x: 0, y: 0 });
    const scale = 2;
    const expanded = setup.matcher.expandPatterns(setup.simplified, setup.positions, scale);
    const bridgeMatch = setup.matches.find((m) => m.pattern.type === "bridge");

    if (bridgeMatch) {
      assertTemplatePositions(expanded, bridgeMatch, { x: 0, y: 0 }, scale);
    }
  });

  it("should translate pattern to super node position", () => {
    const offset = { x: 100, y: 200 };
    const setup = setupExpandTest(bridgeCircuitData, offset);
    const expanded = setup.matcher.expandPatterns(setup.simplified, setup.positions, 1);
    const bridgeMatch = setup.matches.find((m) => m.pattern.type === "bridge");

    if (bridgeMatch) {
      assertTemplatePositions(expanded, bridgeMatch, offset, 1);
    }
  });

  it("should preserve regular node positions when expanding", () => {
    const { nodes, branches } = createTestGraph(bridgeCircuitData);
    const extraNode = createNode("n5", []);
    const allNodes = [...nodes, extraNode];

    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns(nodes, branches);
    const simplified = matcher.collapsePatterns(allNodes, branches, matches);
    const superNodeId = simplified.superNodes[0]?.id;
    const positions = createSuperNodePositions(superNodeId, { x: 0, y: 0 });
    positions.set("n5" as NodeId, { x: 300, y: 400 });

    const expanded = matcher.expandPatterns(simplified, positions, 1);
    const extraPos = expanded.get("n5" as NodeId);
    expect(extraPos).toEqual({ x: 300, y: 400 });
  });
});

describe("PatternMatcher - Collapse/Expand Round-Trip", () => {
  it("should preserve all nodes through collapse/expand cycle", () => {
    const { nodes, branches } = createTestGraph(bridgeCircuitData);
    const matcher = new PatternMatcher();
    const matches = matcher.findPatterns(nodes, branches);
    const simplified = matcher.collapsePatterns(nodes, branches, matches);
    const superNodeId = simplified.superNodes[0]?.id;
    const positions = createSuperNodePositions(superNodeId, { x: 0, y: 0 });
    const expanded = matcher.expandPatterns(simplified, positions, 1);

    expect(expanded.size).toBe(nodes.length);
    for (const node of nodes) {
      expect(expanded.has(node.id)).toBe(true);
    }
  });

  it("should work with pi network pattern", () => {
    testExpandPattern({
      graphData: piCircuitData,
      superNodePosition: { x: 0, y: 0 },
      scale: 1,
      expectedSize: 3,
    });
  });

  it("should work with T network pattern", () => {
    testExpandPattern({
      graphData: tCircuitData,
      superNodePosition: { x: 0, y: 0 },
      scale: 1,
      expectedSize: 4,
    });
  });

  it("should work with series chain pattern", () => {
    testExpandPattern({
      graphData: seriesCircuitData,
      superNodePosition: { x: 0, y: 0 },
      scale: 1,
      expectedSize: 4,
    });
  });
});
