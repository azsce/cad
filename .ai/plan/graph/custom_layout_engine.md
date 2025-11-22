# Custom Circuit Graph Layout Engine Plan

This document outlines the implementation plan for a custom `GraphLayoutEngine` to achieve strict, textbook-quality circuit graph visualizations using pure SVG.

## 1. Architecture Overview

We will bypass standard graphing libraries to implement a dedicated layout engine that strictly adheres to our visual specifications (symmetry, conditional curvature, arrow placement).

### Core Components

1.  **`GraphLayoutEngine` (Logic Layer)**
    - Input: `AnalysisGraph` (Topology)
    - Output: `RenderableGraph` (Geometry)
    - Responsibilities: Node placement, edge routing, intersection detection, label positioning.

2.  **`CircuitGraphRenderer` (Presentation Layer)**
    - Input: `RenderableGraph`
    - Output: SVG Elements
    - Responsibilities: Drawing paths, circles, arrows, and text based on calculated geometry.

## 2. Data Structures

```typescript
// Output of the layout engine, ready for rendering
interface RenderableGraph {
  width: number;
  height: number;
  nodes: RenderableNode[];
  edges: RenderableEdge[];
}

interface RenderableNode {
  id: string;
  x: number;
  y: number;
  label: string;
  labelPos: { x: number; y: number }; // Pre-calculated label position
}

interface RenderableEdge {
  id: string;
  sourceId: string;
  targetId: string;
  path: string; // SVG path data (d attribute)
  arrowPoint: { x: number; y: number; angle: number }; // Position and rotation for arrow
  label: string;
  labelPos: { x: number; y: number };
  isCurved: boolean;
}
```

## 3. Algorithmic Steps (`GraphLayoutEngine`)

The `calculateLayout` method will execute a multi-stage pipeline designed for determinism and aesthetic quality:

### Step 1: Node Placement (Hybrid Force-Grid Approach)

- **Goal**: Achieve a balanced, symmetric layout that feels "engineered" rather than random.
- **Phase A: Global Relaxation**:
  - Use a modified force-directed algorithm (e.g., d3-force) to untangle the graph.
  - _Constraint_: Apply strong "centering" forces and "link" forces that prefer specific lengths.
- **Phase B: Grid Snapping & Alignment (The "Textbook" Fix)**:
  - Quantize node positions to a coarse grid (e.g., 50px units).
  - **Alignment Pass**: Detect nodes that are "almost" aligned horizontally or vertically and snap them to the exact same axis.
  - **Symmetry Pass**: Detect isomorphic sub-graphs (e.g., parallel branches) and enforce mirror-image coordinates relative to a central axis.

### Step 2: Edge Routing (Path Scoring System)

- **Goal**: strictly adhere to "straight if possible, curve if blocked" with intelligent path selection.
- **Algorithm**:
  For each edge $(u, v)$:
  1.  **Generate Candidates**: Create a set of potential paths:
      - Path A: Direct Straight Line.
      - Path B: Low-arc Curve (CW).
      - Path C: Low-arc Curve (CCW).
      - Path D: High-arc Curve (for outer loops).
  2.  **Score Candidates**: Calculate a penalty score for each candidate:
      - _Intersection Penalty_: +1000 per intersection with a Node or existing Edge.
      - _Proximity Penalty_: +100 per pixel if too close to another element.
      - _Curvature Penalty_: +10 for being curved (bias towards straight).
      - _Symmetry Bonus_: -50 if this path mirrors a partner edge.
  3.  **Select Best**: Choose the candidate with the lowest score.

### Step 3: Arrow & Label Positioning (Simulated Annealing)

- **Arrows**:
  - Calculate exact point on path at $t=0.5$ (midpoint).
  - Derive tangent angle $\theta$ for rotation.
- **Label Optimization**:
  - Initial placement: Standard offset (e.g., 10px "above" the line).
  - **Collision Resolution**:
    - Check for overlaps with other labels, edges, or nodes.
    - If overlap detected: Try alternative positions (Below, Start-Third, End-Third).
    - Select the position with zero overlaps and minimum distance from the parent edge.

## 4. Implementation Strategy

### Phase 1: Core Engine & Renderer Skeleton

- Setup `GraphLayoutEngine` class structure.
- Implement `CircuitGraphRenderer` with basic SVG support (Zoom/Pan wrapper).
- **Deliverable**: A canvas that renders hardcoded nodes/edges correctly.

### Phase 2: The "Grid-Snap" Layout

- Implement the Force-Directed + Grid Snap logic.
- Implement the "Alignment Pass" to straighten out wobbly lines.
- **Deliverable**: Nodes arrange themselves in a clean, grid-aligned structure.

### Phase 3: Intelligent Routing

- Implement the **Path Scoring System**.
- Implement geometric intersection math (Line-Line, Line-Circle, Bezier-Line).
- **Deliverable**: Edges automatically curve around obstacles and choose the cleanest path.

### Phase 4: Polish & Typography

- Implement Label Optimization.
- Add visual styling (Arrowheads, specific fonts, colors).
- **Deliverable**: Final textbook-quality graph.

## 5. Directory Structure & File Mapping

The new graph engine will be self-contained within `src/components/AnalysisPane/CircuitGraphEngine/`.

### Directory Layout

```text
src/components/AnalysisPane/CircuitGraphEngine/
├── index.tsx                  # Main entry point (exports CircuitGraphRenderer)
├── CircuitGraphRenderer.tsx   # React component (Presentation Layer)
├── types.ts                   # RenderableGraph, RenderableNode, RenderableEdge definitions
├── engine/
│   ├── GraphLayoutEngine.ts   # Main class orchestrating the layout pipeline
│   ├── NodePlacer.ts          # Step 1: Hybrid Force-Grid logic
│   ├── EdgeRouter.ts          # Step 2: Path Scoring & Bezier logic
│   └── LabelOptimizer.ts      # Step 3: Collision resolution for labels
└── utils/
    ├── geometry.ts            # Vector math, intersection checks, Bezier math
    └── symmetry.ts            # Isomorphism detection & axis alignment helpers
```

### File Responsibilities

1.  **`types.ts`**:
    - Defines the contract between the Logic Layer (`engine/`) and Presentation Layer (`CircuitGraphRenderer.tsx`).
    - Contains `RenderableGraph`, `RenderableNode`, `RenderableEdge`.

2.  **`engine/GraphLayoutEngine.ts`**:
    - Facade class that takes `AnalysisGraph` and returns `RenderableGraph`.
    - Calls `NodePlacer`, `EdgeRouter`, and `LabelOptimizer` in sequence.

3.  **`engine/NodePlacer.ts`**:
    - Implements the "Hybrid Force-Grid" algorithm.
    - Handles the "Alignment Pass" and "Symmetry Pass".

4.  **`engine/EdgeRouter.ts`**:
    - Implements the "Path Scoring System".
    - Decides between straight lines and curves.

5.  **`utils/geometry.ts`**:
    - Pure functions for geometric calculations (e.g., `getLineIntersection`, `getBezierPoint`, `getTangentAngle`).

6.  **`CircuitGraphRenderer.tsx`**:
    - Pure React component.
    - Renders `<svg>` based on the `RenderableGraph` prop.
    - Handles user interactions (clicks) and forwards them.

### Integration Plan

1.  **Create Directory**: Initialize the folder structure above.
2.  **Implement Utils**: Start with `geometry.ts` as it has no dependencies.
3.  **Implement Engine**: Build the `engine/` modules bottom-up.
4.  **Implement Renderer**: Build the React component to visualize the engine's output.
5.  **Switch Over**: In `AnalysisPane.tsx`, update the import to point to `CircuitGraphEngine/index.tsx`.

## 6. Technology Stack

- **Language**: TypeScript
- **Rendering**: React + SVG (No external graph libraries)
- **Math**: `mathjs` (already in project) or simple custom vector math utils.
