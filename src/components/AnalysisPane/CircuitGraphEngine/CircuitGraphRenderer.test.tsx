/**
 * Unit tests for CircuitGraphRenderer component
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
import type { LayoutGraph, LayoutNode, LayoutEdge } from "./types";
import { createPathData } from "./utils";
import { createBranchId, type NodeId, type BranchId } from "../../../types/analysis";

// Helper to create layout node
function createLayoutNode(params: {
  id: string;
  x: number;
  y: number;
  label: string;
}): LayoutNode {
  return {
    id: params.id,
    x: params.x,
    y: params.y,
    label: params.label,
    labelPos: { x: params.x, y: params.y - 15 },
  };
}

// Helper to create layout edge
function createLayoutEdge(params: {
  id: string;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}): LayoutEdge {
  const midX = (params.x1 + params.x2) / 2;
  const midY = (params.y1 + params.y2) / 2;
  const angle = Math.atan2(params.y2 - params.y1, params.x2 - params.x1);
  
  const pathString = `M ${params.x1.toString()} ${params.y1.toString()} L ${params.x2.toString()} ${params.y2.toString()}`;
  
  return {
    id: params.id,
    sourceId: params.sourceId,
    targetId: params.targetId,
    path: createPathData(pathString),
    arrowPoint: { x: midX, y: midY, angle },
    label: params.label,
    labelPos: { x: midX, y: midY - 15 },
    isCurved: false,
  };
}

// Helper to create empty graph
function createEmptyGraph(): LayoutGraph {
  return { width: 400, height: 300, nodes: [], edges: [] };
}

// Helper to create graph with nodes
function createGraphWithNodes(nodes: LayoutNode[]): LayoutGraph {
  return { width: 400, height: 300, nodes, edges: [] };
}

// Helper to create graph with edges
function createGraphWithEdges(edges: LayoutEdge[]): LayoutGraph {
  return { width: 400, height: 300, nodes: [], edges };
}

// Helper to create complete graph
function createCompleteGraph(nodes: LayoutNode[], edges: LayoutEdge[]): LayoutGraph {
  return { width: 400, height: 300, nodes, edges };
}

// Helper to render graph component
function renderGraph(
  graph: LayoutGraph,
  options?: {
    twigBranchIds?: Set<BranchId>;
    intersections?: Array<{ x: number; y: number }>;
    onNodeClick?: (nodeId: NodeId) => void;
    onEdgeClick?: (edgeId: BranchId) => void;
  }
) {
  const props: {
    graph: LayoutGraph;
    twigBranchIds?: Set<BranchId>;
    intersections?: Array<{ x: number; y: number }>;
    onNodeClick?: (nodeId: NodeId) => void;
    onEdgeClick?: (edgeId: BranchId) => void;
  } = { graph };
  
  if (options?.twigBranchIds !== undefined) {
    props.twigBranchIds = options.twigBranchIds;
  }
  if (options?.intersections !== undefined) {
    props.intersections = options.intersections;
  }
  if (options?.onNodeClick !== undefined) {
    props.onNodeClick = options.onNodeClick;
  }
  if (options?.onEdgeClick !== undefined) {
    props.onEdgeClick = options.onEdgeClick;
  }
  
  return render(<CircuitGraphRenderer {...props} />);
}

// Helper to find element by attribute
function findElementByAttribute<T extends Element>(
  elements: NodeListOf<T>,
  attribute: string,
  value: string
): T | undefined {
  return Array.from(elements).find((el) => el.getAttribute(attribute) === value);
}

// Helper to find element by text content
function findElementByText<T extends Element>(
  elements: NodeListOf<T>,
  text: string
): T | undefined {
  return Array.from(elements).find((el) => el.textContent === text);
}

// Helper to assert SVG attribute
function assertSvgAttribute(
  element: Element | null | undefined,
  attribute: string,
  expected: string
): void {
  expect(element).toBeDefined();
  expect(element?.getAttribute(attribute)).toBe(expected);
}

// Helper to assert element count
function assertElementCount<T extends Element>(
  elements: NodeListOf<T>,
  expected: number
): void {
  expect(elements.length).toBe(expected);
}

// Helper to assert element exists
function assertElementExists(element: Element | null | undefined): void {
  expect(element).toBeDefined();
}

// Helper to assert minimum element count
function assertMinElementCount<T extends Element>(
  elements: NodeListOf<T>,
  minimum: number
): void {
  expect(elements.length).toBeGreaterThanOrEqual(minimum);
}

// Helper to assert element has transform
function assertHasTransform(
  elements: NodeListOf<Element>,
  transformSubstring: string
): void {
  const found = Array.from(elements).some((el) =>
    el.getAttribute("transform")?.includes(transformSubstring)
  );
  expect(found).toBe(true);
}

// Helper to test edge path rendering
function testEdgePathRendering(params: {
  graph: LayoutGraph;
  pathData: string;
  assertions: Array<{ attribute: string; value: string }>;
  options?: {
    twigBranchIds?: Set<BranchId>;
  };
}): void {
  const { container } = renderGraph(params.graph, params.options);
  const paths = container.querySelectorAll("path");
  const edgePath = findElementByAttribute(paths, "d", params.pathData);
  
  for (const assertion of params.assertions) {
    assertSvgAttribute(edgePath, assertion.attribute, assertion.value);
  }
}

// Helper to test click handler
function testClickHandler(params: {
  graph: LayoutGraph;
  renderOptions: {
    onNodeClick?: (id: NodeId) => void;
    onEdgeClick?: (id: BranchId) => void;
  };
  findElement: (container: HTMLElement) => Element | null | undefined;
  expectedId: string;
}): void {
  let clickedId = "";
  
  const options = params.renderOptions.onNodeClick
    ? { onNodeClick: (id: NodeId) => { clickedId = id; } }
    : { onEdgeClick: (id: BranchId) => { clickedId = id; } };
  
  const { container } = renderGraph(params.graph, options);
  const element = params.findElement(container);
  
  element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(clickedId).toBe(params.expectedId);
}

// Common test data
const singleNode = createLayoutNode({ id: "node1", x: 100, y: 150, label: "1" });
const horizontalEdge = createLayoutEdge({
  id: "edge1",
  sourceId: "node1",
  targetId: "node2",
  x1: 100,
  y1: 150,
  x2: 300,
  y2: 150,
  label: "a",
});

describe("CircuitGraphRenderer", () => {
  describe("rendering with minimal graph", () => {
    it("should render empty graph without errors", () => {
      const { container } = renderGraph(createEmptyGraph());
      const svg = container.querySelector("svg");
      assertElementExists(svg);
      assertSvgAttribute(svg, "viewBox", "-50 -50 500 400");
    });

    it("should render single node", () => {
      const graph = createGraphWithNodes([singleNode]);
      const { container } = renderGraph(graph);
      const circles = container.querySelectorAll("circle");
      
      assertElementCount(circles, 1);
      assertSvgAttribute(circles[0], "cx", "100");
      assertSvgAttribute(circles[0], "cy", "150");
      assertSvgAttribute(circles[0], "r", "3");
    });

    it("should render node labels", () => {
      const graph = createGraphWithNodes([singleNode]);
      const { container } = renderGraph(graph);
      const texts = container.querySelectorAll("text");
      const nodeLabel = findElementByText(texts, "1");
      
      assertElementExists(nodeLabel);
      assertSvgAttribute(nodeLabel, "x", "100");
      assertSvgAttribute(nodeLabel, "y", "135");
    });
  });

  describe("edge rendering", () => {
    it("should render edges as SVG paths", () => {
      const node1 = createLayoutNode({ id: "node1", x: 100, y: 150, label: "1" });
      const node2 = createLayoutNode({ id: "node2", x: 300, y: 150, label: "2" });
      const graph = createCompleteGraph([node1, node2], [horizontalEdge]);
      const { container } = renderGraph(graph);
      const paths = container.querySelectorAll("path");
      const edgePath = findElementByAttribute(paths, "d", "M 100 150 L 300 150");
      
      assertElementExists(edgePath);
      assertSvgAttribute(edgePath, "stroke", "#000000");
      assertSvgAttribute(edgePath, "stroke-width", "2");
    });

    it("should render edge labels", () => {
      const graph = createGraphWithEdges([horizontalEdge]);
      const { container } = renderGraph(graph);
      const texts = container.querySelectorAll("text");
      const edgeLabel = findElementByText(texts, "a");
      
      assertElementExists(edgeLabel);
      assertSvgAttribute(edgeLabel, "x", "200");
      assertSvgAttribute(edgeLabel, "y", "135");
      assertSvgAttribute(edgeLabel, "font-size", "14");
    });

    it("should render arrows on edges", () => {
      const graph = createGraphWithEdges([horizontalEdge]);
      const { container } = renderGraph(graph);
      const groups = container.querySelectorAll("g");
      
      assertHasTransform(groups, "translate(200, 150)");
    });
  });

  describe("spanning tree styling", () => {
    it("should render twigs with solid stroke", () => {
      const twigBranchIds = new Set([createBranchId("edge1")]);
      testEdgePathRendering({
        graph: createGraphWithEdges([horizontalEdge]),
        pathData: "M 100 150 L 300 150",
        assertions: [{ attribute: "stroke-dasharray", value: "none" }],
        options: { twigBranchIds },
      });
    });

    it("should render links with dashed stroke", () => {
      const twigBranchIds = new Set([createBranchId("edge2")]);
      testEdgePathRendering({
        graph: createGraphWithEdges([horizontalEdge]),
        pathData: "M 100 150 L 300 150",
        assertions: [{ attribute: "stroke-dasharray", value: "5,5" }],
        options: { twigBranchIds },
      });
    });

    it("should render all edges as solid when no spanning tree selected", () => {
      testEdgePathRendering({
        graph: createGraphWithEdges([horizontalEdge]),
        pathData: "M 100 150 L 300 150",
        assertions: [{ attribute: "stroke-dasharray", value: "none" }],
      });
    });
  });

  describe("edge intersections", () => {
    it("should render intersection crosses", () => {
      const intersections = [{ x: 200, y: 150 }, { x: 250, y: 200 }];
      const { container } = renderGraph(createEmptyGraph(), { intersections });
      const groups = container.querySelectorAll("g");
      
      assertHasTransform(groups, "translate(200, 150)");
      
      const lines = container.querySelectorAll("line");
      assertMinElementCount(lines, 4);
    });
  });

  describe("click handlers", () => {
    it("should call onNodeClick when node is clicked", () => {
      testClickHandler({
        graph: createGraphWithNodes([singleNode]),
        renderOptions: { onNodeClick: (_id: NodeId) => {} },
        findElement: (container) => container.querySelector("circle"),
        expectedId: "node1",
      });
    });

    it("should call onEdgeClick when edge is clicked", () => {
      testClickHandler({
        graph: createGraphWithEdges([horizontalEdge]),
        renderOptions: { onEdgeClick: (_id: BranchId) => {} },
        findElement: (container) => {
          const paths = container.querySelectorAll("path");
          return findElementByAttribute(paths, "d", "M 100 150 L 300 150");
        },
        expectedId: "edge1",
      });
    });
  });

  describe("SVG structure", () => {
    it("should have correct viewBox with padding", () => {
      const { container } = renderGraph(createEmptyGraph());
      const svg = container.querySelector("svg");
      
      assertSvgAttribute(svg, "viewBox", "-50 -50 500 400");
    });

    it("should render arrows as inline path elements", () => {
      const nodes = [
        createLayoutNode({ id: "node1", x: 100, y: 200, label: "1" }),
        createLayoutNode({ id: "node2", x: 300, y: 200, label: "2" }),
      ];
      const edges = [
        createLayoutEdge({
          id: "edge1",
          sourceId: "node1",
          targetId: "node2",
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 200,
          label: "a",
        }),
      ];
      const graph = createCompleteGraph(nodes, edges);
      const { container } = renderGraph(graph);
      
      // Arrows are rendered as <g> elements with transform and contain a path
      const groups = container.querySelectorAll("g");
      const arrowGroups = Array.from(groups).filter((g) =>
        g.getAttribute("transform")?.includes("translate") && 
        g.getAttribute("transform")?.includes("rotate")
      );
      
      expect(arrowGroups.length).toBe(1);
      
      // Each arrow group should contain a path element
      const arrowPath = arrowGroups[0]?.querySelector("path");
      assertElementExists(arrowPath);
    });
  });

  describe("complex graph", () => {
    it("should render complete graph with nodes, edges, labels, and arrows", () => {
      const nodes = [
        createLayoutNode({ id: "node1", x: 100, y: 200, label: "1" }),
        createLayoutNode({ id: "node2", x: 300, y: 200, label: "2" }),
        createLayoutNode({ id: "node3", x: 500, y: 200, label: "3" }),
      ];
      const edges = [
        createLayoutEdge({
          id: "edge1",
          sourceId: "node1",
          targetId: "node2",
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 200,
          label: "a",
        }),
        createLayoutEdge({
          id: "edge2",
          sourceId: "node2",
          targetId: "node3",
          x1: 300,
          y1: 200,
          x2: 500,
          y2: 200,
          label: "b",
        }),
      ];
      const graph = createCompleteGraph(nodes, edges);
      const { container } = renderGraph(graph);
      
      const circles = container.querySelectorAll("circle");
      assertElementCount(circles, 3);
      
      // Check edge paths (not arrow paths)
      // Edge paths have stroke attribute, arrow paths don't
      const paths = container.querySelectorAll("path");
      const edgePaths = Array.from(paths).filter((p) => p.hasAttribute("stroke"));
      expect(edgePaths.length).toBe(2);
      
      const texts = container.querySelectorAll("text");
      assertMinElementCount(texts, 5);
      
      const groups = container.querySelectorAll("g");
      const arrowGroups = Array.from(groups).filter((g) =>
        g.getAttribute("transform")?.includes("translate")
      );
      expect(arrowGroups.length).toBeGreaterThanOrEqual(2);
    });
  });
});
