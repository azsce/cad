# Circuit Graph Pattern Recognition - Implementation Plan

## Overview

This plan implements a **Planarity-First** layout approach using pattern recognition and hierarchical layout optimization. The goal is to eliminate avoidable intersections by detecting common circuit patterns, simplifying the graph, optimizing for planarity, then expanding with geometric constraints.

## Problem Statement

The current implementation generates layouts that may have intersections even when the graph topology allows for a planar (intersection-free) layout. This happens because:

1. **No look-ahead**: The force-directed algorithm doesn't consider future edge routing
2. **Local optimization**: Each edge is routed independently without global planning
3. **No pattern awareness**: Common circuit topologies (Bridge, Pi, T) aren't recognized
4. **Intersection penalty is reactive**: We penalize intersections after they occur, rather than preventing them

## Proposed Solution: Hierarchical Layout with Pattern Recognition

### Phase 1: Pattern Recognition (Encoder)

**New Module**: `PatternMatcher.ts`

Detects common circuit patterns and provides methods to collapse/expand them:

```typescript
interface CircuitPattern {
  type: 'bridge' | 'pi' | 't' | 'series' | 'parallel';
  nodes: NodeId[];
  branches: BranchId[];
  geometricTemplate: Point[]; // Ideal positions for this pattern
}

interface PatternMatch {
  pattern: CircuitPattern;
  nodeMapping: Map<NodeId, number>; // Maps actual nodes to pattern positions
  branchMapping: Map<BranchId, number>; // Maps actual branches to pattern edges
}

class PatternMatcher {
  /**
   * Find all pattern matches in the graph
   */
  findPatterns(graph: AnalysisGraph): PatternMatch[];
  
  /**
   * Collapse patterns into super nodes
   * Returns simplified graph where each pattern is a single node
   */
  collapsePatterns(
    graph: AnalysisGraph,
    matches: PatternMatch[]
  ): SimplifiedGraph;
  
  /**
   * Expand super nodes back into their pattern geometry
   */
  expandPatterns(
    simplifiedLayout: Map<NodeId, Point>,
    matches: PatternMatch[]
  ): Map<NodeId, Point>;
}
```

**Pattern Detection Algorithms**:

1. **Bridge Pattern**: 4 nodes forming a diamond (2 parallel paths between 2 nodes)
   - Detect: Find node pairs with exactly 2 disjoint paths between them
   - Template: Diamond shape with 90° angles

2. **Pi Network**: 3 nodes with 3 branches forming a triangle
   - Detect: Find 3-node cycles
   - Template: Equilateral triangle

3. **T Network**: 3 nodes with one central node connected to 2 others
   - Detect: Find degree-2 node connected to two degree-1 nodes
   - Template: T-shape with 90° angles

4. **Series Chain**: N nodes connected in a line
   - Detect: Find paths where all intermediate nodes have degree 2
   - Template: Horizontal line with equal spacing

5. **Parallel Branches**: Multiple branches between same 2 nodes
   - Detect: Already implemented in EdgeRouter
   - Template: Symmetric curves

### Phase 2: Planarity Optimization

**Modified Module**: `NodePlacer.ts`

Add new method for planarity-first optimization:

```typescript
class NodePlacer {
  /**
   * Place nodes with planarity as primary goal
   * Uses simulated annealing with intersection-heavy cost function
   */
  placeNodesForPlanarity(
    nodes: ElectricalNode[],
    branches: Branch[]
  ): NodePlacementResult;
  
  private calculatePlanarityScore(
    positions: Map<NodeId, Point>,
    branches: Branch[]
  ): number {
    // Cost = Intersections * 1000 + EdgeLength * 1
    // This heavily prioritizes eliminating intersections
  }
}
```

**Algorithm**: Simulated Annealing
- **Initial temperature**: High (allows large moves)
- **Cooling schedule**: Exponential decay
- **Cost function**: `Intersections * 1000 + EdgeLength * 1`
- **Acceptance probability**: `exp(-ΔE / T)`
- **Iterations**: 1000-5000 depending on graph size

### Phase 3: Updated Pipeline

**Modified Module**: `GraphLayoutEngine.ts`

```typescript
class GraphLayoutEngine {
  private patternMatcher: PatternMatcher;
  
  calculateLayout(graph: AnalysisGraph): LayoutGraph {
    // Step 1: Find patterns
    const patterns = this.patternMatcher.findPatterns(graph);
    
    // Step 2: Collapse patterns into super nodes
    const simplified = this.patternMatcher.collapsePatterns(graph, patterns);
    
    // Step 3: Optimize simplified graph for planarity
    const simplifiedLayout = this.nodePlacer.placeNodesForPlanarity(
      simplified.nodes,
      simplified.branches
    );
    
    // Step 4: Expand patterns with geometric templates
    const fullLayout = this.patternMatcher.expandPatterns(
      simplifiedLayout.positions,
      patterns
    );
    
    // Step 5: Refine with force-directed (light touch)
    const refined = this.nodePlacer.refineLayout(fullLayout, graph);
    
    // Step 6: Route edges (should have minimal intersections now)
    const edgeRouting = this.edgeRouter.routeEdges(
      graph.branches,
      refined
    );
    
    // Step 7: Optimize labels
    // ... rest of pipeline
  }
}
```

## Implementation Tasks

### Task 1: Create PatternMatcher Module

**File**: `src/components/AnalysisPane/CircuitGraphEngine/engine/PatternMatcher.ts`

**Subtasks**:
1. Define pattern interfaces and types
2. Implement bridge pattern detection
3. Implement pi network detection
4. Implement T network detection
5. Implement series chain detection
6. Implement pattern collapse logic
7. Implement pattern expansion logic
8. Write unit tests for each pattern type

**Complexity**: Medium-High
**Estimated Lines**: ~400 lines
**Dependencies**: Graph theory utilities (BFS, DFS, cycle detection)

### Task 2: Add Planarity Optimization to NodePlacer

**File**: `src/components/AnalysisPane/CircuitGraphEngine/engine/NodePlacer.ts`

**Subtasks**:
1. Implement simulated annealing algorithm
2. Implement planarity score calculation
3. Implement intersection counting (look-ahead)
4. Add cooling schedule
5. Add acceptance probability calculation
6. Write unit tests for planarity optimization

**Complexity**: Medium
**Estimated Lines**: ~200 lines (new methods)
**Dependencies**: Geometry utilities for intersection detection

### Task 3: Update GraphLayoutEngine Pipeline

**File**: `src/components/AnalysisPane/CircuitGraphEngine/engine/GraphLayoutEngine.ts`

**Subtasks**:
1. Add PatternMatcher instance
2. Update calculateLayout to use new pipeline
3. Add configuration option to enable/disable pattern recognition
4. Update tests to cover new pipeline
5. Add performance benchmarks

**Complexity**: Low-Medium
**Estimated Lines**: ~100 lines (modifications)
**Dependencies**: PatternMatcher, updated NodePlacer

### Task 4: Add Graph Theory Utilities

**File**: `src/components/AnalysisPane/CircuitGraphEngine/utils/graphTheory.ts`

**Subtasks**:
1. Implement BFS (breadth-first search)
2. Implement DFS (depth-first search)
3. Implement cycle detection
4. Implement disjoint path finding
5. Implement subgraph isomorphism check
6. Write unit tests for all utilities

**Complexity**: Medium
**Estimated Lines**: ~300 lines
**Dependencies**: None (pure algorithms)

## Testing Strategy

### Unit Tests

1. **PatternMatcher**:
   - Test bridge detection with known bridge circuits
   - Test pi network detection
   - Test T network detection
   - Test series chain detection
   - Test pattern collapse/expand round-trip
   - Test with mixed patterns

2. **Planarity Optimization**:
   - Test with planar graphs (should achieve 0 intersections)
   - Test with non-planar graphs (should minimize intersections)
   - Test convergence speed
   - Test cost function calculation

3. **Graph Theory Utilities**:
   - Test BFS/DFS with various graph structures
   - Test cycle detection
   - Test disjoint path finding

### Integration Tests

1. **Full Pipeline**:
   - Test with simple bridge circuit (should be planar)
   - Test with complex circuit (should minimize intersections)
   - Test with non-planar graph (K5, K3,3)
   - Compare intersection count: old vs new approach

### Visual Regression Tests

1. Capture layouts for standard test circuits
2. Verify intersection count is reduced
3. Verify patterns are recognized and rendered correctly

## Performance Considerations

### Complexity Analysis

- **Pattern Detection**: O(n³) worst case (subgraph isomorphism)
- **Simulated Annealing**: O(iterations × n²) for intersection checks
- **Overall**: O(n³) dominated by pattern detection

### Optimization Strategies

1. **Cache pattern matches**: Don't re-detect on every layout
2. **Spatial indexing**: Use quadtree for intersection checks
3. **Early termination**: Stop annealing if planarity achieved
4. **Parallel pattern detection**: Detect patterns concurrently

### Expected Performance

- **Small graphs (< 10 nodes)**: < 100ms
- **Medium graphs (10-30 nodes)**: < 500ms
- **Large graphs (30-50 nodes)**: < 2s

## Configuration Options

Add to GraphLayoutEngine constructor:

```typescript
interface LayoutOptions {
  usePatternRecognition: boolean; // Default: true
  prioritizePlanarity: boolean;   // Default: true
  annealingIterations: number;    // Default: 1000
  patterns: {
    detectBridge: boolean;        // Default: true
    detectPi: boolean;            // Default: true
    detectT: boolean;             // Default: true
    detectSeries: boolean;        // Default: true
  };
}
```

## Migration Strategy

### Phase 1: Add Pattern Recognition (Non-Breaking)

- Add PatternMatcher module
- Add graph theory utilities
- Add unit tests
- **No changes to existing pipeline**

### Phase 2: Add Planarity Optimization (Opt-In)

- Add planarity methods to NodePlacer
- Add configuration option to GraphLayoutEngine
- **Default: disabled** (use existing pipeline)
- Add integration tests

### Phase 3: Update Pipeline (Opt-In)

- Update GraphLayoutEngine to use new pipeline
- **Default: disabled** (use existing pipeline)
- Add visual regression tests

### Phase 4: Enable by Default

- After thorough testing, enable new pipeline by default
- Keep old pipeline available via configuration

## Success Criteria

1. **Planarity**: Planar graphs should have 0 intersections
2. **Intersection Reduction**: Non-planar graphs should have fewer intersections than current approach
3. **Pattern Recognition**: Bridge, Pi, T, and Series patterns should be detected correctly
4. **Performance**: Layout calculation should complete within performance targets
5. **Visual Quality**: Layouts should maintain textbook quality (symmetry, alignment)

## Open Questions

1. **Pattern Priority**: If multiple patterns overlap, which should take precedence?
   - **Proposed**: Larger patterns first (Bridge > Pi > T > Series)

2. **Non-Planar Handling**: How to handle graphs that are provably non-planar (K5, K3,3)?
   - **Proposed**: Use planarization (add virtual nodes at intersections)

3. **Dynamic Spacing**: Should pattern expansion respect dynamic spacing rules?
   - **Proposed**: Yes, apply spacing adjustment after expansion

4. **Backward Compatibility**: Should we maintain the old pipeline?
   - **Proposed**: Yes, via configuration option for at least 2 releases

## Next Steps

1. Review this plan with team
2. Create detailed task breakdown in Jira/GitHub
3. Implement Phase 1 (Pattern Recognition)
4. Implement Phase 2 (Planarity Optimization)
5. Implement Phase 3 (Pipeline Update)
6. Test and iterate
7. Enable by default after validation

## References

- **Graph Planarity**: Hopcroft-Tarjan algorithm for planarity testing
- **Simulated Annealing**: Kirkpatrick et al. (1983)
- **Circuit Patterns**: Standard electrical engineering textbooks
- **Force-Directed Layout**: Fruchterman-Reingold algorithm
