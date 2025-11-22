/**
 * Unit tests for graph theory utilities
 */

import { describe, it, expect } from "bun:test";
import {
  buildAdjacencyList,
  breadthFirstSearch,
  depthFirstSearch,
  hasCycle,
  findAllPaths,
  findDisjointPaths,
  matchesPattern,
} from "./graphTheory";
import type { ElectricalNode, Branch, NodeId, BranchId } from "../../../../types/analysis";

// Helper functions for test data creation

function createNode(id: string, connectedBranches: string[]): ElectricalNode {
  return {
    id: id as NodeId,
    connectedBranchIds: connectedBranches as BranchId[],
  };
}

function createBranch(
  id: string,
  from: string,
  to: string,
  type: "resistor" | "voltageSource" = "resistor"
): Branch {
  return {
    id: id as BranchId,
    type,
    value: 10,
    fromNodeId: from as NodeId,
    toNodeId: to as NodeId,
  };
}

type GraphData = {
  nodes: Array<{ id: string; branches: string[] }>;
  branches: Array<{ id: string; from: string; to: string }>;
};

function createTestGraph(data: GraphData): {
  nodes: ElectricalNode[];
  branches: Branch[];
} {
  return {
    nodes: data.nodes.map((n) => createNode(n.id, n.branches)),
    branches: data.branches.map((b) => createBranch(b.id, b.from, b.to)),
  };
}

// Test data constants

const linearGraphData: GraphData = {
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

const cyclicGraphData: GraphData = {
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

const bridgeGraphData: GraphData = {
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

// Helper functions for test execution

type AdjacencyList = ReturnType<typeof buildAdjacencyList>;
type BFSResult = ReturnType<typeof breadthFirstSearch>;
type PathList = ReturnType<typeof findAllPaths>;
type DisjointPathResult = ReturnType<typeof findDisjointPaths>;

interface SearchTestParams {
  graphData: GraphData;
  startNode: string;
  assertion: (result: BFSResult) => void;
}

interface PathTestParams {
  graphData: GraphData;
  from: string;
  to: string;
  maxLength?: number;
}

interface PatternParams {
  nodeCount: number;
  branchCount: number;
  degrees: number[];
}

function runWithAdjacency<T>(
  graphData: GraphData,
  operation: (adjacency: AdjacencyList) => T
): T {
  const { nodes, branches } = createTestGraph(graphData);
  const adjacency = buildAdjacencyList(nodes, branches);
  return operation(adjacency);
}

function testSearch(
  params: SearchTestParams,
  searchFn: (start: NodeId, adj: AdjacencyList) => BFSResult
): void {
  runWithAdjacency(params.graphData, (adjacency) => {
    const result = searchFn(params.startNode as NodeId, adjacency);
    params.assertion(result);
  });
}

function testBFS(params: SearchTestParams): void {
  testSearch(params, breadthFirstSearch);
}

function testDFS(params: SearchTestParams): void {
  testSearch(params, depthFirstSearch);
}

function testCycleDetection(graphData: GraphData, expectedHasCycle: boolean): void {
  const { nodes } = createTestGraph(graphData);
  runWithAdjacency(graphData, (adjacency) => {
    expect(hasCycle(nodes, adjacency)).toBe(expectedHasCycle);
  });
}

function testPathFinding(
  params: PathTestParams,
  assertion: (paths: PathList) => void
): void {
  runWithAdjacency(params.graphData, (adjacency) => {
    const paths = findAllPaths(
      params.from as NodeId,
      params.to as NodeId,
      adjacency,
      params.maxLength
    );
    assertion(paths);
  });
}

function testDisjointPaths(
  params: PathTestParams,
  assertion: (result: DisjointPathResult) => void
): void {
  runWithAdjacency(params.graphData, (adjacency) => {
    const result = findDisjointPaths(params.from as NodeId, params.to as NodeId, adjacency);
    assertion(result);
  });
}

function testPatternMatch(
  graphData: GraphData,
  pattern: PatternParams,
  expectedMatch: boolean
): void {
  const { nodes, branches } = createTestGraph(graphData);
  const isMatch = matchesPattern(nodes, branches, pattern);
  expect(isMatch).toBe(expectedMatch);
}

// Tests

describe("buildAdjacencyList", () => {
  it("should create bidirectional adjacency list", () => {
    runWithAdjacency(linearGraphData, (adjacency) => {
      expect(adjacency.neighbors.get("n1" as NodeId)).toEqual(["n2" as NodeId]);
      expect(adjacency.neighbors.get("n2" as NodeId)).toEqual(["n1" as NodeId, "n3" as NodeId]);
      expect(adjacency.neighbors.get("n3" as NodeId)).toEqual(["n2" as NodeId, "n4" as NodeId]);
      expect(adjacency.neighbors.get("n4" as NodeId)).toEqual(["n3" as NodeId]);
    });
  });

  it("should map branches to nodes", () => {
    runWithAdjacency(linearGraphData, (adjacency) => {
      const n2Branches = adjacency.branches.get("n2" as NodeId);
      expect(n2Branches).toHaveLength(2);
      expect(n2Branches?.map((b) => b.id)).toContain("b1" as BranchId);
      expect(n2Branches?.map((b) => b.id)).toContain("b2" as BranchId);
    });
  });

  it("should handle empty graph", () => {
    const { nodes, branches } = createTestGraph({ nodes: [], branches: [] });
    const adjacency = buildAdjacencyList(nodes, branches);
    expect(adjacency.neighbors.size).toBe(0);
    expect(adjacency.branches.size).toBe(0);
  });

  it("should handle single isolated node", () => {
    const graphData: GraphData = {
      nodes: [{ id: "n1", branches: [] }],
      branches: [],
    };
    runWithAdjacency(graphData, (adjacency) => {
      expect(adjacency.neighbors.size).toBe(1);
      expect(adjacency.neighbors.get("n1" as NodeId)).toEqual([]);
      expect(adjacency.branches.get("n1" as NodeId)).toEqual([]);
    });
  });

  it("should handle multiple isolated nodes", () => {
    const graphData: GraphData = {
      nodes: [
        { id: "n1", branches: [] },
        { id: "n2", branches: [] },
        { id: "n3", branches: [] },
      ],
      branches: [],
    };
    runWithAdjacency(graphData, (adjacency) => {
      expect(adjacency.neighbors.size).toBe(3);
      expect(adjacency.neighbors.get("n1" as NodeId)).toEqual([]);
      expect(adjacency.neighbors.get("n2" as NodeId)).toEqual([]);
      expect(adjacency.neighbors.get("n3" as NodeId)).toEqual([]);
    });
  });

  it("should create symmetric edges for single branch", () => {
    const graphData: GraphData = {
      nodes: [
        { id: "n1", branches: ["b1"] },
        { id: "n2", branches: ["b1"] },
      ],
      branches: [{ id: "b1", from: "n1", to: "n2" }],
    };
    runWithAdjacency(graphData, (adjacency) => {
      expect(adjacency.neighbors.get("n1" as NodeId)).toEqual(["n2" as NodeId]);
      expect(adjacency.neighbors.get("n2" as NodeId)).toEqual(["n1" as NodeId]);
    });
  });

  it("should handle parallel branches between same nodes", () => {
    const graphData: GraphData = {
      nodes: [
        { id: "n1", branches: ["b1", "b2"] },
        { id: "n2", branches: ["b1", "b2"] },
      ],
      branches: [
        { id: "b1", from: "n1", to: "n2" },
        { id: "b2", from: "n1", to: "n2" },
      ],
    };
    runWithAdjacency(graphData, (adjacency) => {
      const n1Neighbors = adjacency.neighbors.get("n1" as NodeId);
      const n2Neighbors = adjacency.neighbors.get("n2" as NodeId);
      expect(n1Neighbors).toEqual(["n2" as NodeId, "n2" as NodeId]);
      expect(n2Neighbors).toEqual(["n1" as NodeId, "n1" as NodeId]);
    });
  });

  it("should store branch references for both endpoints", () => {
    const graphData: GraphData = {
      nodes: [
        { id: "n1", branches: ["b1"] },
        { id: "n2", branches: ["b1"] },
      ],
      branches: [{ id: "b1", from: "n1", to: "n2" }],
    };
    runWithAdjacency(graphData, (adjacency) => {
      const n1Branches = adjacency.branches.get("n1" as NodeId);
      const n2Branches = adjacency.branches.get("n2" as NodeId);
      expect(n1Branches).toHaveLength(1);
      expect(n2Branches).toHaveLength(1);
      expect(n1Branches?.[0]?.id).toBe("b1" as BranchId);
      expect(n2Branches?.[0]?.id).toBe("b1" as BranchId);
    });
  });

  it("should handle star topology correctly", () => {
    const graphData: GraphData = {
      nodes: [
        { id: "center", branches: ["b1", "b2", "b3"] },
        { id: "n1", branches: ["b1"] },
        { id: "n2", branches: ["b2"] },
        { id: "n3", branches: ["b3"] },
      ],
      branches: [
        { id: "b1", from: "center", to: "n1" },
        { id: "b2", from: "center", to: "n2" },
        { id: "b3", from: "center", to: "n3" },
      ],
    };
    runWithAdjacency(graphData, (adjacency) => {
      const centerNeighbors = adjacency.neighbors.get("center" as NodeId);
      expect(centerNeighbors).toHaveLength(3);
      expect(centerNeighbors).toContain("n1" as NodeId);
      expect(centerNeighbors).toContain("n2" as NodeId);
      expect(centerNeighbors).toContain("n3" as NodeId);
    });
  });

  it("should preserve branch order in adjacency list", () => {
    runWithAdjacency(linearGraphData, (adjacency) => {
      const n2Branches = adjacency.branches.get("n2" as NodeId);
      expect(n2Branches?.[0]?.id).toBe("b1" as BranchId);
      expect(n2Branches?.[1]?.id).toBe("b2" as BranchId);
    });
  });

  it("should handle cyclic graph correctly", () => {
    runWithAdjacency(cyclicGraphData, (adjacency) => {
      expect(adjacency.neighbors.get("n1" as NodeId)).toHaveLength(2);
      expect(adjacency.neighbors.get("n2" as NodeId)).toHaveLength(2);
      expect(adjacency.neighbors.get("n3" as NodeId)).toHaveLength(2);
    });
  });

  it("should handle bridge graph correctly", () => {
    runWithAdjacency(bridgeGraphData, (adjacency) => {
      const allNeighbors = Array.from(adjacency.neighbors.values());
      expect(allNeighbors.every((neighbors) => neighbors.length === 2)).toBe(true);
    });
  });

  it("should maintain branch-to-node consistency", () => {
    runWithAdjacency(linearGraphData, (adjacency) => {
      for (const [nodeId, branches] of adjacency.branches.entries()) {
        for (const branch of branches) {
          const isEndpoint =
            branch.fromNodeId === nodeId || branch.toNodeId === nodeId;
          expect(isEndpoint).toBe(true);
        }
      }
    });
  });

  it("should create correct neighbor count for each node", () => {
    runWithAdjacency(bridgeGraphData, (adjacency) => {
      const { nodes } = createTestGraph(bridgeGraphData);
      for (const node of nodes) {
        const neighbors = adjacency.neighbors.get(node.id);
        const branches = adjacency.branches.get(node.id);
        expect(neighbors?.length).toBe(branches?.length);
      }
    });
  });
});

describe("breadthFirstSearch", () => {
  it("should visit nodes level by level", () => {
    testBFS({
      graphData: linearGraphData,
      startNode: "n1",
      assertion: (result) => {
        expect(result.visited).toEqual([
          "n1" as NodeId,
          "n2" as NodeId,
          "n3" as NodeId,
          "n4" as NodeId,
        ]);
      },
    });
  });

  it("should calculate correct distances", () => {
    testBFS({
      graphData: linearGraphData,
      startNode: "n1",
      assertion: (result) => {
        expect(result.distance.get("n1" as NodeId)).toBe(0);
        expect(result.distance.get("n2" as NodeId)).toBe(1);
        expect(result.distance.get("n3" as NodeId)).toBe(2);
        expect(result.distance.get("n4" as NodeId)).toBe(3);
      },
    });
  });

  it("should track parent relationships", () => {
    testBFS({
      graphData: linearGraphData,
      startNode: "n1",
      assertion: (result) => {
        expect(result.parent.get("n1" as NodeId)).toBeNull();
        expect(result.parent.get("n2" as NodeId)).toBe("n1" as NodeId);
        expect(result.parent.get("n3" as NodeId)).toBe("n2" as NodeId);
        expect(result.parent.get("n4" as NodeId)).toBe("n3" as NodeId);
      },
    });
  });
});

describe("depthFirstSearch", () => {
  it("should visit all reachable nodes", () => {
    testDFS({
      graphData: linearGraphData,
      startNode: "n1",
      assertion: (result) => {
        expect(result.visited).toHaveLength(4);
        expect(result.visited).toContain("n1" as NodeId);
        expect(result.visited).toContain("n2" as NodeId);
        expect(result.visited).toContain("n3" as NodeId);
        expect(result.visited).toContain("n4" as NodeId);
      },
    });
  });

  it("should track parent relationships", () => {
    testDFS({
      graphData: linearGraphData,
      startNode: "n1",
      assertion: (result) => {
        expect(result.parent.get("n1" as NodeId)).toBeNull();
        expect(result.parent.has("n2" as NodeId)).toBe(true);
        expect(result.parent.has("n3" as NodeId)).toBe(true);
        expect(result.parent.has("n4" as NodeId)).toBe(true);
      },
    });
  });
});

describe("hasCycle", () => {
  it("should detect cycles in cyclic graphs", () => {
    testCycleDetection(cyclicGraphData, true);
  });

  it("should not detect cycles in acyclic graphs", () => {
    testCycleDetection(linearGraphData, false);
  });

  it("should handle bridge graphs correctly", () => {
    testCycleDetection(bridgeGraphData, true);
  });
});

describe("findAllPaths", () => {
  it("should find single path in linear graph", () => {
    testPathFinding({ graphData: linearGraphData, from: "n1", to: "n4" }, (paths) => {
      expect(paths).toHaveLength(1);
      expect(paths[0]?.nodes).toEqual([
        "n1" as NodeId,
        "n2" as NodeId,
        "n3" as NodeId,
        "n4" as NodeId,
      ]);
    });
  });

  it("should find multiple paths in bridge graph", () => {
    testPathFinding({ graphData: bridgeGraphData, from: "n1", to: "n4" }, (paths) => {
      expect(paths.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("should respect max length limit", () => {
    testPathFinding(
      { graphData: linearGraphData, from: "n1", to: "n4", maxLength: 2 },
      (paths) => {
        expect(paths).toHaveLength(0);
      }
    );
  });
});

describe("findDisjointPaths", () => {
  it("should find disjoint paths in bridge graph", () => {
    testDisjointPaths({ graphData: bridgeGraphData, from: "n1", to: "n4" }, (result) => {
      expect(result).toBeDefined();
      if (result) {
        const [path1, path2] = result;
        expect(path1.nodes).toHaveLength(3);
        expect(path2.nodes).toHaveLength(3);

        const intermediateNodes1 = new Set(path1.nodes.slice(1, -1));
        const intermediateNodes2 = new Set(path2.nodes.slice(1, -1));

        for (const node of intermediateNodes1) {
          expect(intermediateNodes2.has(node)).toBe(false);
        }
      }
    });
  });

  it("should return undefined for linear graph", () => {
    testDisjointPaths({ graphData: linearGraphData, from: "n1", to: "n4" }, (result) => {
      expect(result).toBeUndefined();
    });
  });
});

describe("matchesPattern", () => {
  it("should match bridge pattern structure", () => {
    testPatternMatch(
      bridgeGraphData,
      { nodeCount: 4, branchCount: 4, degrees: [2, 2, 2, 2] },
      true
    );
  });

  it("should match triangle pattern structure", () => {
    testPatternMatch(
      cyclicGraphData,
      { nodeCount: 3, branchCount: 3, degrees: [2, 2, 2] },
      true
    );
  });

  it("should reject mismatched node count", () => {
    testPatternMatch(
      bridgeGraphData,
      { nodeCount: 3, branchCount: 4, degrees: [2, 2, 2, 2] },
      false
    );
  });

  it("should reject mismatched branch count", () => {
    testPatternMatch(
      bridgeGraphData,
      { nodeCount: 4, branchCount: 3, degrees: [2, 2, 2, 2] },
      false
    );
  });

  it("should reject mismatched degree sequence", () => {
    testPatternMatch(
      linearGraphData,
      { nodeCount: 4, branchCount: 3, degrees: [2, 2, 2, 2] },
      false
    );
  });
});
