# Requirements Document

## Introduction

This feature implements a custom circuit graph visualization engine that transforms electrical circuits into mathematically accurate graph representations with textbook-quality rendering. The system converts circuit topology (junctions, components, connections) into a pure graph structure (nodes, edges) and renders it using intelligent layout algorithms that prioritize clarity, symmetry, and minimal visual clutter. The visualization supports circuit analysis by providing clear, unambiguous representations of circuit topology with proper labeling, directional indicators, and optimized spatial arrangement.

## Reference Documents

This requirements document is based on the following planning documents:

- #[[file:.ai/plan/graph/circuit_graph.md]] - Defines circuit-to-graph conversion rules and visual specifications
- #[[file:.ai/plan/graph/custom_layout_engine.md]] - Outlines the custom layout engine architecture and algorithms

These documents MUST be consulted during the design and implementation phases to ensure all specifications are met.

## Glossary

- **AnalysisGraph**: Pure mathematical graph representation of an electrical circuit containing nodes, branches, reference node, and spanning trees
- **ElectricalNode**: A connection point in the circuit where multiple branches meet, represented as a vertex in the graph
- **Branch**: An electrical component (resistor, voltage source, current source) represented as an edge in the graph
- **RenderableGraph**: Geometric representation of the graph with calculated positions, paths, and visual properties ready for SVG rendering
- **GraphLayoutEngine**: The algorithmic system that transforms topology into optimized geometry
- **NodePlacer**: Component responsible for calculating optimal node positions using hybrid force-grid algorithms
- **EdgeRouter**: Component responsible for calculating optimal edge paths with intelligent curve selection
- **LabelOptimizer**: Component responsible for positioning labels to avoid overlaps and maintain clarity
- **SpanningTree**: A subset of branches that connects all nodes without forming loops, used for circuit analysis
- **Twig**: A branch that is part of the selected spanning tree
- **Link**: A branch that is not part of the selected spanning tree (co-tree)
- **CircuitGraphRenderer**: React component that renders the RenderableGraph as SVG elements

## Requirements

### Requirement 1: Circuit-to-Graph Topology Conversion

**User Story:** As a circuit analysis user, I want the system to automatically convert my circuit diagram into a pure graph representation, so that I can perform mathematical analysis on the circuit topology.

#### Acceptance Criteria

1. WHEN the System receives an AnalysisGraph input, THE GraphLayoutEngine SHALL extract all ElectricalNode entities and preserve their connectivity relationships
2. WHEN the System processes a Branch with type "resistor", THE GraphLayoutEngine SHALL represent the Branch as a single undirected edge connecting the corresponding ElectricalNode entities
3. WHEN the System processes a Branch with type "voltageSource", THE GraphLayoutEngine SHALL represent the Branch as a single edge connecting the corresponding ElectricalNode entities
4. WHEN the System processes a Branch with type "currentSource", THE GraphLayoutEngine SHALL remove the Branch from the graph representation entirely
5. THE GraphLayoutEngine SHALL maintain unique identifiers for all ElectricalNode entities and Branch entities throughout the conversion process

### Requirement 2: Layout Optimization and Evaluation

**User Story:** As a circuit analysis user, I want the system to evaluate multiple layout configurations and select the best one, so that I see the clearest possible graph representation.

#### Acceptance Criteria

1. THE GraphLayoutEngine SHALL generate multiple potential node arrangements before committing to a final layout
2. THE GraphLayoutEngine SHALL generate multiple edge routing strategies for evaluation
3. THE GraphLayoutEngine SHALL score each configuration based on minimal intersections, maximum edge spacing, and symmetry
4. THE GraphLayoutEngine SHALL select the configuration that maximizes clarity and minimizes visual noise
5. THE GraphLayoutEngine SHALL arrange nodes to avoid edge intersections where the graph topology allows planar embedding

### Requirement 3: Hybrid Force-Grid Node Placement

**User Story:** As a circuit analysis user, I want nodes to be arranged in a clean, symmetric, grid-aligned layout, so that the graph is easy to read and resembles textbook diagrams.

#### Acceptance Criteria

1. THE NodePlacer SHALL apply force-directed relaxation with centering forces and link forces to untangle the graph
2. WHEN initial positions are calculated, THE NodePlacer SHALL quantize node coordinates to a coarse grid
3. THE NodePlacer SHALL detect ElectricalNode entities that are almost aligned horizontally or vertically and snap them to the exact same axis
4. WHEN the graph contains isomorphic sub-structures, THE NodePlacer SHALL enforce mirror-image coordinates relative to a central axis
5. THE NodePlacer SHALL position high-degree ElectricalNode entities near the geometric center of the layout
6. WHEN ElectricalNode entities form a star topology, THE NodePlacer SHALL distribute connected branches with equal angular spacing
7. THE NodePlacer SHALL center the graph visually within the viewport

### Requirement 4: Path-Scored Edge Routing

**User Story:** As a circuit analysis user, I want edges to be routed intelligently with straight lines preferred and curves used only when necessary, so that the graph is clear and uncluttered.

#### Acceptance Criteria

1. THE EdgeRouter SHALL generate candidate paths for each edge including direct straight line, low-arc curve clockwise, low-arc curve counter-clockwise, and high-arc curve
2. THE EdgeRouter SHALL calculate a penalty score for each candidate path based on intersections, proximity, curvature, and symmetry
3. THE EdgeRouter SHALL assign intersection penalty for each intersection with an ElectricalNode or existing edge
4. THE EdgeRouter SHALL assign proximity penalty for paths that are too close to another element
5. THE EdgeRouter SHALL assign curvature penalty to curved paths to bias towards straight lines
6. THE EdgeRouter SHALL assign symmetry bonus to paths that mirror a partner edge
7. THE EdgeRouter SHALL select the candidate path with the lowest total penalty score
8. WHEN multiple Branch entities connect the same two ElectricalNode entities, THE EdgeRouter SHALL render the Branch entities as symmetric curves bowing outward from the straight line

### Requirement 5: Collision-Free Label Positioning

**User Story:** As a circuit analysis user, I want all labels to be clearly visible without overlapping edges or other labels, so that I can easily identify nodes and branches.

#### Acceptance Criteria

1. THE LabelOptimizer SHALL calculate an initial label position with standard offset above the parent element
2. WHEN a label overlaps with another label, edge, or ElectricalNode, THE LabelOptimizer SHALL test alternative positions including below, start-third, and end-third positions
3. THE LabelOptimizer SHALL select the label position with zero overlaps and minimum distance from the parent element
4. THE CircuitGraphRenderer SHALL render ElectricalNode labels visually distinct from Branch labels
5. THE CircuitGraphRenderer SHALL position ElectricalNode labels in close proximity to the node without overlapping connected edges
6. THE CircuitGraphRenderer SHALL position Branch labels near the edge to associate clearly with the specific branch without ambiguity

### Requirement 6: Directional Arrow Rendering

**User Story:** As a circuit analysis user, I want directional arrows on branches to indicate assumed current flow direction, so that I can understand the analysis conventions.

#### Acceptance Criteria

1. THE EdgeRouter SHALL calculate the arrow position at parameter t equals 0.5 on the edge path
2. THE EdgeRouter SHALL derive the tangent angle theta at the arrow position for rotation
3. THE CircuitGraphRenderer SHALL render the arrow on the body of the edge, not at the endpoints
4. THE CircuitGraphRenderer SHALL render the arrow as a simple arrowhead superimposed on the edge line
5. THE CircuitGraphRenderer SHALL rotate the arrow to align with the edge tangent at the arrow position

### Requirement 7: SVG-Based Graph Rendering

**User Story:** As a circuit analysis user, I want the graph to be rendered as scalable vector graphics, so that I can zoom and pan without loss of quality.

#### Acceptance Criteria

1. THE CircuitGraphRenderer SHALL render ElectricalNode entities as very tiny filled circles
2. THE CircuitGraphRenderer SHALL render edges as SVG path elements with solid continuous lines
3. THE CircuitGraphRenderer SHALL render straight edges using line path commands
4. THE CircuitGraphRenderer SHALL render curved edges using Bezier curve path commands
5. THE CircuitGraphRenderer SHALL render labels as SVG text elements with clean, high-contrast sans-serif or monospaced font
6. THE CircuitGraphRenderer SHALL render edge intersections as simple crosses without node markers
7. WHEN edge intersections are unavoidable, THE CircuitGraphRenderer SHALL render the intersection angle close to 90 degrees

### Requirement 8: Dynamic Spacing Adjustment

**User Story:** As a circuit analysis user, I want the system to automatically increase spacing when areas become crowded, so that all elements remain clearly distinguishable.

#### Acceptance Criteria

1. WHEN the area between two ElectricalNode entities becomes crowded with branches or labels, THE NodePlacer SHALL increase the distance between the ElectricalNode entities
2. THE NodePlacer SHALL ensure every branch has clear spacing and is distinct from neighboring branches
3. THE NodePlacer SHALL recalculate edge routes after spacing adjustments
4. THE System SHALL not adhere to a rigid, fixed-size grid for node spacing

### Requirement 9: Spanning Tree Visualization

**User Story:** As a circuit analysis user, I want to see which branches are part of the selected spanning tree, so that I can understand the tree-link decomposition used in loop analysis.

#### Acceptance Criteria

1. WHEN the System receives an AnalysisGraph with a selectedTreeId, THE CircuitGraphRenderer SHALL visually distinguish twig branches from link branches
2. THE CircuitGraphRenderer SHALL render twig branches and link branches with distinct visual styling
3. WHEN the user selects a different SpanningTree, THE CircuitGraphRenderer SHALL update the visual styling
4. THE CircuitGraphRenderer SHALL maintain all other visual properties (position, labels, arrows) when spanning tree selection changes

### Requirement 10: Geometric Utility Functions

**User Story:** As a developer, I want reusable geometric calculation functions, so that I can perform accurate spatial computations throughout the layout engine.

#### Acceptance Criteria

1. THE geometry utility module SHALL provide a function to calculate line-line intersection points
2. THE geometry utility module SHALL provide a function to calculate line-circle intersection points
3. THE geometry utility module SHALL provide a function to calculate points on Bezier curves at parameter t
4. THE geometry utility module SHALL provide a function to calculate tangent angles on Bezier curves at parameter t
5. THE geometry utility module SHALL provide a function to calculate distance between a point and a line segment
6. THE geometry utility module SHALL return undefined for intersection functions when no intersection exists

### Requirement 11: RenderableGraph Data Structure

**User Story:** As a developer, I want a clear contract between the layout engine and renderer, so that the two layers can be developed and tested independently.

#### Acceptance Criteria

1. THE GraphLayoutEngine SHALL output a RenderableGraph containing width, height, nodes array, and edges array
2. THE RenderableGraph SHALL contain RenderableNode entities with id, x coordinate, y coordinate, label, and pre-calculated label position
3. THE RenderableGraph SHALL contain RenderableEdge entities with id, source id, target id, SVG path data, arrow point with position and angle, label, label position, and curved flag
4. THE RenderableNode label position SHALL be calculated by the LabelOptimizer before rendering
5. THE RenderableEdge path SHALL be provided as SVG path data string ready for the d attribute
6. THE RenderableEdge arrow point SHALL include x coordinate, y coordinate, and rotation angle

### Requirement 12: Modular Engine Architecture

**User Story:** As a developer, I want the layout engine to be organized into focused, single-responsibility modules, so that the system is maintainable and testable.

#### Acceptance Criteria

1. THE GraphLayoutEngine SHALL delegate node placement to the NodePlacer module
2. THE GraphLayoutEngine SHALL delegate edge routing to the EdgeRouter module
3. THE GraphLayoutEngine SHALL delegate label positioning to the LabelOptimizer module
4. THE GraphLayoutEngine SHALL execute the layout pipeline in sequence: node placement, edge routing, label optimization
5. THE GraphLayoutEngine SHALL accept AnalysisGraph as input and return RenderableGraph as output
6. THE CircuitGraphRenderer SHALL accept RenderableGraph as input and produce SVG elements as output
7. THE CircuitGraphRenderer SHALL not contain layout calculation logic
