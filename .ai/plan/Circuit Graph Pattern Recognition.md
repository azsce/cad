# Implementation Plan - Circuit Graph Pattern Recognition

This plan outlines the addition of a Pattern Recognition (Encoder) module to the Circuit Graph Engine. This module will detect common circuit topologies (Bridge, Pi, T, Series) and enforce geometric constraints to ensure textbook-quality layouts.

## User Review Required

> [!IMPORTANT]
> This change introduces a **Hierarchical Layout** pipeline.
>
> 1. **Pattern Recognition**: Identify sub-circuits (Bridges, Pi, etc.).
> 2. **Collapse**: Treat these patterns as single "Super Nodes".
> 3. **Global Layout**: Optimize the simplified graph for **Minimal Intersections** (Planarity).
> 4. **Expand & Refine**: Restore patterns and apply local geometric constraints.

This "Planarity First" approach prioritizes non-intersecting edges over perfect global symmetry, as requested.

## Proposed Changes

### Logic Layer

#### [NEW] [PatternMatcher.ts](file:///project/workspace/src/components/AnalysisPane/CircuitGraphEngine/engine/PatternMatcher.ts)

- **Purpose**: Detect specific circuit patterns in the `AnalysisGraph`.
- **Key Components**:
  - `CircuitPattern` interface: Defines the structure of a pattern (e.g., "Bridge").
  - `PatternMatch` interface: Maps pattern nodes/branches to actual graph elements.
  - `findPatterns(graph)`: Main entry point.
  - **New Feature**: `collapsePatterns(graph, matches)` -> Returns a simplified graph where patterns are replaced by Super Nodes.

#### [MODIFY] [GraphLayoutEngine.ts](file:///project/workspace/src/components/AnalysisPane/CircuitGraphEngine/engine/GraphLayoutEngine.ts)

- **Updated Pipeline**:
  1.  `patternMatcher.findPatterns(graph)`
  2.  `patternMatcher.collapsePatterns(graph, matches)` -> `simplifiedGraph`
  3.  `nodePlacer.placeNodes(simplifiedGraph)` -> **Optimized for Planarity**
  4.  `patternMatcher.expandPatterns(simplifiedGraph, matches)` -> Restore nodes with template positions.
  5.  `nodePlacer.refineLayout(fullGraph)` -> Final adjustment.

#### [MODIFY] [NodePlacer.ts](file:///project/workspace/src/components/AnalysisPane/CircuitGraphEngine/engine/NodePlacer.ts)

- **New Goal**: Prioritize **Intersection Minimization**.
- **Algorithm Update**:
  - **Phase A (Global)**: Use **Simulated Annealing** on the `simplifiedGraph`.
    - _Cost Function_: `Intersections * 1000 + EdgeLength * 1`.
    - This ensures the global topology is untangled.
  - **Phase B (Expansion)**: When expanding a "Super Node", place the internal nodes (e.g., the 4 nodes of a Bridge) in their ideal geometric template, rotated to align with the Super Node's connections.
  - **Phase C (Refinement)**: Run the existing Force-Directed + Grid Snap, but with **High Intersection Penalty** forces to prevent re-tangling.

## Verification Plan

### Automated Tests

- **Unit Tests for PatternMatcher**:
  - Create mock graphs representing Bridge, Pi, T, and Series circuits.
  - Assert that `findPatterns` correctly identifies the nodes and branches.
  - Test with mixed circuits (e.g., a Bridge connected to a Series chain).
  - Command: `bun test run src/components/AnalysisPane/CircuitGraphEngine/engine/PatternMatcher.test.ts`

- **Integration Tests**:
  - Verify `GraphLayoutEngine` runs without errors when patterns are present.
  - Command: `bun test src/components/AnalysisPane/CircuitGraphEngine/engine/GraphLayoutEngine.test.ts`

### Manual Verification

- **Visual Inspection**:
  - Load the application.
  - Input a known Bridge circuit.
  - Verify it renders as a distinct diamond shape.
  - Input a Pi network.
  - Verify it renders as a clear Pi/Triangle shape.
