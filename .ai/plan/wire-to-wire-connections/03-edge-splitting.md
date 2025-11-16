# Phase 3: Edge Splitting

## Overview

Refine edge splitting logic to properly handle waypoint distribution, maintain orthogonal routing, and support edge merging when junctions are deleted.

## Tasks

### Task 3.1: Create Edge Splitting Utility

**File**: `src/utils/edgeSplitting.ts`

```typescript
/**
 * Utilities for splitting and merging edges at junction points.
 */

import { logger } from './logger';
import type { CircuitEdge, Waypoint, Position } from '../types/circuit';
import type { NodeId, EdgeId } from '../types/identifiers';
import { createEdgeId } from '../types/identifiers';

/**
 * Calculate distance between two positions.
 */
function distance(p1: Position, p2: Position): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Find the closest point on a line segment to a given point.
 */
function closestPointOnSegment(
  segmentStart: Position,
  segmentEnd: Position,
  point: Position
): Position {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  
  if (dx === 0 && dy === 0) {
    return segmentStart;
  }
  
  const t = Math.max(0, Math.min(1,
    ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / (dx * dx + dy * dy)
  ));
  
  return {
    x: segmentStart.x + t * dx,
    y: segmentStart.y + t * dy,
  };
}

/**
 * Split waypoints at a position along the edge path.
 * Finds the closest segment and distributes waypoints accordingly.
 */
export function splitWaypointsAtPosition(
  sourcePos: Position,
  targetPos: Position,
  waypoints: Waypoint[],
  splitPosition: Position
): { beforeWaypoints: Waypoint[]; afterWaypoints: Waypoint[] } {
  // Build complete path: source -> waypoints -> target
  const pathPoints: Position[] = [
    sourcePos,
    ...waypoints,
    targetPos,
  ];
  
  if (pathPoints.length === 2) {
    // No waypoints - simple case
    return { beforeWaypoints: [], afterWaypoints: [] };
  }
  
  // Find closest segment to split position
  let closestSegmentIndex = 0;
  let minDistance = Infinity;
  
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const segmentStart = pathPoints[i];
    const segmentEnd = pathPoints[i + 1];
    
    if (!segmentStart || !segmentEnd) continue;
    
    const closestPoint = closestPointOnSegment(segmentStart, segmentEnd, splitPosition);
    const dist = distance(closestPoint, splitPosition);
    
    if (dist < minDistance) {
      minDistance = dist;
      closestSegmentIndex = i;
    }
  }
  
  logger.debug({ caller: 'edgeSplitting' }, 'Found closest segment', {
    segmentIndex: closestSegmentIndex,
    minDistance,
    totalSegments: pathPoints.length - 1,
  });
  
  // Split waypoints at the closest segment
  // Waypoints before the segment go to "before"
  // Waypoints after the segment go to "after"
  
  // closestSegmentIndex is in pathPoints (includes source/target)
  // Convert to waypoint indices (subtract 1 for source)
  const waypointSplitIndex = closestSegmentIndex;
  
  return {
    beforeWaypoints: waypoints.slice(0, waypointSplitIndex),
    afterWaypoints: waypoints.slice(waypointSplitIndex),
  };
}

/**
 * Split an edge at a junction point.
 * Creates two new edges and deletes the original.
 */
export interface SplitEdgeResult {
  edge1: CircuitEdge;
  edge2: CircuitEdge;
  deletedEdgeId: EdgeId;
}

export function splitEdge(
  originalEdge: CircuitEdge,
  junctionId: NodeId,
  junctionPosition: Position,
  sourceNodePosition: Position,
  targetNodePosition: Position
): SplitEdgeResult {
  logger.debug({ caller: 'edgeSplitting' }, 'Splitting edge', {
    edgeId: originalEdge.id,
    junctionId,
    junctionPosition,
  });
  
  // Split waypoints
  const { beforeWaypoints, afterWaypoints } = splitWaypointsAtPosition(
    sourceNodePosition,
    targetNodePosition,
    originalEdge.waypoints ?? [],
    junctionPosition
  );
  
  // Create edge from source to junction
  const edge1: CircuitEdge = {
    id: createEdgeId(`${originalEdge.id}-before-${Date.now()}`),
    source: originalEdge.source,
    sourceHandle: originalEdge.sourceHandle,
    target: junctionId,
    targetHandle: 'center',
    ...(beforeWaypoints.length > 0 && { waypoints: beforeWaypoints }),
  };
  
  // Create edge from junction to target
  const edge2: CircuitEdge = {
    id: createEdgeId(`${originalEdge.id}-after-${Date.now()}`),
    source: junctionId,
    sourceHandle: 'center',
    target: originalEdge.target,
    targetHandle: originalEdge.targetHandle,
    ...(afterWaypoints.length > 0 && { waypoints: afterWaypoints }),
  };
  
  logger.debug({ caller: 'edgeSplitting' }, 'Edge split complete', {
    edge1: edge1.id,
    edge2: edge2.id,
    beforeWaypoints: beforeWaypoints.length,
    afterWaypoints: afterWaypoints.length,
  });
  
  return {
    edge1,
    edge2,
    deletedEdgeId: originalEdge.id,
  };
}

/**
 * Merge two edges that connect through a junction.
 * Combines waypoints and creates a single edge.
 */
export function mergeEdges(
  edge1: CircuitEdge,
  edge2: CircuitEdge,
  junctionId: NodeId
): CircuitEdge {
  logger.debug({ caller: 'edgeSplitting' }, 'Merging edges', {
    edge1: edge1.id,
    edge2: edge2.id,
    junctionId,
  });
  
  // Determine which edge comes first
  let firstEdge: CircuitEdge;
  let secondEdge: CircuitEdge;
  
  if (edge1.target === junctionId && edge2.source === junctionId) {
    firstEdge = edge1;
    secondEdge = edge2;
  } else if (edge2.target === junctionId && edge1.source === junctionId) {
    firstEdge = edge2;
    secondEdge = edge1;
  } else {
    logger.error({ caller: 'edgeSplitting' }, 'Edges do not connect through junction', {
      edge1,
      edge2,
      junctionId,
    });
    throw new Error('Cannot merge edges that do not connect through junction');
  }
  
  // Combine waypoints
  const combinedWaypoints = [
    ...(firstEdge.waypoints ?? []),
    ...(secondEdge.waypoints ?? []),
  ];
  
  // Create merged edge
  const mergedEdge: CircuitEdge = {
    id: createEdgeId(`merged-${Date.now()}`),
    source: firstEdge.source,
    sourceHandle: firstEdge.sourceHandle,
    target: secondEdge.target,
    targetHandle: secondEdge.targetHandle,
    ...(combinedWaypoints.length > 0 && { waypoints: combinedWaypoints }),
  };
  
  logger.debug({ caller: 'edgeSplitting' }, 'Edges merged', {
    mergedEdge: mergedEdge.id,
    totalWaypoints: combinedWaypoints.length,
  });
  
  return mergedEdge;
}

/**
 * Check if a position is too close to a junction (for waypoint placement).
 */
export function isTooCloseToJunction(
  position: Position,
  junctionPosition: Position,
  minDistance: number = 5
): boolean {
  return distance(position, junctionPosition) < minDistance;
}
```

**Verification**:
- Waypoint splitting works correctly
- Edge merging combines waypoints properly
- Distance calculations are accurate

---

### Task 3.2: Update Connection Handlers to Use Utility

**File**: `src/contexts/CircuitFlowContext/useConnectionHandlers.ts`

```typescript
import { splitEdge } from '../../utils/edgeSplitting';

/**
 * Split an edge at a junction point using the utility function.
 */
function splitEdgeAtJunction(
  edgeId: EdgeId,
  junctionId: NodeId,
  junctionPosition: Position
) {
  const edge = edges.find(e => e.id === edgeId);
  if (!edge) {
    logger.error({ caller: 'useConnectionHandlers' }, 'Edge not found for splitting', { edgeId });
    return;
  }
  
  // Get source and target node positions
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);
  
  if (!sourceNode || !targetNode) {
    logger.error({ caller: 'useConnectionHandlers' }, 'Source or target node not found');
    return;
  }
  
  // Split edge using utility
  const { edge1, edge2, deletedEdgeId } = splitEdge(
    edge,
    junctionId,
    junctionPosition,
    sourceNode.position,
    targetNode.position
  );
  
  // Delete original edge
  deleteEdges([deletedEdgeId]);
  
  // Add new edges
  addEdge(edge1);
  addEdge(edge2);
  
  logger.debug({ caller: 'useConnectionHandlers' }, 'Edge split at junction', {
    originalEdge: deletedEdgeId,
    newEdges: [edge1.id, edge2.id],
  });
}
```

**Verification**:
- Edge splitting uses utility function
- Node positions are retrieved correctly
- Edges are created and deleted properly

---

### Task 3.3: Update Waypoint Addition to Check Junction Proximity

**File**: `src/store/connectionStore.ts`

```typescript
import { isTooCloseToJunction } from '../utils/edgeSplitting';
import { useCircuitStore } from './circuitStore';

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // ... existing state

  /**
   * Add a waypoint to the connection path.
   * Skips if too close to any junction (5px minimum distance).
   */
  addWaypoint: (point, auto = false) => {
    set((state) => {
      if (!state.isConnecting) return state;

      // Check distance to all junctions
      const { nodes } = useCircuitStore.getState().getActiveCircuit() ?? { nodes: [] };
      const junctions = nodes.filter(node => node.type === 'junction');
      
      const tooClose = junctions.some(junction => 
        isTooCloseToJunction(point, junction.position, 5)
      );
      
      if (tooClose) {
        logger.debug({ caller: 'connectionStore' }, 'Waypoint too close to junction, skipping', {
          position: point,
        });
        return state; // Don't add waypoint
      }

      const waypoint: Waypoint = {
        x: point.x,
        y: point.y,
        ...(auto && { auto: true }),
        ...(state.lastDirection && { direction: state.lastDirection }),
      };

      return {
        waypoints: [...state.waypoints, waypoint],
        lastDirection: null,
      };
    });
  },

  // ... rest of implementation
}));
```

**Verification**:
- Waypoints are not placed within 5px of junctions
- Logger shows when waypoint is skipped
- Connection still works without waypoint

---

### Task 3.4: Implement Junction Deletion with Edge Merging

**File**: `src/contexts/CircuitFlowContext/useNodeOperations.ts`

```typescript
import { mergeEdges } from '../../utils/edgeSplitting';
import { isJunctionNode } from '../../types/circuit';

const deleteNodes = useCallback((nodeIds: NodeId[]) => {
  logger.debug({ caller: 'useNodeOperations' }, 'Deleting nodes', { nodeIds });

  // Check each node for junction-specific logic
  nodeIds.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    
    if (node && isJunctionNode(node)) {
      handleJunctionDeletion(nodeId);
    }
  });

  // Delete nodes from local state
  setNodes(current => current.filter(n => !nodeIds.includes(n.id)));

  // Sync to store
  useCircuitStore.getState().deleteNodes(circuitId, nodeIds);
}, [circuitId, nodes, setNodes]);

/**
 * Handle junction deletion with edge merging logic.
 */
function handleJunctionDeletion(junctionId: NodeId) {
  // Find all edges connected to this junction
  const connectedEdges = edges.filter(
    e => e.source === junctionId || e.target === junctionId
  );

  logger.debug({ caller: 'useNodeOperations' }, 'Deleting junction', {
    junctionId,
    connectedEdgeCount: connectedEdges.length,
  });

  if (connectedEdges.length === 2) {
    // Exactly 2 edges - merge them
    const [edge1, edge2] = connectedEdges;
    
    if (!edge1 || !edge2) return;
    
    try {
      const mergedEdge = mergeEdges(edge1, edge2, junctionId);
      
      // Delete original edges
      deleteEdges([edge1.id, edge2.id]);
      
      // Add merged edge
      addEdge(mergedEdge);
      
      logger.debug({ caller: 'useNodeOperations' }, 'Edges merged after junction deletion', {
        mergedEdge: mergedEdge.id,
      });
    } catch (error) {
      logger.error({ caller: 'useNodeOperations' }, 'Failed to merge edges', error);
      // Fall back to deleting edges
      deleteEdges(connectedEdges.map(e => e.id));
    }
  } else if (connectedEdges.length > 0) {
    // More than 2 edges - delete all (could add confirmation dialog here)
    logger.warn({ caller: 'useNodeOperations' }, 'Deleting junction with multiple edges', {
      edgeCount: connectedEdges.length,
    });
    
    deleteEdges(connectedEdges.map(e => e.id));
  }
  // If 0 or 1 edges, just delete junction (no merging needed)
}
```

**Verification**:
- Deleting junction with 2 edges merges them
- Deleting junction with ≠2 edges deletes all edges
- Merged edge has combined waypoints
- No orphaned edges remain

---

### Task 3.5: Add Edge Splitting Tests

**File**: `src/utils/edgeSplitting.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';
import { splitWaypointsAtPosition, splitEdge, mergeEdges, isTooCloseToJunction } from './edgeSplitting';
import type { CircuitEdge, Waypoint, Position } from '../types/circuit';
import { createNodeId, createEdgeId } from '../types/identifiers';

describe('edgeSplitting', () => {
  describe('splitWaypointsAtPosition', () => {
    it('should split waypoints at closest segment', () => {
      const sourcePos: Position = { x: 0, y: 0 };
      const targetPos: Position = { x: 100, y: 0 };
      const waypoints: Waypoint[] = [
        { x: 25, y: 0 },
        { x: 50, y: 0 },
        { x: 75, y: 0 },
      ];
      const splitPosition: Position = { x: 40, y: 0 };

      const result = splitWaypointsAtPosition(sourcePos, targetPos, waypoints, splitPosition);

      expect(result.beforeWaypoints).toHaveLength(1);
      expect(result.afterWaypoints).toHaveLength(2);
    });

    it('should handle no waypoints', () => {
      const sourcePos: Position = { x: 0, y: 0 };
      const targetPos: Position = { x: 100, y: 0 };
      const waypoints: Waypoint[] = [];
      const splitPosition: Position = { x: 50, y: 0 };

      const result = splitWaypointsAtPosition(sourcePos, targetPos, waypoints, splitPosition);

      expect(result.beforeWaypoints).toHaveLength(0);
      expect(result.afterWaypoints).toHaveLength(0);
    });
  });

  describe('mergeEdges', () => {
    it('should merge two edges through junction', () => {
      const junctionId = createNodeId('junction-1');
      const edge1: CircuitEdge = {
        id: createEdgeId('edge-1'),
        source: createNodeId('node-1'),
        sourceHandle: 'right',
        target: junctionId,
        targetHandle: 'center',
        waypoints: [{ x: 10, y: 0 }],
      };
      const edge2: CircuitEdge = {
        id: createEdgeId('edge-2'),
        source: junctionId,
        sourceHandle: 'center',
        target: createNodeId('node-2'),
        targetHandle: 'left',
        waypoints: [{ x: 20, y: 0 }],
      };

      const merged = mergeEdges(edge1, edge2, junctionId);

      expect(merged.source).toBe(edge1.source);
      expect(merged.target).toBe(edge2.target);
      expect(merged.waypoints).toHaveLength(2);
    });
  });

  describe('isTooCloseToJunction', () => {
    it('should return true if within minimum distance', () => {
      const position: Position = { x: 10, y: 10 };
      const junctionPosition: Position = { x: 12, y: 10 };

      expect(isTooCloseToJunction(position, junctionPosition, 5)).toBe(true);
    });

    it('should return false if beyond minimum distance', () => {
      const position: Position = { x: 10, y: 10 };
      const junctionPosition: Position = { x: 20, y: 10 };

      expect(isTooCloseToJunction(position, junctionPosition, 5)).toBe(false);
    });
  });
});
```

**Verification**:
- All tests pass
- Edge cases handled correctly
- No regressions

---

## Testing Checklist

### Unit Tests
- [ ] splitWaypointsAtPosition works correctly
- [ ] splitEdge creates two edges
- [ ] mergeEdges combines waypoints
- [ ] isTooCloseToJunction calculates distance correctly

### Integration Tests
- [ ] Edge splits when junction created
- [ ] Waypoints distributed to correct segments
- [ ] Edges merge when junction deleted (2 edges)
- [ ] Edges deleted when junction deleted (≠2 edges)
- [ ] Waypoints not placed near junctions

### Visual Tests
- [ ] Split edges render correctly
- [ ] Merged edges have smooth path
- [ ] No visual glitches during split/merge

## Acceptance Criteria

- ✅ Edge splitting utility implemented
- ✅ Waypoint distribution works correctly
- ✅ Edge merging combines waypoints
- ✅ Junction deletion merges edges when possible
- ✅ Waypoints maintain 5px gap from junctions
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No console errors

## Next Phase

Proceed to **Phase 4: Visual Feedback** to implement connection highlighting and visual states.
