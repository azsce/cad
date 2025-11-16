# Phase 2: Connection System

## Overview

Implement connection logic for junctions, including starting connections from junctions, ending connections at junctions, and creating temporary junctions when clicking edges during connection mode.

## Tasks

### Task 2.1: Update Connection Store for Temporary Junctions

**File**: `src/store/connectionStore.ts`

#### Add Temporary Junction State

```typescript
interface ConnectionState {
  // ... existing fields
  isConnecting: boolean;
  sourceNode: NodeId | null;
  sourceHandle: string | null;
  sourcePosition: Position | null;
  waypoints: Waypoint[];
  cursorPosition: Position | null;
  lastDirection: 'horizontal' | 'vertical' | null;

  // NEW: Temporary junction state
  temporaryJunction: {
    position: Position;
    edgeId: EdgeId;
  } | null;

  // ... existing actions
  
  // NEW: Temporary junction actions
  createTemporaryJunction: (position: Position, edgeId: EdgeId) => void;
  clearTemporaryJunction: () => void;
}
```

#### Implement Temporary Junction Actions

```typescript
export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // ... existing state
  temporaryJunction: null,

  /**
   * Create a temporary junction at the specified position on an edge.
   * Called when user clicks an edge during connection mode.
   */
  createTemporaryJunction: (position, edgeId) => {
    logger.debug({ caller: 'connectionStore' }, 'Creating temporary junction', {
      position,
      edgeId,
    });

    set({
      temporaryJunction: {
        position,
        edgeId,
      },
    });
  },

  /**
   * Clear temporary junction (on cancel or completion).
   */
  clearTemporaryJunction: () => {
    set({
      temporaryJunction: null,
    });
  },

  /**
   * Update endConnecting to clear temporary junction.
   */
  endConnecting: () => {
    const { isConnecting, waypoints, cleanWaypoints, temporaryJunction } = get();

    if (!isConnecting) return null;

    const cleanedWaypoints = cleanWaypoints(waypoints);

    // Capture temporary junction before clearing
    const capturedTempJunction = temporaryJunction;

    set({
      isConnecting: false,
      sourceNode: null,
      sourceHandle: null,
      sourcePosition: null,
      waypoints: [],
      cursorPosition: null,
      lastDirection: null,
      temporaryJunction: null, // Clear temporary junction
    });

    return { 
      waypoints: cleanedWaypoints,
      temporaryJunction: capturedTempJunction, // Return for processing
    };
  },

  /**
   * Update cancelConnecting to clear temporary junction.
   */
  cancelConnecting: () => {
    logger.debug({ caller: 'connectionStore' }, 'Canceling connection');
    
    set({
      isConnecting: false,
      sourceNode: null,
      sourceHandle: null,
      sourcePosition: null,
      waypoints: [],
      cursorPosition: null,
      lastDirection: null,
      temporaryJunction: null, // Clear temporary junction
    });
  },
}));
```

**Verification**:
- Temporary junction state is managed correctly
- State is cleared on cancel/completion
- No memory leaks

---

### Task 2.2: Update ConnectableHandle for Junctions

**File**: `src/components/CircuitEditor/nodes/ConnectableHandle.tsx`

The existing ConnectableHandle should work with junction nodes without changes, since:
- Junction has a handle (id="center")
- Handle click starts/ends connections
- Validation checks node type

**Verification**:
- Can click junction handle to start connection
- Can click junction handle to end connection
- Connection validation works with junctions

---

### Task 2.3: Add Edge Click Handler

**File**: `src/components/CircuitEditor/edges/WireEdge/index.tsx`

#### Add Edge Click During Connection Mode

```typescript
import { useConnectionStore } from '../../../../store/connectionStore';

export const WireEdge = memo((props: EdgeProps) => {
  const { id, /* ... other props */ } = props;
  
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const createTemporaryJunction = useConnectionStore(state => state.createTemporaryJunction);
  const { screenToFlowPosition } = useReactFlow();
  const { onConnect } = useCircuitFlow();

  /**
   * Handle click on edge during connection mode.
   * Creates temporary junction and completes connection immediately.
   */
  const handleEdgeClickDuringConnection = useCallback((event: React.MouseEvent) => {
    if (!isConnecting) return;

    event.stopPropagation();

    // Get click position in flow coordinates
    const clickPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    logger.debug({ caller: 'WireEdge' }, 'Edge clicked during connection', {
      edgeId: id,
      clickPosition,
    });

    // Create temporary junction
    createTemporaryJunction(clickPosition, id);

    // Signal connection completion with edge target
    // This will be handled in connection handler to create real junction
    onConnect({
      targetEdgeId: id,
      targetPosition: clickPosition,
    });
  }, [isConnecting, id, createTemporaryJunction, screenToFlowPosition, onConnect]);

  // ... existing code

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? theme.palette.primary.main : theme.palette.text.primary,
          // Highlight edge during connection mode when hovered
          ...(isConnecting && isHovered && {
            strokeWidth: 4,
            stroke: theme.palette.success.main,
          }),
        }}
        interactionWidth={20}
        onClick={handleEdgeClickDuringConnection} // Add click handler
      />
      {/* ... rest of component */}
    </>
  );
});
```

**Verification**:
- Clicking edge during connection creates temporary junction
- Connection completes immediately
- Edge highlights when hovered during connection

---

### Task 2.4: Update Connection Handlers

**File**: `src/contexts/CircuitFlowContext/useConnectionHandlers.ts`

#### Handle Junction Endpoints and Edge Targets

```typescript
import { createNodeId, createEdgeId } from '../../types/identifiers';
import type { CircuitNode, JunctionNode } from '../../types/circuit';

/**
 * Connection type for edge targets (not handle targets)
 */
interface EdgeConnection {
  targetEdgeId: EdgeId;
  targetPosition: Position;
}

/**
 * Type guard for edge connections
 */
function isEdgeConnection(conn: Connection | EdgeConnection): conn is EdgeConnection {
  return 'targetEdgeId' in conn;
}

const onConnect = useCallback((connection: Connection | EdgeConnection) => {
  const result = useConnectionStore.getState().endConnecting();
  if (!result) return;

  const { waypoints, temporaryJunction } = result;

  logger.debug({ caller: 'useConnectionHandlers' }, 'Connection completed', {
    connection,
    waypointCount: waypoints.length,
    hasTemporaryJunction: Boolean(temporaryJunction),
  });

  // Case 1: Connecting to an edge (create junction)
  if (isEdgeConnection(connection)) {
    handleEdgeConnection(connection, waypoints, temporaryJunction);
    return;
  }

  // Case 2: Normal handle-to-handle or handle-to-junction connection
  if (!connection.source || !connection.target) return;
  if (!connection.sourceHandle || !connection.targetHandle) return;

  const newEdge: CircuitEdge = {
    id: createEdgeId(`edge-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`),
    source: connection.source,
    sourceHandle: connection.sourceHandle,
    target: connection.target,
    targetHandle: connection.targetHandle,
    ...(waypoints.length > 0 && { waypoints }),
  };

  addEdge(newEdge);
}, [addEdge]);

/**
 * Handle connection to an edge (creates junction and splits edge)
 */
function handleEdgeConnection(
  connection: EdgeConnection,
  waypoints: Waypoint[],
  temporaryJunction: { position: Position; edgeId: EdgeId } | null
) {
  if (!temporaryJunction) {
    logger.error({ caller: 'useConnectionHandlers' }, 'No temporary junction for edge connection');
    return;
  }

  const sourceNode = useConnectionStore.getState().sourceNode;
  const sourceHandle = useConnectionStore.getState().sourceHandle;

  if (!sourceNode || !sourceHandle) {
    logger.error({ caller: 'useConnectionHandlers' }, 'No source for edge connection');
    return;
  }

  // Create junction node at click position
  const junctionId = createNodeId(`junction-${Date.now()}`);
  const junctionNode: JunctionNode = {
    id: junctionId,
    type: 'junction',
    position: temporaryJunction.position,
    data: {}, // No label initially
  };

  // Add junction node
  addNode(junctionNode);

  // Split the target edge at junction
  splitEdgeAtJunction(
    temporaryJunction.edgeId,
    junctionId,
    temporaryJunction.position
  );

  // Create edge from source to junction
  const newEdge: CircuitEdge = {
    id: createEdgeId(`edge-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`),
    source: sourceNode,
    sourceHandle: sourceHandle,
    target: junctionId,
    targetHandle: 'center', // Junction's single handle
    ...(waypoints.length > 0 && { waypoints }),
  };

  addEdge(newEdge);

  logger.debug({ caller: 'useConnectionHandlers' }, 'Junction created on edge', {
    junctionId,
    edgeId: temporaryJunction.edgeId,
  });
}

/**
 * Split an edge at a junction point.
 * Creates two new edges: source->junction and junction->target.
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

  // Calculate waypoint distribution
  const { beforeWaypoints, afterWaypoints } = splitWaypointsAtPosition(
    edge.waypoints ?? [],
    junctionPosition
  );

  // Create edge from source to junction
  const edge1: CircuitEdge = {
    id: createEdgeId(`${edgeId}-before`),
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: junctionId,
    targetHandle: 'center',
    ...(beforeWaypoints.length > 0 && { waypoints: beforeWaypoints }),
  };

  // Create edge from junction to target
  const edge2: CircuitEdge = {
    id: createEdgeId(`${edgeId}-after`),
    source: junctionId,
    sourceHandle: 'center',
    target: edge.target,
    targetHandle: edge.targetHandle,
    ...(afterWaypoints.length > 0 && { waypoints: afterWaypoints }),
  };

  // Delete original edge
  deleteEdges([edgeId]);

  // Add new edges
  addEdge(edge1);
  addEdge(edge2);

  logger.debug({ caller: 'useConnectionHandlers' }, 'Edge split at junction', {
    originalEdge: edgeId,
    newEdges: [edge1.id, edge2.id],
  });
}

/**
 * Split waypoints at a position along the path.
 * Distributes waypoints to before/after segments based on proximity.
 */
function splitWaypointsAtPosition(
  waypoints: Waypoint[],
  splitPosition: Position
): { beforeWaypoints: Waypoint[]; afterWaypoints: Waypoint[] } {
  if (waypoints.length === 0) {
    return { beforeWaypoints: [], afterWaypoints: [] };
  }

  // Find closest waypoint to split position
  let closestIndex = 0;
  let minDistance = Infinity;

  waypoints.forEach((wp, index) => {
    const distance = Math.hypot(wp.x - splitPosition.x, wp.y - splitPosition.y);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  // Split at closest waypoint
  // Waypoints before (inclusive) go to first segment
  // Waypoints after go to second segment
  return {
    beforeWaypoints: waypoints.slice(0, closestIndex + 1),
    afterWaypoints: waypoints.slice(closestIndex + 1),
  };
}
```

**Verification**:
- Edge connections create junctions
- Edges split correctly
- Waypoints distributed properly
- Normal connections still work

---

### Task 2.5: Update Connection Validation

**File**: `src/components/CircuitEditor/CircuitEditorPane/useConnectionValidation.ts`

#### Allow Junction Connections

```typescript
import { isJunctionNode } from '../../../types/circuit';

export function useConnectionValidation(edges: CircuitEdge[]) {
  const isValidConnection = useCallback((connection: Connection) => {
    const { source, target, sourceHandle, targetHandle } = connection;

    // Must have source and target
    if (!source || !target) return false;

    // Cannot connect node to itself
    if (source === target) return false;

    // For junctions, handles might be 'center'
    // For components, handles are 'top', 'right', 'bottom', 'left'
    if (!sourceHandle || !targetHandle) return false;

    // Check if connection already exists
    const connectionExists = edges.some(
      edge =>
        (edge.source === source &&
          edge.sourceHandle === sourceHandle &&
          edge.target === target &&
          edge.targetHandle === targetHandle) ||
        (edge.source === target &&
          edge.sourceHandle === targetHandle &&
          edge.target === source &&
          edge.targetHandle === sourceHandle)
    );

    if (connectionExists) {
      logger.debug({ caller: 'useConnectionValidation' }, 'Connection already exists');
      return false;
    }

    return true;
  }, [edges]);

  return { isValidConnection };
}
```

**Verification**:
- Can connect handle to junction
- Can connect junction to junction
- Cannot create duplicate connections
- Cannot connect node to itself

---

### Task 2.6: Render Temporary Junction in ConnectionOverlay

**File**: `src/components/CircuitEditor/edges/ConnectionOverlay/index.tsx`

#### Add Temporary Junction Rendering

```typescript
import { TemporaryJunction } from '../../nodes/JunctionNode/TemporaryJunction';

export const ConnectionOverlay = memo(() => {
  const isConnecting = useConnectionStore((state) => state.isConnecting);
  const sourcePosition = useConnectionStore((state) => state.sourcePosition);
  const waypoints = useConnectionStore((state) => state.waypoints);
  const cursorPosition = useConnectionStore((state) => state.cursorPosition);
  const lastDirection = useConnectionStore((state) => state.lastDirection);
  const temporaryJunction = useConnectionStore((state) => state.temporaryJunction); // NEW

  // ... existing code

  if (!sourcePosition || !cursorPosition) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 1000,
        overflow: 'visible',
      }}
    >
      <g transform={`translate(${viewport.x},${viewport.y}) scale(${viewport.zoom})`}>
        <ConnectionPath pathData={pathData} strokeWidth={strokeWidth} dashArray={dashArray} />
        <WaypointMarkers waypoints={waypoints} radius={waypointRadius} strokeWidth={waypointStroke} />
        <CursorMarker position={cursorPosition} radius={cursorRadius} />
        
        {/* Render temporary junction if exists */}
        {temporaryJunction && (
          <TemporaryJunction position={temporaryJunction.position} />
        )}
      </g>
    </svg>
  );
});
```

**Verification**:
- Temporary junction appears when clicking edge
- Temporary junction has dashed outline
- Temporary junction disappears on cancel/completion

---

## Testing Checklist

### Unit Tests
- [ ] Connection store manages temporary junction state
- [ ] Temporary junction is cleared on cancel
- [ ] Temporary junction is cleared on completion
- [ ] Edge connection type guard works

### Integration Tests
- [ ] Can start connection from junction
- [ ] Can end connection at junction
- [ ] Clicking edge during connection creates temporary junction
- [ ] Temporary junction appears at click position
- [ ] Connection completes immediately after edge click
- [ ] Junction node is created
- [ ] Edge is split correctly
- [ ] Waypoints are distributed

### Visual Tests
- [ ] Temporary junction has dashed outline
- [ ] Temporary junction is semi-transparent
- [ ] Edge highlights when hovered during connection
- [ ] Connection line connects to temporary junction

## Acceptance Criteria

- ✅ Can connect handle to junction
- ✅ Can connect junction to handle
- ✅ Can connect junction to junction
- ✅ Clicking edge during connection creates junction
- ✅ Temporary junction renders correctly
- ✅ Edge splits at junction point
- ✅ Waypoints distributed properly
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No console errors

## Next Phase

Proceed to **Phase 3: Edge Splitting** to refine edge splitting logic and waypoint distribution.
