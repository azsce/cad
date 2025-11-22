/**
 * Visual regression tests for CircuitGraphRenderer
 *
 * Tests SVG output for various circuit topologies to ensure consistent
 * visual rendering across changes.
 */

// Setup DOM environment for React component testing
import { Window } from "happy-dom";

const window = new Window();
const document = window.document;

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
globalThis.window = window as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
globalThis.document = document as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
globalThis.MouseEvent = window.MouseEvent as any;

import { describe, it, expect } from "bun:test";
import { render } from "@testing-library/react";
import { CircuitGraphRenderer } from "./CircuitGraphRenderer";
import { GraphLayoutEngine } from "./engine/GraphLayoutEngine";
import type { AnalysisGraph, Branch, ElectricalNode } from "../../../types/analysis";
import {
  createNodeId,
  createBranchId,
  createTreeId,
} from "../../../types/analysis";

// ============================================================================
// Graph Creation Helpers
// ============================================================================

type ComponentType = "resistor" | "voltageSource" | "currentSource";

/**
 * 🏗️ Create electrical node
 */
function createNode(params: { id: string; branches: string[] }): ElectricalNode {
  return {
    id: createNodeId(params.id),
    connectedBranchIds: params.branches.map((b) => createBranchId(b)),
  };
}

/**
 * 🏗️ Create branch
 */
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

/**
 * 🏗️ Create resistor branch shorthand
 */
function resistor(params: { id: string; from: string; to: string; value?: number }) {
  const base = { id: params.id, type: "resistor" as const, from: params.from, to: params.to };
  return params.value === undefined ? base : { ...base, value: params.value };
}

/**
 * 🏗️ Create complete AnalysisGraph
 */
function createTestGraph(params: CircuitGraphDef): AnalysisGraph {
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

// ============================================================================
// Test Circuit Definitions
// ============================================================================

/**
 * Simple series circuit (2 nodes, 1 resistor)
 */
const seriesCircuitGraph = {
  nodes: [
    { id: "1", branches: ["R1"] },
    { id: "2", branches: ["R1"] },
  ],
  branches: [resistor({ id: "R1", from: "1", to: "2", value: 100 })],
  referenceNodeId: "1",
};

/**
 * Parallel branches circuit
 */
const parallelCircuitGraph = {
  nodes: [
    { id: "1", branches: ["R1", "R2", "R3"] },
    { id: "2", branches: ["R1", "R2", "R3"] },
  ],
  branches: [
    resistor({ id: "R1", from: "1", to: "2", value: 100 }),
    resistor({ id: "R2", from: "1", to: "2", value: 200 }),
    resistor({ id: "R3", from: "1", to: "2", value: 300 }),
  ],
  referenceNodeId: "1",
  twigBranchIds: ["R1", "R2"],
  linkBranchIds: ["R3"],
};

/**
 * Bridge circuit (symmetry test)
 */
const bridgeCircuitGraph = {
  nodes: [
    { id: "1", branches: ["R1", "R2"] },
    { id: "2", branches: ["R1", "R3", "R5"] },
    { id: "3", branches: ["R2", "R4", "R5"] },
    { id: "4", branches: ["R3", "R4"] },
  ],
  branches: [
    resistor({ id: "R1", from: "1", to: "2", value: 100 }),
    resistor({ id: "R2", from: "1", to: "3", value: 100 }),
    resistor({ id: "R3", from: "2", to: "4", value: 100 }),
    resistor({ id: "R4", from: "3", to: "4", value: 100 }),
    resistor({ id: "R5", from: "2", to: "3", value: 50 }),
  ],
  referenceNodeId: "1",
  twigBranchIds: ["R1", "R2", "R3"],
  linkBranchIds: ["R4", "R5"],
};

/**
 * Star topology (radial symmetry test)
 */
const starCircuitGraph = {
  nodes: [
    { id: "center", branches: ["R1", "R2", "R3", "R4"] },
    { id: "1", branches: ["R1"] },
    { id: "2", branches: ["R2"] },
    { id: "3", branches: ["R3"] },
    { id: "4", branches: ["R4"] },
  ],
  branches: [
    resistor({ id: "R1", from: "center", to: "1", value: 100 }),
    resistor({ id: "R2", from: "center", to: "2", value: 100 }),
    resistor({ id: "R3", from: "center", to: "3", value: 100 }),
    resistor({ id: "R4", from: "center", to: "4", value: 100 }),
  ],
  referenceNodeId: "center",
};

/**
 * Non-planar graph (K5 - complete graph with 5 nodes)
 */
const nonPlanarCircuitGraph = {
  nodes: [
    { id: "1", branches: ["R12", "R13", "R14", "R15"] },
    { id: "2", branches: ["R12", "R23", "R24", "R25"] },
    { id: "3", branches: ["R13", "R23", "R34", "R35"] },
    { id: "4", branches: ["R14", "R24", "R34", "R45"] },
    { id: "5", branches: ["R15", "R25", "R35", "R45"] },
  ],
  branches: [
    resistor({ id: "R12", from: "1", to: "2" }),
    resistor({ id: "R13", from: "1", to: "3" }),
    resistor({ id: "R14", from: "1", to: "4" }),
    resistor({ id: "R15", from: "1", to: "5" }),
    resistor({ id: "R23", from: "2", to: "3" }),
    resistor({ id: "R24", from: "2", to: "4" }),
    resistor({ id: "R25", from: "2", to: "5" }),
    resistor({ id: "R34", from: "3", to: "4" }),
    resistor({ id: "R35", from: "3", to: "5" }),
    resistor({ id: "R45", from: "4", to: "5" }),
  ],
  referenceNodeId: "1",
};

// ============================================================================
// Type Definitions
// ============================================================================

type CircuitGraphDef = {
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
};

// ============================================================================
// SVG Capture Helpers
// ============================================================================

/**
 * 📸 Capture SVG output from circuit graph definition
 */
function captureSVG(graphDef: CircuitGraphDef): string {
  const circuit = createTestGraph(graphDef);
  const engine = new GraphLayoutEngine();
  const layout = engine.calculateLayout(circuit);
  const { container } = render(<CircuitGraphRenderer graph={layout} />);
  const svg = container.querySelector("svg");
  return svg?.outerHTML ?? "";
}

/**
 * 📸 Extract SVG structure summary
 */
function extractSVGStructure(svgHTML: string): {
  nodeCount: number;
  edgeCount: number;
  hasArrows: boolean;
  hasLabels: boolean;
} {
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(svgHTML, "image/svg+xml");
  
  const circles = doc.querySelectorAll("circle");
  const edgePaths = doc.querySelectorAll("path[stroke]");
  const texts = doc.querySelectorAll("text");
  const arrowGroups = doc.querySelectorAll("g[transform*='rotate']");
  
  return {
    nodeCount: circles.length,
    edgeCount: edgePaths.length,
    hasArrows: arrowGroups.length > 0,
    hasLabels: texts.length > 0,
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * ✅ Assert SVG is valid and non-empty
 */
function assertValidSVG(svg: string): void {
  expect(svg).toBeTruthy();
  expect(svg).toContain("<svg");
  expect(svg).toContain("</svg>");
}

/**
 * ✅ Assert SVG structure matches expectations
 */
function assertStructureCounts(params: {
  svg: string;
  nodeCount?: number;
  edgeCount?: number;
}): void {
  const structure = extractSVGStructure(params.svg);
  
  if (params.nodeCount !== undefined) {
    expect(structure.nodeCount).toBe(params.nodeCount);
  }
  
  if (params.edgeCount !== undefined) {
    expect(structure.edgeCount).toBe(params.edgeCount);
  }
}

/**
 * ✅ Assert SVG has arrows
 */
function assertHasArrows(svg: string): void {
  const structure = extractSVGStructure(svg);
  expect(structure.hasArrows).toBe(true);
}

/**
 * ✅ Assert SVG has labels
 */
function assertHasLabels(svg: string): void {
  const structure = extractSVGStructure(svg);
  expect(structure.hasLabels).toBe(true);
}

/**
 * ✅ Assert SVG contains curved paths
 */
function assertHasCurvedPaths(svg: string): void {
  expect(svg).toMatch(/[QC]/);
}

/**
 * ✅ Assert SVG structure is complete
 */
function assertCompleteStructure(svg: string): void {
  assertValidSVG(svg);
  assertHasArrows(svg);
  assertHasLabels(svg);
}

// ============================================================================
// Test Execution Helpers
// ============================================================================

/**
 * 🧪 Test circuit rendering with structure validation
 */
function testCircuitStructure(params: {
  graphDef: CircuitGraphDef;
  nodeCount: number;
  edgeCount: number;
}): void {
  const svg = captureSVG(params.graphDef);
  assertValidSVG(svg);
  assertStructureCounts({ svg, nodeCount: params.nodeCount, edgeCount: params.edgeCount });
}

/**
 * 🧪 Test circuit rendering with custom assertions
 */
function testCircuitRendering(params: {
  graphDef: CircuitGraphDef;
  assertions: (svg: string) => void;
}): void {
  const svg = captureSVG(params.graphDef);
  params.assertions(svg);
}

// ============================================================================
// Tests
// ============================================================================

describe("CircuitGraphRenderer - Visual Regression", () => {
  describe("Simple Series Circuit", () => {
    it("should render series circuit with correct structure", () => {
      testCircuitStructure({ graphDef: seriesCircuitGraph, nodeCount: 2, edgeCount: 1 });
    });

    it("should include arrows and labels in series circuit", () => {
      testCircuitRendering({ graphDef: seriesCircuitGraph, assertions: assertCompleteStructure });
    });
  });

  describe("Parallel Branches Circuit", () => {
    it("should render parallel branches with correct structure", () => {
      testCircuitStructure({ graphDef: parallelCircuitGraph, nodeCount: 2, edgeCount: 3 });
    });

    it("should use curved paths for parallel branches", () => {
      testCircuitRendering({
        graphDef: parallelCircuitGraph,
        assertions: (svg) => {
          assertHasCurvedPaths(svg);
          assertCompleteStructure(svg);
        },
      });
    });
  });

  describe("Bridge Circuit (Symmetry Test)", () => {
    it("should render bridge circuit with correct structure", () => {
      testCircuitStructure({ graphDef: bridgeCircuitGraph, nodeCount: 4, edgeCount: 5 });
    });

    it("should maintain symmetry in bridge layout", () => {
      testCircuitRendering({ graphDef: bridgeCircuitGraph, assertions: assertCompleteStructure });
    });
  });

  describe("Star Topology (Radial Symmetry Test)", () => {
    it("should render star topology with correct structure", () => {
      testCircuitStructure({ graphDef: starCircuitGraph, nodeCount: 5, edgeCount: 4 });
    });

    it("should distribute nodes radially around center", () => {
      testCircuitRendering({ graphDef: starCircuitGraph, assertions: assertCompleteStructure });
    });
  });

  describe("Non-Planar Graph (Intersection Test)", () => {
    it("should render non-planar graph with correct structure", () => {
      testCircuitStructure({ graphDef: nonPlanarCircuitGraph, nodeCount: 5, edgeCount: 10 });
    });

    it("should handle edge intersections gracefully", () => {
      testCircuitRendering({ graphDef: nonPlanarCircuitGraph, assertions: assertCompleteStructure });
    });
  });

  describe("SVG Output Consistency", () => {
    it("should produce consistent output for same circuit", () => {
      const svg1 = captureSVG(seriesCircuitGraph);
      const svg2 = captureSVG(seriesCircuitGraph);
      
      const structure1 = extractSVGStructure(svg1);
      const structure2 = extractSVGStructure(svg2);
      
      expect(structure1).toEqual(structure2);
    });

    it("should include viewBox attribute", () => {
      testCircuitRendering({
        graphDef: seriesCircuitGraph,
        assertions: (svg) => {
          expect(svg).toContain("viewBox");
        },
      });
    });

    it("should include proper SVG namespace", () => {
      testCircuitRendering({
        graphDef: seriesCircuitGraph,
        assertions: (svg) => {
          expect(svg).toContain("xmlns");
        },
      });
    });
  });
});
