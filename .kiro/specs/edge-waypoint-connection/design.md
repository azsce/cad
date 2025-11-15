# Design Document: Edge Waypoint Connection System

## Executive Summary

This document provides a comprehensive design for implementing a "Proteus-style" waypoint-based edge connection system in the circuit editor. The design follows a dual-phase architecture that separates the temporary "drawing" state from the persistent "rendered" state, ensuring clean state management and optimal performance.

## Current Architecture Analysis

### Existing Edge Implementation

**File:** `src/components/CircuitEditor/edges/WireEdge.tsx`

**Current Capabilities:**
- Renders edges using `getSmoothStepPath` for smooth step-style routing
- Provides delete functionality via button on selected edges
- Uses `BaseEdge` component for rendering
- Integrates with `useCircuitFlow` hook for edge deletion

**Limitations:**
- No support for intermediate waypoints
- No custom path control beyond React Flow's built-in path functions
- No interactive path editing after creation
- Uses smooth step path which doesn't support explicit waypoint routing

### State Management Architecture

**File:** `src/contexts/CircuitFlowContext.tsx`

**Current Pattern:**
- Maintains independent local state for nodes/edges (not derived from store)
- Initializes from Zustand store only on mount
- All updates go through context functions that update BOTH local state AND store
- Position updates are batched - only sync to store when dragging stops
- Uses `useApplyNodeChanges` hook for node-specific logic

**Key Strengths:**
- Prevents infinite render loops by avoiding store-derived state
- Clean separation between React Flow UI state and persistent data
- Batched updates for performance optimization
- Well-documented state handoff pattern

### Data Model

**File:** `src/types/circuit.ts`

**Current CircuitEdge Structure:**
```typescript
interface CircuitEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}
```

**Missing:** No `waypoints` property or `data` field for storing intermediate points.

## Design Overview

### Dual-Phase Architecture

Following the research document (`docs/flow/connection.md`), the implementation requires two distinct phases:

#### Phase 1: Connection-in-Progress (Drawing Mode)
- **Purpose:** Manage temporary state while user creates connection
- **Duration:** From clicking source handle until completing/canceling connection
- **Components:** Global state store, event handlers, custom connection line component

#### Phase 2: Persistent Edge (Rendered Mode)
- **Purpose:** Render and enable editing of completed connections
- **Duration:** After connection is created, persists in circuit data
- **Components:** Custom edge type, edge data prop, interactive waypoint handles

### State Flow Diagram

```
User clicks source handle
    ↓
onConnectStart → ConnectionStore.startConnecting()
    ↓
[Connection Mode Active]
    ↓
User clicks canvas → onPaneClick → ConnectionStore.addWaypoint()
    ↓
ConnectionLine component renders multi-segment path
    ↓
User clicks target handle → onConnect
    ↓
ConnectionStore.endConnecting() returns waypoints
    ↓
Create CircuitEdge with waypoints in data prop
    ↓
WireEdge component renders persistent path
    ↓
[Normal Mode - Edge Editable]
```

## Detailed Design

### 1. Data Model Extensions

#### 1.1 CircuitEdge Type Enhancement

**File:** `src/types/circuit.ts`

```typescript
/**
 * Position coordinate in the flow canvas
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * A wire connection between circuit components (maps to React Flow edge).
 * Represents an electrical connection in the circuit.
 */
export interface CircuitEdge {
  /** Unique identifier for the edge */
  id: string;
  /** Source node ID */
  source: string;
  /** Source handle ID (terminal) */
  sourceHandle: string;
  /** Target node ID */
  target: string;
  /** Target handle ID (terminal) */
  targetHandle: string;
  /** Optional intermediate waypoints defining the edge path */
  waypoints?: Position[];
}
```

**Rationale:**
- Adding `waypoints` as optional property maintains backward compatibility
- Edges without waypoints render as direct connections (existing behavior)
- Type-safe position coordinates prevent runtime errors

### 2. Connection State Management

#### 2.1 Connection Store (Zustand)

**New File:** `src/store/connectionStore.ts`

```typescript
import { create } from 'zustand';

/**
 * Temporary state for connection-in-progress
 */
interface ConnectionState {
  /** Whether a connection is currently being created */
  isConnecting: boolean;
  /** Source node ID */
  sourceNode: string | null;
  /** Source handle ID */
  sourceHandle: string | null;
  /** Accumulated waypoints during drawing */
  waypoints: Position[];
  
  // Actions
  startConnecting: (sourceNode: string, sourceHandle: string | null) => void;
  addWaypoint: (point: Position) => void;
  endConnecting: () => { waypoints: Position[] } | null;
  cancelConnecting: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  isConnecting: false,
  sourceNode: null,
  sourceHandle: null,
  waypoints: [],

  startConnecting: (sourceNode, sourceHandle) => {
    set({
      isConnecting: true,
      sourceNode,
      sourceHandle,
      waypoints: [],
    });
  },

  addWaypoint: (point) => {
    set((state) => {
      if (!state.isConnecting) return state;
      return {
        waypoints: [...state.waypoints, point],
      };
    });
  },

  endConnecting: () => {
    const { isConnecting, waypoints } = get();
    if (!isConnecting) return null;

    const capturedWaypoints = [...waypoints];
    
    set({
      isConnecting: false,
      sourceNode: null,
      sourceHandle: null,
      waypoints: [],
    });

    return { waypoints: capturedWaypoints };
  },

  cancelConnecting: () => {
    set({
      isConnecting: false,
      sourceNode: null,
      sourceHandle: null,
      waypoints: [],
    });
  },
}));
```

**Design Decisions:**
- Separate store from CircuitFlowContext to avoid coupling
- Idempotent `endConnecting` can be called multiple times safely
- Explicit `cancelConnecting` for Escape key handling
- Returns captured waypoints for handoff to edge creation

### 3. CircuitFlowContext Enhancements

#### 3.1 Event Handler Integration

**File:** `src/contexts/CircuitFlowContext.tsx`

**New Imports:**
```typescript
import { useConnectionStore } from '../store/connectionStore';
```

**New Event Handlers:**

```typescript
/**
 * Handle connection start - enter drawing mode
 */
const onConnectStart = useCallback(
  (_event: unknown, params: { nodeId: string | null; handleId: string | null }) => {
    if (!params.nodeId || !params.handleId) return;
    
    logger.debug({ caller: 'CircuitFlowContext' }, 'Connection started', {
      nodeId: params.nodeId,
      handleId: params.handleId,
    });
    
    useConnectionStore.getState().startConnecting(params.nodeId, params.handleId);
  },
  []
);

/**
 * Handle pane click - add waypoint if in connection mode
 */
const onPaneClick = useCallback(
  (event: React.MouseEvent) => {
    const { isConnecting } = useConnectionStore.getState();
    
    if (!isConnecting) return;
    
    // Get click position in flow coordinates using reactFlowInstance from useReactFlow hook
    const reactFlowInstance = useReactFlow();
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    logger.debug({ caller: 'CircuitFlowContext' }, 'Waypoint added', { position });
    
    useConnectionStore.getState().addWaypoint(position);
  },
  []
);

/**
 * Handle connection end - cancel if not on valid target
 */
const onConnectEnd = useCallback(
  (event: MouseEvent | TouchEvent) => {
    const { isConnecting } = useConnectionStore.getState();
    
    if (!isConnecting) return;
    
    // Check if ended on a valid target handle
    const target = event.target as HTMLElement;
    const isHandle = target.classList.contains('react-flow__handle');
    
    if (!isHandle) {
      // Didn't end on a handle - cancel connection
      logger.debug({ caller: 'CircuitFlowContext' }, 'Connection cancelled - no target handle');
      useConnectionStore.getState().cancelConnecting();
    }
  },
  []
);
```

**Modified onConnect Handler:**

```typescript
/**
 * Handle successful connection - create edge with waypoints
 * This is the "state handoff" point where temporary waypoints become persistent
 */
const onConnect = useCallback(
  (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (!connection.sourceHandle || !connection.targetHandle) return;

    // Get waypoints from connection store and reset state
    const result = useConnectionStore.getState().endConnecting();
    const waypoints = result?.waypoints ?? [];

    logger.debug({ caller: 'CircuitFlowContext' }, 'Creating edge with waypoints', {
      connection,
      waypointCount: waypoints.length,
    });

    const timestamp = Date.now().toString();
    const randomPart = crypto.randomUUID().substring(0, 8);
    const newEdge: CircuitEdge = {
      id: `edge-${timestamp}-${randomPart}`,
      source: connection.source,
      sourceHandle: connection.sourceHandle,
      target: connection.target,
      targetHandle: connection.targetHandle,
      ...(waypoints.length > 0 && { waypoints }),
    };

    addEdge(newEdge);
  },
  [addEdge]
);
```

**Keyboard Handler for Escape:**

```typescript
/**
 * Handle keyboard events for connection mode
 */
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      const { isConnecting } = useConnectionStore.getState();
      
      if (isConnecting) {
        event.preventDefault();
        logger.debug({ caller: 'CircuitFlowContext' }, 'Connection cancelled via Escape');
        useConnectionStore.getState().cancelConnecting();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

#### 3.2 Edge Update Method

**New Method for Updating Edges:**

```typescript
/**
 * Update edge data - updates both local state AND store
 * Used for waypoint editing after edge creation
 */
const updateEdge = useCallback((edgeId: string, updates: Partial<CircuitEdge>) => {
  logger.debug({ caller: 'CircuitFlowContext' }, 'updateEdge', { edgeId, updates });
  
  // Update local state
  setEdges((current) =>
    current.map((edge) =>
      edge.id === edgeId
        ? { ...edge, data: { ...edge.data, ...updates } }
        : edge
    )
  );
  
  // Update store
  useCircuitStore.getState().updateEdge(circuitId, edgeId, updates);
}, [circuitId]);
```

**Updated Context Value:**

```typescript
const value: CircuitFlowContextValue = {
  nodes,
  edges,
  helperLines,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectStart,
  onPaneClick,
  onConnectEnd,
  addNode,
  addEdge,
  updateNodeData,
  updateEdge,
  deleteNodes,
  deleteEdges,
};
```

**Design Rationale:**
- Follows the existing project pattern: update local state immediately, then sync to store
- `updateEdge` method mirrors the existing `updateNodeData` pattern
- Edge component calls `updateEdge` from context, not direct store access
- Maintains the "single source of truth" principle through context orchestration

### 4. Custom Connection Line Component

#### 4.1 WaypointConnectionLine Component

**New File:** `src/components/CircuitEditor/edges/WaypointConnectionLine.tsx`

```typescript
import { memo, useMemo } from 'react';
import { useConnectionStore } from '../../../store/connectionStore';
import type { ConnectionLineComponentProps } from '@xyflow/react';

/**
 * Custom connection line that renders multi-segment path with waypoints
 */
export const WaypointConnectionLine = memo((props: ConnectionLineComponentProps) => {
  const { fromX, fromY, toX, toY } = props;
  
  // Subscribe to waypoints from connection store
  const waypoints = useConnectionStore((state) => state.waypoints);
  
  // Build SVG path with waypoints
  const path = useMemo(() => {
    let d = `M ${fromX},${fromY}`;
    
    // Add line segments for each waypoint
    waypoints.forEach((point) => {
      d += ` L ${point.x},${point.y}`;
    });
    
    // Final segment to cursor
    d += ` L ${toX},${toY}`;
    
    return d;
  }, [fromX, fromY, toX, toY, waypoints]);
  
  return (
    <g>
      {/* Main connection line (dashed to indicate temporary) */}
      <path
        d={path}
        fill="none"
        stroke="#2563eb"
        strokeWidth={2}
        strokeDasharray="5 5"
        strokeLinecap="round"
      />
      
      {/* Waypoint markers */}
      {waypoints.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={4}
          fill="#2563eb"
          stroke="#fff"
          strokeWidth={2}
        />
      ))}
    </g>
  );
});

WaypointConnectionLine.displayName = 'WaypointConnectionLine';
```

**Design Decisions:**
- Dashed line style indicates temporary "drawing" state
- Visible waypoint markers provide clear feedback
- Memoized path calculation for performance
- Uses Zustand selector for efficient re-renders

### 5. Enhanced WireEdge Component

#### 5.1 WireEdge with Waypoint Support

**File:** `src/components/CircuitEditor/edges/WireEdge.tsx`

```typescript
import { memo, useCallback, useMemo, useState, useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, useReactFlow, type EdgeProps } from '@xyflow/react';
import { IconButton, useTheme } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useCircuitFlow } from '../../../hooks/useCircuitFlow';
import type { Position } from '../../../types/circuit';

/**
 * Custom edge component with waypoint support
 * Follows project pattern: updates go through CircuitFlowContext
 */
export const WireEdge = memo((props: EdgeProps) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    selected,
    data,
  } = props;
  
  const theme = useTheme();
  const { screenToFlowPosition } = useReactFlow();
  const { deleteEdges, updateEdge } = useCircuitFlow();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragStartPos = useRef<Position | null>(null);
  
  // Extract waypoints from edge data
  const waypoints = (data?.waypoints as Position[] | undefined) ?? [];
  
  // Build complete path with waypoints
  const path = useMemo(() => {
    const allPoints: Position[] = [
      { x: sourceX, y: sourceY },
      ...waypoints,
      { x: targetX, y: targetY },
    ];
    
    let d = `M ${allPoints[0].x},${allPoints[0].y}`;
    
    allPoints.slice(1).forEach((point) => {
      d += ` L ${point.x},${point.y}`;
    });
    
    return d;
  }, [sourceX, sourceY, targetX, targetY, waypoints]);
  
  // Calculate label position (midpoint of path)
  const labelPosition = useMemo(() => {
    const allPoints = [
      { x: sourceX, y: sourceY },
      ...waypoints,
      { x: targetX, y: targetY },
    ];
    
    const midIndex = Math.floor(allPoints.length / 2);
    return allPoints[midIndex];
  }, [sourceX, sourceY, targetX, targetY, waypoints]);
  
  // Handle delete button click
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteEdges([id]);
    },
    [id, deleteEdges]
  );
  
  // Handle waypoint drag start
  const handleWaypointPointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.stopPropagation();
      setDraggingIndex(index);
      dragStartPos.current = waypoints[index];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [waypoints]
  );
  
  // Handle waypoint drag (batched - only updates local state during drag)
  const handleWaypointPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex === null) return;
      
      // Convert screen coordinates to flow coordinates
      const flowPosition = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      
      // Update waypoint position - this will trigger local state update only
      const newWaypoints = [...waypoints];
      newWaypoints[draggingIndex] = flowPosition;
      
      // Update through context (local state only during drag)
      updateEdge(id, { waypoints: newWaypoints });
    },
    [draggingIndex, waypoints, id, updateEdge, screenToFlowPosition]
  );
  
  // Handle waypoint drag end (sync to store)
  const handleWaypointPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex === null) return;
      
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      
      // Final position update - this syncs to store
      const flowPosition = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      
      const newWaypoints = [...waypoints];
      newWaypoints[draggingIndex] = flowPosition;
      
      // Update through context (syncs to store on drag end)
      updateEdge(id, { waypoints: newWaypoints });
      
      setDraggingIndex(null);
      dragStartPos.current = null;
    },
    [draggingIndex, waypoints, id, updateEdge, screenToFlowPosition]
  );
  
  // Handle waypoint double-click (remove waypoint)
  const handleWaypointDoubleClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      
      const newWaypoints = waypoints.filter((_, i) => i !== index);
      
      // Update through context (syncs to store immediately)
      updateEdge(id, { waypoints: newWaypoints });
    },
    [waypoints, id, updateEdge]
  );
  
  return (
    <>
      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={path}
        style={{
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? theme.palette.primary.main : theme.palette.text.primary,
        }}
        interactionWidth={20}
      />
      
      {/* Waypoint handles (only when selected) */}
      {selected && waypoints.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={6}
          fill={theme.palette.primary.main}
          stroke={theme.palette.background.paper}
          strokeWidth={2}
          style={{ cursor: 'move' }}
          onPointerDown={(e) => handleWaypointPointerDown(e, index)}
          onPointerMove={handleWaypointPointerMove}
          onPointerUp={handleWaypointPointerUp}
          onDoubleClick={(e) => handleWaypointDoubleClick(e, index)}
        />
      ))}
      
      {/* Delete button */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelPosition.x}px,${labelPosition.y}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <IconButton
              onClick={handleDelete}
              size="small"
              sx={{
                width: 20,
                height: 20,
                padding: 0,
                bgcolor: theme.palette.error.main,
                color: theme.palette.error.contrastText,
                '&:hover': {
                  bgcolor: theme.palette.error.dark,
                },
                '& .MuiSvgIcon-root': {
                  fontSize: 14,
                },
              }}
            >
              <Close />
            </IconButton>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

WireEdge.displayName = 'WireEdge';
```

**Key Features:**
- Renders polyline path through all waypoints
- Draggable waypoint handles when edge is selected
- Double-click waypoint to remove it
- Delete button positioned at path midpoint
- Backward compatible (works without waypoints)

**Design Pattern (Following Project Architecture):**
- Uses `useCircuitFlow()` hook to access `updateEdge` method
- Updates go through CircuitFlowContext, not direct store access
- Uses `screenToFlowPosition` for proper coordinate conversion
- Batched updates: drag updates local state, final position syncs to store
- Mirrors the existing node dragging pattern from `useApplyNodeChanges`

### 6. CircuitEditorPane Integration

#### 6.1 React Flow Configuration

**File:** `src/components/CircuitEditor/CircuitEditorPane.tsx`

**Import Changes:**
```typescript
import { WaypointConnectionLine } from './edges/WaypointConnectionLine';
```

**ReactFlow Props:**
```typescript
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onConnectStart={onConnectStart}
  onPaneClick={onPaneClick}
  onConnectEnd={onConnectEnd}
  onDragOver={onDragOver}
  onDrop={onDrop}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  connectionLineComponent={WaypointConnectionLine}
  connectOnClick={true}
  isValidConnection={isValidConnection}
  attributionPosition="bottom-left"
  deleteKeyCode={null}
>
```

**Critical Props:**
- `connectOnClick={true}` - Enables click-to-connect mode
- `connectionLineComponent={WaypointConnectionLine}` - Custom drawing line
- `onConnectStart`, `onPaneClick`, `onConnectEnd` - Waypoint event handlers

### 7. Store Updates

#### 7.1 CircuitStore Edge Update Method

**File:** `src/store/circuitStore.ts`

**New Method:**
```typescript
/**
 * Update an existing edge
 */
updateEdge: (circuitId: string, edgeId: string, updates: Partial<CircuitEdge>) => {
  set((state) => {
    const circuit = state.circuits[circuitId];
    if (!circuit) return state;

    const updatedEdges = circuit.edges.map((edge) =>
      edge.id === edgeId ? { ...edge, ...updates } : edge
    );

    return {
      circuits: {
        ...state.circuits,
        [circuitId]: {
          ...circuit,
          edges: updatedEdges,
          modifiedAt: Date.now(),
        },
      },
    };
  });
},
```

## Implementation Strategy

### Phase 1: Foundation (Minimal Viable Feature)
1. Add `waypoints` property to `CircuitEdge` type
2. Create `connectionStore.ts` with basic state management
3. Add `WaypointConnectionLine` component
4. Update `CircuitFlowContext` with event handlers
5. Configure `CircuitEditorPane` with `connectOnClick` and handlers

**Deliverable:** Users can create edges with waypoints by clicking

### Phase 2: Persistence
1. Add `updateEdge` method to `circuitStore`
2. Update `WireEdge` to render waypoint-based paths
3. Ensure waypoints persist in store and reload correctly

**Deliverable:** Waypoints are saved and restored with circuits

### Phase 3: Editing
1. Add draggable waypoint handles to `WireEdge`
2. Implement waypoint drag logic with store updates
3. Add double-click to remove waypoints

**Deliverable:** Users can edit waypoints after creation

### Phase 4: Polish
1. Add visual feedback (cursor changes, status messages)
2. Implement connection validation
3. Add keyboard shortcuts and accessibility
4. Performance optimization

**Deliverable:** Production-ready feature with full UX

## Testing Strategy

### Unit Tests
- `connectionStore`: State transitions, action behavior
- `WaypointConnectionLine`: Path generation with various waypoint counts
- `WireEdge`: Path generation, waypoint rendering

### Integration Tests
- Connection flow: Start → Add waypoints → Complete
- Store synchronization: Local state ↔ Zustand store
- Edge editing: Drag waypoints, remove waypoints

### E2E Tests
- Create connection with 0, 1, 3, 5 waypoints
- Edit existing connection waypoints
- Cancel connection with Escape
- Delete edge with waypoints
- Save and reload circuit with waypoints

## Performance Considerations

### Optimization Strategies

1. **Memoization**
   - Path calculation in `useMemo`
   - Waypoint positions in `useMemo`
   - Event handlers in `useCallback`

2. **Selective Rendering**
   - Waypoint handles only render when edge is selected
   - Connection line only renders during drawing mode

3. **Batched Updates**
   - Waypoint drag updates local state immediately
   - Store sync only on drag end (similar to node dragging)

4. **Zustand Selectors**
   - Use granular selectors to prevent unnecessary re-renders
   - `useConnectionStore((state) => state.waypoints)` instead of full state

## Migration Path

### Backward Compatibility

**Existing Edges:**
- Edges without `waypoints` property render as direct connections
- No migration script needed
- Gradual adoption as users create new connections

**Data Structure:**
```typescript
// Old edge (still works)
{ id: '1', source: 'a', target: 'b', sourceHandle: 'h1', targetHandle: 'h2' }

// New edge (with waypoints)
{ 
  id: '2', 
  source: 'a', 
  target: 'b', 
  sourceHandle: 'h1', 
  targetHandle: 'h2',
  waypoints: [{ x: 100, y: 100 }, { x: 200, y: 150 }]
}
```

## Risk Analysis

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Infinite render loops from store updates | High | Use independent local state pattern (already established) |
| Performance degradation with many waypoints | Medium | Memoization, selective rendering, batched updates |
| Coordinate system misalignment | High | Use `screenToFlowPosition` consistently |
| State synchronization bugs | High | Comprehensive integration tests, clear state handoff |

### UX Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Confusing connection mode | Medium | Clear visual indicators, status messages |
| Accidental waypoint creation | Low | Require deliberate clicks, provide undo |
| Difficult waypoint editing | Medium | Large hit targets, visual feedback |

## Future Enhancements

### Post-MVP Features

1. **Orthogonal Routing**
   - Snap waypoints to horizontal/vertical grid
   - Auto-generate right-angle paths

2. **Smart Waypoint Insertion**
   - Double-click edge segment to add waypoint
   - Auto-calculate optimal insertion point

3. **Waypoint Snapping**
   - Snap to grid
   - Snap to other waypoints
   - Snap to node edges

4. **Path Simplification**
   - Auto-remove redundant waypoints
   - Optimize path on node movement

5. **Undo/Redo**
   - Track waypoint changes
   - Integrate with global undo system

## Conclusion

This design provides a comprehensive, production-ready architecture for implementing waypoint-based edge connections. The dual-phase approach cleanly separates drawing state from persistent state, preventing common pitfalls like infinite render loops while maintaining optimal performance.

The design leverages existing patterns in the codebase (independent local state, batched updates, Zustand store) and introduces minimal new concepts, ensuring maintainability and consistency with the current architecture.

### 8. Hook Interface Updates

#### 8.1 useCircuitFlow Hook

**File:** `src/hooks/useCircuitFlow.ts`

**Updated Interface:**

```typescript
export interface CircuitFlowContextValue {
  nodes: Node[];
  edges: Edge[];
  helperLines: { horizontal?: number; vertical?: number };
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onConnectStart: (event: unknown, params: { nodeId: string | null; handleId: string | null }) => void;
  onPaneClick: (event: React.MouseEvent) => void;
  onConnectEnd: (event: MouseEvent | TouchEvent) => void;
  addNode: (node: CircuitNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  updateNodeData: (nodeId: string, dataUpdates: Partial<CircuitNode['data']>) => void;
  updateEdge: (edgeId: string, updates: Partial<CircuitEdge>) => void;
  deleteNodes: (nodeIds: string[]) => void;
  deleteEdges: (edgeIds: string[]) => void;
}
```

**New Methods:**
- `onConnectStart` - Initiates connection drawing mode
- `onPaneClick` - Handles waypoint placement during connection
- `onConnectEnd` - Handles connection cancellation
- `updateEdge` - Updates edge properties (including waypoints)

## References

1. Research Document: `docs/flow/connection.md` - Proteus-style connection architecture
2. React Flow Documentation: Connection handling, custom edges, event system
3. Existing Codebase: `CircuitFlowContext.tsx`, `useApplyNodeChanges.ts`, `WireEdge.tsx`
4. Project Pattern: Independent local state with batched store synchronization
