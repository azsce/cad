# Current Connection Mechanism - Technical Deep Dive

## Overview

The current connection system implements a **click-to-connect** workflow with **waypoint support** and **orthogonal routing**. This document provides a comprehensive analysis of how it works.

## Architecture Components

### 1. Connection Store (`src/store/connectionStore.ts`)

**Purpose**: Manages temporary state during connection drawing (Phase 1 of dual-phase architecture)

**State**:
```typescript
interface ConnectionState {
  isConnecting: boolean;              // Connection mode active?
  sourceNode: NodeId | null;          // Source node ID
  sourceHandle: string | null;        // Source handle ID
  sourcePosition: Position | null;    // Source handle position (flow coords)
  waypoints: Waypoint[];              // Accumulated waypoints
  cursorPosition: Position | null;    // Current cursor position
  lastDirection: 'horizontal' | 'vertical' | null; // Movement direction
}
```

**Key Actions**:
- `startConnecting()` - Enter connection mode
- `addWaypoint()` - Add waypoint (manual or auto)
- `updateCursorPosition()` - Track cursor and create auto-waypoints
- `cleanWaypoints()` - Remove redundant waypoints
- `endConnecting()` - Complete connection (returns waypoints)
- `cancelConnecting()` - Cancel connection (ESC key)

**Auto-Waypoint Logic**:
```typescript
// Direction locking with 20px threshold
if (!lastDirection) {
  // Establish direction after significant movement
  if (deltaX > 20 || deltaY > 20) {
    lastDirection = deltaX >= deltaY ? 'horizontal' : 'vertical';
  }
} else {
  // Check for perpendicular movement
  if (lastDirection === 'horizontal' && deltaY > 20) {
    // Create turn waypoint at intersection
    addWaypoint({ x: cursor.x, y: lastPos.y }, true);
    lastDirection = null; // Reset for next segment
  }
}
```

### 2. ConnectableHandle (`src/components/CircuitEditor/nodes/ConnectableHandle.tsx`)

**Purpose**: Wraps React Flow Handle with click-to-connect behavior

**Behavior**:
```typescript
onClick = (event) => {
  if (isConnecting) {
    // Complete connection to this handle
    onConnect({
      source: sourceNode,
      sourceHandle,
      target: nodeId,
      targetHandle: handleId,
    });
  } else {
    // Start connection from this handle
    const handlePosition = getHandlePosition(event);
    startConnection(nodeId, handleId, handlePosition);
  }
}
```

**Visual Feedback**:
- Cursor: `crosshair` when not connecting, `pointer` when connecting
- Highlight: Red border when connected to selected edge

### 3. Connection Handlers (`src/contexts/CircuitFlowContext/useConnectionHandlers.ts`)

**Purpose**: Orchestrates connection-related events

**Handlers**:

#### `onPaneClick`
```typescript
// Add waypoint when clicking canvas during connection
if (isConnecting) {
  const flowPosition = screenToFlowPosition({ x, y });
  addWaypoint(flowPosition, false); // Manual waypoint
}
```

#### `onPaneMouseMove`
```typescript
// Update cursor position (triggers auto-waypoint logic)
if (isConnecting) {
  const flowPosition = screenToFlowPosition({ x, y });
  updateCursorPosition(flowPosition);
}
```

#### `startConnection`
```typescript
// Programmatic connection start (called by ConnectableHandle)
startConnecting(nodeId, handleId, handlePosition);
```

#### `onConnect`
```typescript
// Complete connection and create edge
const connectionData = endConnecting(); // Get waypoints from store
if (!connectionData) return;

const newEdge = {
  id: createEdgeId(),
  source,
  sourceHandle,
  target,
  targetHandle,
  data: {
    waypoints: connectionData.waypoints, // Handoff to Phase 2
  },
};

addEdge(newEdge);
```

### 4. Keyboard Handler (`src/contexts/CircuitFlowContext/useKeyboardHandler.ts`)

**Purpose**: Handle ESC key to cancel connection

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isConnecting) {
      event.preventDefault();
      event.stopPropagation();
      cancelConnecting();
    }
  };
  
  // Use capture phase for priority
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
}, [isConnecting, cancelConnecting]);
```

### 5. Connection Overlay (`src/components/CircuitEditor/edges/ConnectionOverlay.tsx`)

**Purpose**: Render connection line preview during drawing

**Rendering**:
```typescript
if (!isConnecting || !sourcePosition || !cursorPosition) {
  return null;
}

// Build path: source → waypoints → cursor
const path = buildConnectionPath(sourcePosition, waypoints, cursorPosition);

return (
  <svg>
    {/* Connection line */}
    <path d={path} stroke="blue" strokeWidth={2} />
    
    {/* Waypoint markers */}
    {waypoints.map((wp, i) => (
      <circle key={i} cx={wp.x} cy={wp.y} r={4} fill="blue" />
    ))}
    
    {/* Cursor indicator */}
    <circle cx={cursorPosition.x} cy={cursorPosition.y} r={6} fill="red" />
  </svg>
);
```

### 6. WireEdge (`src/components/CircuitEditor/edges/WireEdge/`)

**Purpose**: Render edges with waypoints and orthogonal routing

**Path Calculation**:
```typescript
// Simple path (no waypoints)
if (waypoints.length === 0) {
  return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
}

// Waypoint path (orthogonal routing)
const points = [
  { x: sourceX, y: sourceY },
  ...waypoints,
  { x: targetX, y: targetY },
];

// Build orthogonal path using waypoint directions
let path = `M ${points[0].x},${points[0].y}`;
for (let i = 1; i < points.length; i++) {
  const prev = points[i - 1];
  const curr = points[i];
  const waypoint = waypoints[i - 1];
  
  if (waypoint?.direction === 'horizontal') {
    // Horizontal then vertical
    path += ` L ${curr.x},${prev.y} L ${curr.x},${curr.y}`;
  } else {
    // Vertical then horizontal
    path += ` L ${prev.x},${curr.y} L ${curr.x},${curr.y}`;
  }
}

return path;
```

## Connection Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CONNECTION FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. USER CLICKS SOURCE HANDLE
   │
   ├─→ ConnectableHandle.onClick()
   │   └─→ startConnection(nodeId, handleId, position)
   │       └─→ connectionStore.startConnecting()
   │           └─→ isConnecting = true
   │
   ↓

2. CONNECTION MODE ACTIVE
   │
   ├─→ Cursor changes to crosshair
   ├─→ ConnectionOverlay renders preview line
   │
   ├─→ USER MOVES MOUSE
   │   └─→ onPaneMouseMove()
   │       └─→ updateCursorPosition()
   │           ├─→ Establish direction (after 20px)
   │           └─→ Create auto-waypoint on direction change
   │
   ├─→ USER CLICKS CANVAS
   │   └─→ onPaneClick()
   │       └─→ addWaypoint(position, false) // Manual
   │
   ├─→ USER PRESSES ESC
   │   └─→ handleKeyDown()
   │       └─→ cancelConnecting()
   │           └─→ isConnecting = false
   │
   ↓

3. USER CLICKS TARGET HANDLE
   │
   ├─→ ConnectableHandle.onClick()
   │   └─→ onConnect({ source, target, ... })
   │       ├─→ connectionData = endConnecting()
   │       │   ├─→ cleanWaypoints() // Remove redundant
   │       │   └─→ return { waypoints }
   │       │
   │       ├─→ Create edge with waypoints
   │       └─→ addEdge(newEdge)
   │           ├─→ Update React Flow state
   │           └─→ Update Zustand store
   │
   ↓

4. CONNECTION COMPLETE
   │
   └─→ isConnecting = false
       └─→ Edge rendered with waypoints
```

## Waypoint System

### Waypoint Data Structure

```typescript
interface Waypoint extends Position {
  x: number;
  y: number;
  auto?: boolean;  // true = auto-created, false/undefined = manual
  direction?: 'horizontal' | 'vertical';  // Segment direction TO this waypoint
}
```

### Waypoint Types

1. **Manual Waypoints**:
   - Created by user clicking canvas
   - `auto: false` or `auto: undefined`
   - Never removed by cleaning algorithm
   - Preserved during edge operations

2. **Auto Waypoints**:
   - Created automatically on direction changes
   - `auto: true`
   - Can be removed by cleaning algorithm if redundant
   - Threshold: 20px perpendicular movement

### Waypoint Cleaning Algorithm

```typescript
function cleanWaypoints(waypoints: Waypoint[]): Waypoint[] {
  const cleaned: Waypoint[] = [];
  
  for (let i = 0; i < waypoints.length; i++) {
    const current = waypoints[i];
    const prev = cleaned[cleaned.length - 1];
    const next = waypoints[i + 1];
    
    // Always keep first waypoint
    if (!prev) {
      cleaned.push(current);
      continue;
    }
    
    // Skip duplicate positions (favor manual over auto)
    if (isSamePosition(prev, current)) {
      if (!current.auto && prev.auto) {
        cleaned[cleaned.length - 1] = current; // Replace with manual
      }
      continue;
    }
    
    // Skip redundant auto waypoints on straight lines
    if (next && current.auto && isRedundantPoint(prev, current, next)) {
      continue;
    }
    
    // Keep this waypoint
    cleaned.push(current);
  }
  
  return cleaned;
}

function isRedundantPoint(prev, current, next): boolean {
  // Check if three points form a straight line
  const isHorizontalLine = prev.y === current.y && current.y === next.y;
  const isVerticalLine = prev.x === current.x && current.x === next.x;
  return isHorizontalLine || isVerticalLine;
}
```

### Direction Metadata

Each waypoint stores the direction of the segment **leading to** it:

```
Source ──horizontal──> WP1 ──vertical──> WP2 ──horizontal──> Target
                       ↑                  ↑
                  direction: 'horizontal'  direction: 'vertical'
```

**Purpose**:
- Maintains routing consistency
- Prevents path flipping during operations
- Used by path builder to create orthogonal routes

## State Synchronization

### Dual-Phase Architecture

**Phase 1: Drawing (Temporary State)**
- Managed by `connectionStore`
- Waypoints accumulated during drawing
- State cleared on completion or cancellation

**Phase 2: Rendering (Persistent State)**
- Waypoints stored in `edge.data.waypoints`
- Managed by React Flow state and Zustand store
- Persisted to localStorage

### State Handoff

```typescript
// Phase 1 → Phase 2 handoff
const connectionData = endConnecting(); // Get from connectionStore
const newEdge = {
  ...edgeProps,
  data: {
    waypoints: connectionData.waypoints, // Handoff to edge data
  },
};
addEdge(newEdge); // Store in React Flow + Zustand
```

### Store Updates

```typescript
// Both React Flow state AND Zustand store are updated
const addEdge = (edge: CircuitEdge) => {
  // Update React Flow state (local)
  setEdges((edges) => [...edges, edge]);
  
  // Update Zustand store (persistent)
  circuitStore.addEdge(circuitId, edge);
};
```

## Coordinate Systems

### Screen Coordinates
- Mouse event `clientX`, `clientY`
- Relative to viewport

### Flow Coordinates
- React Flow's internal coordinate system
- Accounts for zoom and pan
- Conversion: `screenToFlowPosition({ x, y })`

### Handle Position Calculation

```typescript
function getHandlePosition(event: MouseEvent): Position {
  const handleElement = event.currentTarget;
  const rect = handleElement.getBoundingClientRect();
  
  // Center of handle in screen coordinates
  const screenPos = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  
  // Convert to flow coordinates
  return screenToFlowPosition(screenPos);
}
```

## Validation

### Connection Validation

```typescript
function isValidConnection(sourceNode, targetNode): boolean {
  // Cannot connect node to itself
  return sourceNode !== targetNode;
}
```

**Note**: Currently only checks self-connection. Could be extended to:
- Prevent duplicate connections
- Enforce component-specific rules
- Check electrical compatibility

## Performance Optimizations

### Memoization

```typescript
// Memoize waypoints extraction
const waypoints = useMemo(() => {
  const edgeData = data as { waypoints?: Waypoint[] } | undefined;
  return edgeData?.waypoints ?? [];
}, [data]);

// Memoize path calculation
const path = useMemo(() => {
  return buildPath(sourceX, sourceY, targetX, targetY, waypoints);
}, [sourceX, sourceY, targetX, targetY, waypoints]);

// Memoize event handlers
const handleClick = useCallback((event) => {
  // Handler logic
}, [dependencies]);
```

### Batching

Position updates during drag are batched - only synced to store when dragging stops:

```typescript
const onNodesChange = useCallback((changes) => {
  const hasDragEnd = changes.some(
    c => c.type === 'position' && c.dragging === false
  );
  
  // Update local state immediately
  setNodes(current => applyNodeChanges(changes, current));
  
  // Sync to store only on drag end
  if (hasDragEnd) {
    flushPositionUpdates();
  }
}, []);
```

## Limitations & Known Issues

### Current Limitations

1. **Handle-to-Handle Only**: Cannot connect to wires mid-segment
2. **No Junction Nodes**: Cannot create wire branches
3. **Fixed Handle Count**: Components have predefined handles
4. **No Multi-Connection**: One connection per handle pair

### Edge Cases Handled

✅ **Self-Connection Prevention**: Cannot connect node to itself
✅ **ESC Cancellation**: Robust ESC key handling with capture phase
✅ **Waypoint Cleaning**: Removes redundant auto-waypoints
✅ **Direction Locking**: Prevents path flipping during drawing
✅ **Duplicate Waypoints**: Favors manual over auto waypoints

### Edge Cases Not Handled

❌ **Clicking Near Waypoints**: No snapping to nearby waypoints
❌ **Clicking Near Handles**: No snapping to nearby handles
❌ **Duplicate Connections**: Can create multiple edges between same handles
❌ **Invalid Connections**: No electrical validation (e.g., voltage source to voltage source)

## Extension Points

### For Wire-to-Wire Connections

1. **Add Wire Click Detection**:
   ```typescript
   // In WireEdge component
   const handleEdgeClick = useCallback((event) => {
     if (isConnecting) {
       completeConnectionToWire(id, clickPosition);
     }
   }, [isConnecting, id]);
   ```

2. **Add Junction Creation**:
   ```typescript
   function completeConnectionToWire(edgeId, position) {
     // Create junction node
     // Split edge
     // Complete connection to junction
   }
   ```

3. **Update Connection Store**:
   ```typescript
   interface ConnectionState {
     // Add method for wire connections
     completeToWire: (edgeId, position) => void;
   }
   ```

### For Advanced Features

1. **Smart Snapping**: Snap to nearby waypoints/handles
2. **Connection Validation**: Electrical rules checking
3. **Multi-Connection**: Multiple edges between same nodes
4. **Dynamic Handles**: Add/remove handles dynamically
5. **Connection Hints**: Show valid connection targets

## Testing Considerations

### Manual Testing

1. **Basic Connection**: Handle → Handle
2. **With Waypoints**: Click canvas multiple times
3. **Auto Waypoints**: Move perpendicular to direction
4. **Cancellation**: Press ESC at various stages
5. **Self-Connection**: Try connecting node to itself (should fail)

### Automated Testing

```typescript
describe('Connection System', () => {
  it('starts connection on handle click', () => {
    // Test startConnection
  });
  
  it('adds manual waypoint on canvas click', () => {
    // Test addWaypoint
  });
  
  it('creates auto waypoint on direction change', () => {
    // Test updateCursorPosition
  });
  
  it('completes connection on target handle click', () => {
    // Test onConnect
  });
  
  it('cancels connection on ESC key', () => {
    // Test cancelConnecting
  });
  
  it('cleans redundant waypoints', () => {
    // Test cleanWaypoints
  });
});
```

## Conclusion

The current connection system is **well-architected** with:
- Clear separation of concerns (store, handlers, components)
- Robust state management (dual-phase architecture)
- Good performance (memoization, batching)
- Extensible design (easy to add wire-to-wire)

The main limitation is **handle-to-handle only** connections, which will be addressed by the wire-to-wire connection feature.
