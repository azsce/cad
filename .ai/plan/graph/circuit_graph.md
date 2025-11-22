# Circuit Graph Representation

This document defines the general rules for converting any electric circuit into its equivalent graph representation and the visual specifications for rendering that graph.

## 1. Circuit-to-Graph Conversion Rules

The equivalent graph is derived from the circuit diagram using the following topological mappings:

### Nodes

- **Circuit Junctions $\to$ Graph Nodes**: Every distinct junction point (node) in the electric circuit where two or more components meet is represented as a single node in the graph.
- **Labeling**: Nodes are identified by unique indices or labels (e.g., 1, 2, 3... or A, B, C...).

### Edges (Branches)

Edges in the graph represent the path for current flow through circuit components.

1.  **Passive Elements (Resistors, Inductors, Capacitors)**:
    - Replaced by a **single undirected edge** connecting the two corresponding nodes.
    - The physical component is topologically treated as a short circuit (a closed path).

2.  **Voltage Sources**:
    - Replaced by a **single edge** (short circuit equivalent in topology) connecting the two corresponding nodes.
    - Maintains the connectivity between the positive and negative terminals.

3.  **Current Sources**:
    - Replaced by an **open circuit**.
    - **Rule**: The branch containing the current source is **removed** from the graph entirely. No edge is drawn for ideal current sources.

### Summary of Mapping

| Circuit Element       | Graph Representation | Topological Action         |
| :-------------------- | :------------------- | :------------------------- |
| **Junction / Node**   | **Node**             | Preserve as vertex.        |
| **Passive Component** | **Edge**             | Replace with line segment. |
| **Voltage Source**    | **Edge**             | Replace with line segment. |
| **Current Source**    | **None**             | Remove (Open Circuit).     |

#### Conversion Legend

```text
[Circuit]                 [Graph]

   R1
--(====)--      --->      -------
                          (Edge)

   V1
---( + )---     --->      -------
                          (Edge)

   I1
---( ^ )---     --->      ( ) ( )
                          (Open)
```

---

## 2. Visual Specifications

To ensure a clean, textbook-quality representation, the graph must be rendered according to the following style guide.

### Graph Structure & Layout

- **Intelligent Pre-calculation**: The system must not simply render the first valid layout. Instead, it should perform an optimization step before committing:
  - **Calculate**: Generate multiple potential node arrangements and edge routing strategies.
  - **Evaluate**: Score each configuration based on key metrics: minimal intersections, maximum edge spacing, and symmetry.
  - **Select**: Choose the "best" organization that maximizes clarity and minimizes visual noise.
- **Dynamic Node Spacing**:
  - Do not adhere to a rigid, fixed-size grid.
  - **Expand**: Automatically increase the distance between nodes if the area between them becomes too crowded with branches or labels.
  - **Goal**: Ensure every branch has clear "breathing room" and is distinct from its neighbors.
- **Planarity**: Where possible, arrange nodes to avoid edge intersections (planar embedding).

#### Layout Legend

```text
Bad Spacing:      Good Spacing:

  a                    a
(1)--(2)          (1)-----(2)
  b                    b
(Crowded)         (Breathing Room)
```

### Symmetry Specifications

- **Axis Alignment**:
  - **Vertical/Horizontal Symmetry**: If the circuit topology allows (e.g., bridges, ladders, lattices), nodes should be aligned relative to a central vertical or horizontal axis.
  - **Mirroring**: Isomorphic sub-circuits should be rendered as mirror images of each other.
- **Geometric Centering**:
  - The graph should be visually centered within the viewport.
  - Central nodes (those with high degree of connectivity) should be placed near the geometric center of the layout.
- **Uniform Distribution**:
  - **Radial Symmetry**: For nodes with multiple radiating branches (star topology), branches should be distributed with equal angular spacing where possible.
  - **Edge Lengths**: Edges of similar topological significance (e.g., parallel branches) should be rendered with similar lengths to maintain visual harmony.

#### Symmetry Legend

```text
   Radial Symmetry       Axis Alignment
      (Star)                (Bridge)

         |                   |
    \    |    /         .----.----.
     \   |   /          |    |    |
      \  |  /           |    |    |
   ----( N )----        .----.----.
      /  |  \                |
     /   |   \
    /    |    \
```

### Node Styling

- **Geometry**: Nodes are rendered as **very tiny, filled circles (dots)**.
- **Labels**:
  - Every node must be labeled with its unique ID.
  - **Position**: Labels should be placed in close proximity to the node but offset to avoid overlapping with any connected edges.

#### Node Legend

```text
      1
      .  <-- Tiny Dot Node with Label "1"
```

### Edge (Branch) Styling

- **Line Style**: Edges are drawn as solid, continuous lines.
- **Curvature & Routing**:
  - **Straight Preference**: The default for any connection is a straight line.
  - **Conditional Curves**: Semi-circle or curved edges are **only allowed** if the direct straight path between two nodes is already occupied by another branch or node.
  - **Smart Path Selection**: When a curve is necessary, the algorithm must choose the **cleanest, traffic-free path**.
    - _Avoid_: Do not route curves through areas already occupied by other branches or nodes.
    - _Optimize_: If routing "above" causes an intersection but routing "below" is clear, choose "below".
- **Directional Arrows**:
  - **Placement**: Arrows must be drawn **on the body of the edge** (e.g., at the midpoint), _not_ at the endpoints/tips.
  - **Meaning**: Indicates the assumed positive direction of current flow for analysis.
  - **Style**: A simple arrowhead superimposed on the line.
- **Labeling**:
  - **Content**: Each edge is labeled with a unique Branch ID (e.g., a, b, c...).
  - **Positioning**: Labels must be placed intelligently near the edge (above, below, or to the side) to associate clearly with the specific branch without ambiguity.

#### Edge Legend

```text
Straight:   (1)-------(2)
                 a

Curved:        b
            .-----.
           /       \
        (1)         (2)

Arrow:      .--->--.
            (Mid-body)
```

### Advanced Edge Cases & Typography

- **Parallel Edges**:
  - If multiple branches connect the same two nodes (parallel connection), they must be rendered as symmetric curves bowing outward from the straight line connecting the nodes.
  - **Spacing**: Ensure sufficient gap between parallel curves to accommodate labels and arrows.
- **Unavoidable Intersections**:
  - In non-planar graphs where edge crossing is inevitable, the intersection must be rendered as a simple cross **without** a node dot.
  - **Clarity**: Ensure the intersection angle is close to 90 degrees if possible, avoiding shallow angles that might be confused with merging paths.
- **Typography**:
  - **Font**: Use a clean, high-contrast sans-serif or monospaced font for all labels.
  - **Size Hierarchy**: Node labels (IDs) should be slightly smaller or visually distinct (e.g., different color or weight) from Branch labels to prevent confusion.

#### Edge Cases Legend

```text
Parallel Edges:        Intersection (No Node):

       a
    .--->--.                 |
   /        \                |
(1)          (2)        -----|-----
   \        /                |
    `--->--'                 |
       b
```

### Visual Legend

```text
      (Branch Label)
           a
      .<-------.          <-- Curved Edge (Chosen because straight path is busy)
     /          \
    /            \
   (N1)--------(N2)       <-- Straight Edge (Occupies direct path)
          b
```

- **(N1), (N2)**: Node Labels (Tiny dots)
- **a, b**: Branch Labels
- **<, >**: Directional Arrows on the line

## Type Definitions

The following TypeScript types define the data structure used to represent the circuit graph:

```typescript
/**
 * Branded type for electrical node IDs.
 */
export type NodeId = string & { readonly __brand: "NodeId" };

/**
 * Branded type for branch IDs.
 */
export type BranchId = string & { readonly __brand: "BranchId" };

/**
 * Branded type for spanning tree IDs.
 */
export type TreeId = string & { readonly __brand: "TreeId" };

/**
 * An electrical node in the circuit graph.
 * Represents a unique connection point where multiple branches meet.
 */
export interface ElectricalNode {
  /** Unique identifier for the node */
  id: NodeId;
  /** IDs of all branches connected to this node */
  connectedBranchIds: BranchId[];
}

/**
 * A branch in the circuit graph.
 * Represents a single electrical component with its connections.
 */
export interface Branch {
  /** Unique identifier for the branch */
  id: BranchId;
  /** Type of electrical component */
  type: "resistor" | "voltageSource" | "currentSource";
  /** Component value (resistance in Ω, voltage in V, current in A) */
  value: number;
  /** ID of the node at the start of the branch */
  fromNodeId: NodeId;
  /** ID of the node at the end of the branch */
  toNodeId: NodeId;
}

/**
 * A spanning tree of the circuit graph.
 * Used for loop analysis (tie-set method).
 */
export interface SpanningTree {
  /** Unique identifier for this spanning tree */
  id: TreeId;
  /** Branch IDs that form the tree (twigs) */
  twigBranchIds: BranchId[];
  /** Branch IDs not in the tree (links/co-tree) */
  linkBranchIds: BranchId[];
  /** Optional human-readable description */
  description?: string;
}

/**
 * Pure graph representation of the circuit for analysis.
 * Transforms the UI circuit model into a mathematical graph structure.
 */
export interface AnalysisGraph {
  /** All electrical nodes in the graph */
  nodes: ElectricalNode[];
  /** All branches (components) in the graph */
  branches: Branch[];
  /** ID of the reference (ground) node */
  referenceNodeId: NodeId;
  /** All possible spanning trees for this graph */
  allSpanningTrees: SpanningTree[];
  /** ID of the currently selected spanning tree for analysis */
  selectedTreeId: TreeId;
}
```

## Implementation Plan

For the detailed implementation strategy of the custom layout engine and SVG renderer required to meet these specifications, please refer to:

**[Custom Circuit Graph Layout Engine Plan](./custom_layout_engine.md)**
