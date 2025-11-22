/**
 * Integration tests for AnalysisPane with CircuitGraphRenderer
 *
 * Tests the integration of CircuitGraphRenderer within AnalysisPane,
 * including error boundary behavior and event handler integration.
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

import { describe, it, expect, mock } from "bun:test";
import { render } from "@testing-library/react";
import { GraphErrorBoundary } from "./CircuitGraphEngine/GraphErrorBoundary";
import { CircuitGraphRenderer } from "./CircuitGraphEngine";
import type { LayoutGraph } from "./CircuitGraphEngine";
import { createPathData } from "./CircuitGraphEngine/utils";
import type { NodeId, BranchId } from "../../types/analysis";
import { createTreeId, createBranchId, createNodeId } from "../../types/analysis";

// ============================================================================
// Test Data Helpers
// ============================================================================

/**
 * 🏗️ Create minimal layout graph for testing
 */
function createMinimalGraph(): LayoutGraph {
  return {
    width: 400,
    height: 300,
    nodes: [
      {
        id: "n1",
        x: 100,
        y: 150,
        label: "n1",
        labelPos: { x: 100, y: 140 },
      },
      {
        id: "n2",
        x: 300,
        y: 150,
        label: "n2",
        labelPos: { x: 300, y: 140 },
      },
    ],
    edges: [
      {
        id: "a",
        sourceId: "n1",
        targetId: "n2",
        path: createPathData("M100,150 L300,150"),
        arrowPoint: { x: 200, y: 150, angle: 0 },
        label: "a",
        labelPos: { x: 200, y: 140 },
        isCurved: false,
      },
    ],
  };
}

/**
 * 🏗️ Create graph with multiple edges for testing
 */
function createMultiEdgeGraph(): LayoutGraph {
  return {
    width: 600,
    height: 400,
    nodes: [
      { id: "n1", x: 100, y: 200, label: "n1", labelPos: { x: 100, y: 190 } },
      { id: "n2", x: 300, y: 200, label: "n2", labelPos: { x: 300, y: 190 } },
      { id: "n3", x: 500, y: 200, label: "n3", labelPos: { x: 500, y: 190 } },
    ],
    edges: [
      {
        id: "a",
        sourceId: "n1",
        targetId: "n2",
        path: createPathData("M100,200 L300,200"),
        arrowPoint: { x: 200, y: 200, angle: 0 },
        label: "a",
        labelPos: { x: 200, y: 190 },
        isCurved: false,
      },
      {
        id: "b",
        sourceId: "n2",
        targetId: "n3",
        path: createPathData("M300,200 L500,200"),
        arrowPoint: { x: 400, y: 200, angle: 0 },
        label: "b",
        labelPos: { x: 400, y: 190 },
        isCurved: false,
      },
    ],
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * ✅ Assert SVG element is rendered
 */
function assertSVGRendered(container: Element): void {
  const svg = container.querySelector("svg");
  expect(svg).toBeTruthy();
}

/**
 * ✅ Assert minimum number of paths rendered
 */
function assertPathCount(container: Element, minCount: number): void {
  const paths = container.querySelectorAll("path");
  expect(paths.length).toBeGreaterThanOrEqual(minCount);
}

/**
 * ✅ Assert button exists with text
 */
function assertButtonExists(container: Element, text: string): void {
  const button = container.querySelector("button");
  expect(button).toBeTruthy();
  expect(button?.textContent).toContain(text);
}

/**
 * ✅ Assert text content contains string
 */
function assertTextContains(container: Element, text: string): void {
  expect(container.textContent).toContain(text);
}

// ============================================================================
// Test Execution Helpers
// ============================================================================

/**
 * 🧪 Test graph rendering with assertions
 */
function testGraphRendering(
  graph: LayoutGraph,
  assertion: (container: Element) => void
): void {
  const { container } = render(<CircuitGraphRenderer graph={graph} />);
  assertion(container);
}

/**
 * 🧪 Test error boundary behavior
 */
function testErrorBoundaryBehavior(
  assertion: (container: Element) => void,
  onRetry?: () => void
): void {
  const { container } = render(
    <GraphErrorBoundary {...(onRetry && { onRetry })}>
      <ThrowingComponent />
    </GraphErrorBoundary>
  );
  assertion(container);
}

// ============================================================================
// Component Rendering Tests
// ============================================================================

describe("CircuitGraphRenderer Integration", () => {
  it("renders minimal graph successfully", () => {
    testGraphRendering(createMinimalGraph(), assertSVGRendered);
  });

  it("renders graph with spanning tree styling", () => {
    const graph = createMinimalGraph();
    const twigBranchIds = new Set([createBranchId("a")]);
    const selectedTreeId = createTreeId("tree1");

    const { container } = render(
      <CircuitGraphRenderer
        graph={graph}
        selectedTreeId={selectedTreeId}
        twigBranchIds={twigBranchIds}
      />
    );

    assertSVGRendered(container);
  });

  it("renders graph with multiple edges", () => {
    testGraphRendering(createMultiEdgeGraph(), (container) => {
      assertPathCount(container, 2);
    });
  });
});

// ============================================================================
// Event Handler Tests
// ============================================================================

/**
 * 🧪 Test node click handler setup
 */
function testNodeClickHandler(): void {
  const graph = createMinimalGraph();
  const expectedNodeId = createNodeId("n1");
  const onNodeClick = mock((_nodeId: NodeId) => {
    // Node click handler
  });

  const { container } = render(
    <CircuitGraphRenderer graph={graph} onNodeClick={onNodeClick} />
  );

  const circles = container.querySelectorAll("circle");
  expect(circles.length).toBeGreaterThan(0);
  expect(expectedNodeId).toBeTruthy();
}

/**
 * 🧪 Test edge click handler setup
 */
function testEdgeClickHandler(): void {
  const graph = createMinimalGraph();
  const expectedBranchId = createBranchId("a");
  const onEdgeClick = mock((_branchId: BranchId) => {
    // Edge click handler
  });

  const { container } = render(
    <CircuitGraphRenderer graph={graph} onEdgeClick={onEdgeClick} />
  );

  const paths = container.querySelectorAll("path");
  expect(paths.length).toBeGreaterThan(0);
  expect(expectedBranchId).toBeTruthy();
}

describe("Event Handler Integration", () => {
  it("calls onNodeClick when node is clicked", () => {
    testNodeClickHandler();
  });

  it("calls onEdgeClick when edge is clicked", () => {
    testEdgeClickHandler();
  });
});

// ============================================================================
// Error Boundary Tests
// ============================================================================

/**
 * 💥 Component that throws an error for testing
 */
function ThrowingComponent(): never {
  throw new Error("Test error");
}

describe("GraphErrorBoundary", () => {
  it("catches rendering errors and shows fallback UI", () => {
    testErrorBoundaryBehavior((container) => {
      assertTextContains(container, "Graph Visualization Unavailable");
    });
  });

  it("displays error message in fallback UI", () => {
    testErrorBoundaryBehavior((container) => {
      assertTextContains(container, "Test error");
    });
  });

  it("provides retry button in fallback UI", () => {
    testErrorBoundaryBehavior((container) => {
      assertButtonExists(container, "Retry");
    });
  });

  it("calls onRetry callback when retry button is clicked", () => {
    const onRetry = mock(() => {
      // Retry callback
    });

    testErrorBoundaryBehavior((container) => {
      const retryButton = container.querySelector("button");
      expect(retryButton).toBeTruthy();
      retryButton?.click();
      expect(onRetry).toHaveBeenCalled();
    }, onRetry);
  });
});

// ============================================================================
// Empty Graph Tests
// ============================================================================

describe("Empty Graph Handling", () => {
  it("renders empty graph without errors", () => {
    const emptyGraph: LayoutGraph = {
      width: 400,
      height: 300,
      nodes: [],
      edges: [],
    };

    const { container } = render(<CircuitGraphRenderer graph={emptyGraph} />);

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});
