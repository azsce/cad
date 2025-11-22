# Implementation Plan

- [x] 1. Set up project structure and type definitions
  - Create directory structure at `src/components/AnalysisPane/CircuitGraphEngine/`
  - Define RenderableGraph, RenderableNode, and RenderableEdge types in `types.ts`
  - Define Point and BoundingBox supporting types
  - Export types from index file
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 2. Implement geometric utility functions
  - [x] 2.1 Create geometry.ts module with core functions
    - Implement `getLineIntersection` for line-line intersection detection
    - Implement `getLineCircleIntersection` for line-circle intersection detection
    - Implement `getBezierPoint` to calculate points on Bezier curves at parameter t
    - Implement `getBezierTangent` to calculate tangent vectors on Bezier curves
    - Implement `pointToLineDistance` for distance calculations
    - Implement `boundingBoxIntersects` for bounding box collision detection
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 2.2 Write unit tests for geometry utilities
    - Test line-line intersection with parallel, intersecting, and non-intersecting cases
    - Test Bezier calculations at various t values (0, 0.25, 0.5, 0.75, 1.0)
    - Test distance calculations with known values
    - Test bounding box intersection detection
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 3. Implement symmetry detection utilities
  - [x] 3.1 Create symmetry.ts module
    - Implement `findIsomorphicSubgraphs` to detect graph symmetries
    - Implement `calculateCentralAxis` to find mirror axis
    - Implement `mirrorPositions` to reflect positions across axis
    - _Requirements: 3.4_

  - [x] 3.2 Write unit tests for symmetry utilities
    - Test isomorphism detection with mirror graphs
    - Test axis calculation with symmetric layouts
    - Test position mirroring
    - _Requirements: 3.4_

- [x] 4. Implement NodePlacer for node positioning
  - [x] 4.1 Create NodePlacer class with force-directed algorithm
    - Implement `placeNodes` main method
    - Implement `applyForceDirected` with centering, link, and repulsion forces
    - Set up force parameters (preferred link length, repulsion strength, centering strength)
    - Implement iteration loop with energy stabilization check (max 300 iterations)
    - _Requirements: 3.1_

  - [x] 4.2 Implement grid snapping logic
    - Implement `snapToGrid` method to quantize coordinates
    - Use configurable grid size (default 50px)
    - Round x and y coordinates to nearest grid point
    - _Requirements: 3.2_

  - [x] 4.3 Implement alignment pass
    - Implement `alignNodes` method to detect near-aligned nodes
    - Detect nodes with similar x-coordinates and snap to common vertical axis
    - Detect nodes with similar y-coordinates and snap to common horizontal axis
    - Use configurable alignment threshold
    - _Requirements: 3.3_

  - [x] 4.4 Implement symmetry enforcement
    - Implement `enforceSymmetry` method using symmetry utilities
    - Detect isomorphic sub-graphs
    - Calculate central axis
    - Mirror sub-graph positions
    - _Requirements: 3.4_

  - [x] 4.5 Implement centering and bounds calculation
    - Center the graph within viewport
    - Calculate layout bounds (width and height)
    - Position high-degree nodes near geometric center
    - _Requirements: 3.5, 3.7_

  - [x] 4.6 Write unit tests for NodePlacer
    - Test force-directed convergence with simple graphs
    - Test grid snapping with known positions
    - Test alignment detection and snapping
    - Test symmetry enforcement with mirror graphs
    - Test star topology radial distribution
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 5. Implement EdgeRouter for edge path calculation
  - [x] 5.1 Create EdgeRouter class with candidate generation
    - Implement `routeEdges` main method
    - Implement `generateCandidates` to create path options
    - Generate direct straight line path
    - Generate low-arc curve clockwise (control point offset +30px perpendicular)
    - Generate low-arc curve counter-clockwise (control point offset -30px perpendicular)
    - Generate high-arc curve (control point offset +60px perpendicular)
    - _Requirements: 4.1_

  - [x] 5.2 Implement path scoring system
    - Implement `scorePath` method with penalty calculation
    - Calculate intersection penalty (check intersections with nodes and edges)
    - Calculate proximity penalty (check distance to other elements)
    - Calculate curvature penalty (bias towards straight lines)
    - Calculate symmetry bonus (detect mirror edges)
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.3 Implement path selection logic
    - Select candidate with lowest total score
    - Handle tie-breaking (prefer straight over curved)
    - Generate SVG path data string for selected path
    - _Requirements: 4.7_

  - [x] 5.4 Implement arrow calculation
    - Implement `calculateArrowPoint` method
    - Evaluate path at t=0.5 to get midpoint coordinates
    - Calculate tangent vector at t=0.5
    - Derive rotation angle using atan2
    - _Requirements: 6.1, 6.2_

  - [x] 5.5 Implement parallel edge handling
    - Detect multiple branches connecting same two nodes
    - Generate symmetric curves bowing outward
    - Ensure sufficient spacing between parallel curves
    - _Requirements: 4.8_

  - [x] 5.6 Write unit tests for EdgeRouter
    - Test candidate generation for various node positions
    - Test path scoring with known obstacles
    - Test arrow calculation at t=0.5
    - Test parallel edge handling
    - Test straight line preference
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 6. Implement LabelOptimizer for label positioning
  - [x] 6.1 Create LabelOptimizer class with initial placement
    - Implement `optimizeLabels` main method
    - Implement `calculateInitialPosition` for nodes and edges
    - Position node labels with standard offset above node center
    - Position edge labels with standard offset above edge midpoint
    - _Requirements: 5.1_

  - [x] 6.2 Implement collision detection
    - Implement `detectCollision` method
    - Calculate bounding box for label text
    - Check intersection with all existing elements (nodes, edges, other labels)
    - _Requirements: 5.2_

  - [x] 6.3 Implement alternative position search
    - Implement `findAlternativePosition` method
    - Try alternative positions: below, start-third, end-third
    - Check each position for collisions
    - Select first position with zero collisions
    - _Requirements: 5.2, 5.3_

  - [x] 6.4 Implement fallback behavior
    - If all positions collide, select position with minimum overlap area
    - Log warning for debugging
    - _Requirements: 5.3_

  - [x] 6.5 Write unit tests for LabelOptimizer
    - Test initial position calculation
    - Test collision detection with overlapping elements
    - Test alternative position selection
    - Test fallback behavior
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Implement GraphLayoutEngine orchestrator
  - [x] 7.1 Create GraphLayoutEngine class
    - Implement `calculateLayout` main method
    - Initialize NodePlacer, EdgeRouter, and LabelOptimizer instances
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 7.2 Implement pipeline orchestration
    - Call NodePlacer to calculate node positions
    - Call EdgeRouter to calculate edge paths and arrows
    - Call LabelOptimizer to calculate label positions
    - Ensure pipeline executes in correct sequence
    - _Requirements: 12.4_

  - [x] 7.3 Implement input validation
    - Validate AnalysisGraph structure
    - Check for missing nodes or disconnected branches
    - Throw descriptive InvalidGraphError if validation fails
    - _Requirements: 12.5_

  - [x] 7.4 Implement RenderableGraph assembly
    - Convert node positions to RenderableNode array
    - Convert edge paths to RenderableEdge array
    - Calculate layout bounds (width and height)
    - Return complete RenderableGraph
    - _Requirements: 12.5, 12.6_

  - [x] 7.5 Filter current sources from graph
    - Remove branches with type "currentSource" before processing
    - Maintain connectivity for remaining branches
    - _Requirements: 1.4_

  - [x] 7.6 Write integration tests for GraphLayoutEngine
    - Test full pipeline with simple circuit (2 nodes, 1 resistor)
    - Test with complex circuit (5+ nodes, multiple branches)
    - Test with parallel branches
    - Test with current sources (verify removal)
    - Verify RenderableGraph structure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 8. Implement CircuitGraphRenderer React component
  - [x] 8.1 Create CircuitGraphRenderer component structure
    - Define component props interface (graph, selectedTreeId, event handlers)
    - Set up SVG container with viewBox
    - Implement basic component skeleton
    - _Requirements: 12.7_

  - [x] 8.2 Implement node rendering
    - Render each RenderableNode as SVG circle
    - Use very tiny filled circles for nodes
    - Position circles at (x, y) coordinates
    - Apply node styling (fill color, radius)
    - _Requirements: 7.1_

  - [x] 8.3 Implement node label rendering
    - Render node labels as SVG text elements
    - Position labels at pre-calculated labelPos
    - Apply distinct styling for node labels
    - Use clean, high-contrast sans-serif or monospaced font
    - _Requirements: 5.4, 5.5, 7.5_

  - [x] 8.4 Implement edge rendering
    - Render each RenderableEdge as SVG path element
    - Use path data from edge.path for d attribute
    - Apply solid continuous line style
    - Render straight edges using line commands
    - Render curved edges using Bezier commands
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 8.5 Implement arrow rendering
    - Create arrow marker definition in SVG defs
    - Position arrow at edge.arrowPoint coordinates
    - Rotate arrow using edge.arrowPoint.angle
    - Render arrow on body of edge, not at endpoints
    - _Requirements: 6.3, 6.4, 6.5_

  - [x] 8.6 Implement edge label rendering
    - Render edge labels as SVG text elements
    - Position labels at pre-calculated labelPos
    - Apply distinct styling for edge labels
    - Position labels to associate clearly with specific branch
    - _Requirements: 5.6, 7.5_

  - [x] 8.7 Implement spanning tree styling
    - Check if branch is in selected spanning tree
    - Apply solid stroke for twig branches
    - Apply dashed stroke for link branches
    - Maintain other visual properties when tree selection changes
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 8.8 Implement edge intersection rendering
    - Render edge intersections as simple crosses
    - Do not add node markers at intersections
    - Ensure intersection angles are close to 90 degrees where possible
    - _Requirements: 7.6, 7.7_

  - [x] 8.9 Implement event handlers
    - Add click handlers to nodes (call onNodeClick prop)
    - Add click handlers to edges (call onEdgeClick prop)
    - Ensure proper event propagation
    - _Requirements: 12.7_

  - [x] 8.10 Optimize rendering performance
    - Wrap component with React.memo
    - Use useMemo for expensive calculations
    - Memoize SVG path generation
    - _Requirements: 12.7_

  - [x] 8.11 Write component tests for CircuitGraphRenderer
    - Test rendering with minimal RenderableGraph
    - Test spanning tree styling (twigs vs links)
    - Test click handlers
    - Test with empty graph
    - Verify SVG structure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 9.1, 9.2, 9.3, 9.4, 12.7_

- [-] 9. Implement layout optimization and evaluation
  - [x] 9.1 Add configuration scoring to GraphLayoutEngine
    - Generate multiple node arrangement candidates
    - Generate multiple edge routing strategies
    - _Requirements: 2.1, 2.2_

  - [x] 9.2 Implement configuration scoring
    - Score each configuration based on intersection count
    - Score based on edge spacing
    - Score based on symmetry quality
    - _Requirements: 2.3_

  - [x] 9.3 Implement configuration selectionscoring.

  - [x] 9.3 Implement configuration selection
    - Select configuration that maximizes clarity
    - Select configuration that minimizes visual noise
    - _Requirements: 2.4_
    - **STATUS**: Not implemented. Will be replaced by pattern recognition approach.
    - **NEW APPROACH**: See `.ai/plan/Circuit Graph Pattern Recognition - Implementation.md`

  - [x] 9.4 Implement planarity optimization with pattern recognition
    - **NEW APPROACH**: Hierarchical layout with pattern recognition
    - _Requirements: 2.5_
    - **STATUS**: Ready for implementation. See detailed plan in `.ai/plan/Circuit Graph Pattern Recognition - Implementation.md`

  - [x] 9.4.1 Create graph theory utilities module
    - Implement BFS (breadth-first search) for graph traversal
    - Implement DFS (depth-first search) for graph traversal
    - Implement cycle detection algorithm
    - Implement disjoint path finding (for bridge detection)
    - Implement subgraph isomorphism check (for pattern matching)
    - Write unit tests for all graph theory utilities
    - _File: `src/components/AnalysisPane/CircuitGraphEngine/utils/graphTheory.ts`_
    - _Estimated: ~300 lines_
    - _Requirements: 2.5_

  - [x] 9.4.2 Create PatternMatcher module with pattern detection
    - Define CircuitPattern and PatternMatch interfaces
    - Implement bridge pattern detection (4 nodes, diamond shape, 2 disjoint paths)
    - Implement pi network detection (3 nodes, triangle, 3-node cycle)
    - Implement T network detection (3 nodes, T-shape, degree-2 central node)
    - Implement series chain detection (N nodes, linear path, degree-2 intermediate nodes)
    - Write unit tests for each pattern detection algorithm
    - _File: `src/components/AnalysisPane/CircuitGraphEngine/engine/PatternMatcher.ts`_
    - _Estimated: ~250 lines for detection logic_
    - _Requirements: 2.5_

  - [x] 9.4.3 Implement pattern collapse and expansion in PatternMatcher
    - Implement collapsePatterns method (create super nodes from patterns)
    - Define SimplifiedGraph type for collapsed representation
    - Implement expandPatterns method (restore patterns with geometric templates)
    - Define geometric templates for each pattern type (Bridge: diamond, Pi: triangle, T: T-shape, Series: line)
    - Write unit tests for collapse/expand round-trip
    - _File: `src/components/AnalysisPane/CircuitGraphEngine/engine/PatternMatcher.ts`_
    - _Estimated: ~150 lines for collapse/expand logic_
    - _Requirements: 2.5_

  - [x] 9.4.4 Add planarity optimization to NodePlacer
    - Implement placeNodesForPlanarity method using simulated annealing
    - Implement calculatePlanarityScore (cost = Intersections × 1000 + EdgeLength × 1)
    - Implement intersection counting with look-ahead (check all edge pairs)
    - Implement cooling schedule (exponential decay)
    - Implement acceptance probability calculation (exp(-ΔE / T))
    - Implement refineLayout method (light force-directed touch after expansion)
    - Write unit tests for planarity optimization
    - _File: `src/components/AnalysisPane/CircuitGraphEngine/engine/NodePlacer.ts`_
    - _Estimated: ~200 lines of new methods_
    - _Requirements: 2.5_

  - [x] 9.4.5 Update GraphLayoutEngine pipeline for pattern recognition
    - Add PatternMatcher instance to GraphLayoutEngine
    - Add LayoutOptions interface with configuration flags (usePatternRecognition, prioritizePlanarity, annealingIterations)
    - Implement new pipeline: findPatterns → collapsePatterns → placeNodesForPlanarity → expandPatterns → refineLayout → routeEdges
    - Keep old pipeline available via configuration (default: use new pipeline)
    - Update calculateLayout method to use new pipeline when enabled
    - _File: `src/components/AnalysisPane/CircuitGraphEngine/engine/GraphLayoutEngine.ts`_
    - _Estimated: ~100 lines of modifications_
    - _Requirements: 2.5_

  - [x] 9.4.6 Integration testing for pattern recognition pipeline
    - Test with simple bridge circuit (should achieve 0 intersections)
    - Test with pi network circuit (should achieve 0 intersections)
    - Test with T network circuit (should achieve 0 intersections)
    - Test with series chain circuit (should achieve 0 intersections)
    - Test with mixed patterns (multiple pattern types in one graph)
    - Test with non-planar graphs (K5, K3,3) (should minimize intersections)
    - Compare intersection count: old pipeline vs new pipeline
    - Verify visual quality maintained (symmetry, alignment)
    - _Requirements: 2.5_

  - [ ] 9.4.7 Visual regression tests for pattern recognition
    - Capture SVG output for bridge circuit layout
    - Capture SVG output for pi network layout
    - Capture SVG output for T network layout
    - Capture SVG output for series chain layout
    - Verify patterns are recognized correctly (check pattern detection results)
    - Verify intersection count is reduced compared to baseline
    - Compare against baseline images for visual quality
    - _Requirements: 2.5_

  - [ ] 9.5 Write tests for optimization logic
    - **IMPORTANT**: Follow the healthy test pattern from `GraphLayoutEngine.test.ts` and `symmetry.test.ts`
    - Extract helper functions for graph creation, assertions, and test execution
    - Keep all functions ≤ 40 lines, CC ≤ 7, zero duplication, zero bumpy roads
    - Use declarative test style with descriptive helper names
    - Test configuration generation
    - Test scoring with various layouts
    - Test selection logic
    - Test planarity detection
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 10. Implement dynamic spacing adjustment
  - [x] 10.1 Add crowding detection to NodePlacer
    - Detect when area between nodes becomes crowded with branches or labels
    - Calculate branch density in regions
    - _Requirements: 8.1_

  - [x] 10.2 Implement spacing expansion
    - Increase distance between nodes when crowding detected
    - Ensure every branch has clear spacing
    - Ensure branches are distinct from neighbors
    - _Requirements: 8.2_

  - [x] 10.3 Implement edge route recalculation
    - Recalculate edge routes after spacing adjustments
    - Maintain path quality after adjustments
    - _Requirements: 8.3_

  - [x] 10.4 Ensure flexible grid spacing
    - Do not use rigid, fixed-size grid
    - Allow dynamic spacing based on content
    - _Requirements: 8.4_

  - [x] 10.5 Write tests for dynamic spacing
    - **IMPORTANT**: Follow the healthy test pattern from `GraphLayoutEngine.test.ts` and `symmetry.test.ts`
    - Extract helper functions for graph creation, assertions, and test execution
    - Keep all functions ≤ 40 lines, CC ≤ 7, zero duplication, zero bumpy roads
    - Use declarative test style with descriptive helper names
    - Test crowding detection
    - Test spacing expansion
    - Test edge recalculation
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11. Integrate with AnalysisPane
  - [x] 11.1 Create index.tsx export file
    - Export CircuitGraphRenderer component
    - Export GraphLayoutEngine class
    - Export type definitions
    - _Requirements: 12.7_

  - [x] 11.2 Update AnalysisPane to use CircuitGraphRenderer
    - Import CircuitGraphRenderer and GraphLayoutEngine
    - Create AnalysisGraph from circuit data
    - Use GraphLayoutEngine to calculate layout
    - Render CircuitGraphRenderer with RenderableGraph
    - Pass selectedTreeId and event handlers
    - _Requirements: 12.7_

  - [x] 11.3 Add error boundary
    - Wrap CircuitGraphRenderer in ErrorBoundary
    - Display fallback UI on rendering errors
    - Provide retry button
    - Log error details
    - _Requirements: 12.7_

  - [x] 11.4 Write integration tests
    - **IMPORTANT**: Follow the healthy test pattern from `GraphLayoutEngine.test.ts` and `symmetry.test.ts`
    - Extract helper functions for component setup, assertions, and test execution
    - Keep all functions ≤ 40 lines, CC ≤ 7, zero duplication, zero bumpy roads
    - Use declarative test style with descriptive helper names
    - Test AnalysisPane with graph visualization
    - Test error boundary behavior
    - Test event handler integration
    - _Requirements: 12.7_

- [x] 12. Add visual regression tests
  - **IMPORTANT**: Follow the healthy test pattern from `GraphLayoutEngine.test.ts` and `symmetry.test.ts`
  - Extract helper functions for circuit creation, SVG capture, and comparison
  - Keep all functions ≤ 40 lines, CC ≤ 7, zero duplication, zero bumpy roads
  - Use declarative test style with descriptive helper names
  - Create test circuits for visual validation
  - Capture SVG output for simple series circuit
  - Capture SVG output for parallel branches
  - Capture SVG output for bridge circuit (symmetry test)
  - Capture SVG output for star topology (radial symmetry test)
  - Capture SVG output for non-planar graph (intersection test)
  - Compare against baseline images
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 13. Implement Pattern Recognition (NEW - Planarity-First Approach)
  - [ ] 13.1 Create graph theory utilities
    - Implement BFS (breadth-first search)
    - Implement DFS (depth-first search)
    - Implement cycle detection
    - Implement disjoint path finding
    - Implement subgraph isomorphism check
    - Write unit tests for all utilities
    - _File: `src/components/AnalysisPane/CircuitGraphEngine/utils/graphTheory.ts`_
    - _Estimated: ~300 lines_

  - [ ] 13.2 Create PatternMatcher module
    - Define pattern interfaces (CircuitPattern, PatternMatch)
    - Implement bridge pattern detection (4 nodes, diamond shape)
    - Implement pi network detection (3 nodes, triangle)
    - Implement T network detection (3 nodes, T-shape)
    - Implement series chain detection (N nodes, linear)
    - Implement pattern collapse logic (create super nodes)
    - Implement pattern expansion logic (restore with templates)
    - Write unit tests for each pattern type
    - _File: `src/components/AnalysisPane/CircuitGraphEngine/engine/PatternMatcher.ts`_
    - _Estimated: ~400 lines_

  - [ ] 13.3 Add planarity optimization to NodePlacer
    - Implement simulated annealing algorithm
    - Implement planarity score calculation (Intersections * 1000 + EdgeLength * 1)
    - Implement intersection counting (look-ahead)
    - Add cooling schedule (exponential decay)
    - Add acceptance probability calculation
    - Implement refineLayout method (light force-directed touch)
    - Write unit tests for planarity optimization
    - _File: `src/components/AnalysisPane/CircuitGraphEngine/engine/NodePlacer.ts`_
    - _Estimated: ~200 lines (new methods)_

  - [ ] 13.4 Update GraphLayoutEngine pipeline
    - Add PatternMatcher instance
    - Add configuration options (usePatternRecognition, prioritizePlanarity)
    - Implement new pipeline: detect → collapse → optimize → expand → refine → route
    - Keep old pipeline available via configuration
    - Update tests to cover new pipeline
    - Add performance benchmarks
    - _File: `src/components/AnalysisPane/CircuitGraphEngine/engine/GraphLayoutEngine.ts`_
    - _Estimated: ~100 lines (modifications)_

  - [ ] 13.5 Integration testing for pattern recognition
    - Test with simple bridge circuit (should achieve 0 intersections)
    - Test with pi network (should achieve 0 intersections)
    - Test with T network (should achieve 0 intersections)
    - Test with series chain (should achieve 0 intersections)
    - Test with mixed patterns
    - Test with non-planar graphs (should minimize intersections)
    - Compare intersection count: old vs new approach
    - Verify visual quality maintained

  - [ ] 13.6 Visual regression tests for patterns
    - Capture layouts for bridge circuit
    - Capture layouts for pi network
    - Capture layouts for T network
    - Capture layouts for series chain
    - Verify patterns are recognized correctly
    - Verify intersection count is reduced
    - Compare against baseline images

- [ ] 14. Performance testing and optimization
  - Measure layout time for small graphs (5 nodes, 7 branches)
  - Measure layout time for medium graphs (20 nodes, 30 branches)
  - Measure layout time for large graphs (50 nodes, 75 branches)
  - Profile force-directed iterations
  - Profile path scoring loops
  - Profile pattern detection (should be < 20% of total time)
  - Profile simulated annealing (should be < 50% of total time)
  - Optimize bottlenecks if targets not met (< 100ms small, < 500ms medium, < 2s large)
  - _Requirements: 3.1, 4.2, 4.3, 4.4, 4.5, 4.6_
