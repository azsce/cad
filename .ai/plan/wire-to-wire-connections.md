# Wire-to-Wire and Node-to-Wire Connection Plan

## ⚠️ DEPRECATED - See Detailed Plan

This document has been superseded by the comprehensive plan in:
**`.ai/plan/wire-to-wire-connections/`**

Please refer to:
- `00-master-plan.md` - Overview and architecture
- `01-foundation.md` - Junction node implementation
- `02-connection-system.md` - Connection logic
- `03-edge-splitting.md` - Edge splitting and merging
- `04-visual-feedback.md` - UI and visual states
- `05-analysis-integration.md` - Circuit analysis integration
- `06-polish-testing.md` - Final polish and testing

---

## Original Executive Summary (Archived)

This document outlined the initial plan to extend the current connection system to support:
1. **Wire-to-Wire connections**: Connect from one edge to another edge
2. **Node-to-Wire connections**: Connect from a node handle to an existing edge

These features are essential for realistic electrical circuit design, where components can tap into existing wires at any point.

---

## Original Current State Analysis

### What Works Now ✅

1. **Node-to-Node Connections**
   - Click on a handle → Click on another handle
   - Waypoint-based routing with orthogonal (Manhattan) paths
   - Auto-waypoint generation for turns
   - Manual waypoint placement via pane clicks
   - Waypoint editing (drag, double-click to remove)

2. **Connection Store Architecture**
   - Dual-phase design: Drawing mode → Persistent edge
   - Clean state management with Zustand
   - Proper handoff from temporary to persistent state

3. **Visual Feedback**
   - ConnectionOverlay renders preview during drawing
   - Dashed line with waypoint markers
   - Cursor marker at mouse position
   - Viewport-aware rendering

### Current Limitations ❌

1. **Cannot start connection from edge**
   - No Ctrl+Click handler on edges
   - No way to capture click position on edge

2. **Cannot end connection on edge**
   - Connection only completes on handles
   - No edge hit detection during connection mode

3. **No junction representation**
   - Wire-to-wire connections need visual junction points
   - Node-to-wire connections need tap points

4. **Analysis/Validation gaps**
   - Current graph transformation assumes node-to-node only
   - No support for mid-wire connection points

---

## Design Options Discussion

### Option 1: Virtual Junction Nodes (Recommended ⭐)

**Concept**: Create invisible React Flow nodes at connection points on wires.

#### How It Works

```
Before:                    After:
Node A -------- Node B     Node A -------- [Junction] -------- Node B
                                              |
                                           Node C
```

**Implementation**:
1. When connecting to an edge, create a new "junction" node at click position
2. Split the original edge into two edges (before/after junction)
3. Add new edge from source to junction
4. Junction node is invisible but has handles for future connections

**Pros**:
- ✅ Leverages existing React Flow node/edge system
- ✅ No changes needed to connection logic
- ✅ Analysis/validation works with minimal changes (junctions are just nodes)
- ✅ Easy to implement waypoint routing (junctions are connection points)
- ✅ Can visualize junctions when needed (debugging, analysis)
- ✅ Supports unlimited connections at junction point

**Cons**:
- ⚠️ Increases node count (could affect performance with many junctions)
- ⚠️ Need to handle junction cleanup when all connections removed
- ⚠️ Edge splitting logic adds complexity

**Data Model**:
```typescript
interface JunctionNodeData {
  type: 'junction';
  // Position is inherited from Node
  // No value, label, or other component data
}

// In circuit.ts
type CircuitNode = ComponentNode | JunctionNode;
```

---

### Option 2: Edge Metadata with Connection Points

**Concept**: Store connection points as metadata on edges, without creating nodes.

#### How It Works

```typescript
interface EdgeConnectionPoint {
  id: string;
  position: Position; // Position along edge path
  connectedEdgeIds: string[]; // Edges connected at this point
}

interface CircuitEdge {
  // ... existing fields
  connectionPoints?: EdgeConnectionPoint[];
}
```

**Pros**:
- ✅ No extra nodes in the graph
- ✅ Cleaner data model (fewer entities)
- ✅ Better performance (fewer React Flow nodes)

**Cons**:
- ❌ Complex edge rendering (need to draw junction dots)
- ❌ Complex hit detection (need to check all edges during connection)
- ❌ Analysis/validation requires major refactoring (connection points aren't nodes)
- ❌ Difficult to handle multiple connections at same point
- ❌ Edge splitting becomes very complex
- ❌ Waypoint routing needs special handling for connection points

---

### Option 3: Hybrid Approach

**Concept**: Use virtual nodes for wire-to-wire, but special handling for node-to-wire.

**Pros**:
- ✅ Optimizes for different use cases

**Cons**:
- ❌ Two different systems to maintain
- ❌ Inconsistent behavior
- ❌ More complex codebase

---

## Recommended Approach: Virtual Junction Nodes

After analyzing the options, **Option 1 (Virtual Junction Nodes)** is the best choice because:

1. **Minimal changes to existing architecture**
   - Connection system works as-is
   - Analysis/validation needs minor updates
   - Waypoint routing unchanged

2. **Leverages React Flow's strengths**
   - Nodes are first-class citizens
   - Built-in hit detection
   - Handle system works perfectly

3. **Maintainable and extensible**
   - Clear separation of concerns
   - Easy to add features (e.g., junction visualization)
   - Consistent with existing patterns

---

## Implementation Plan

### Phase 1: Core Junction Node System

#### 1.1 Update Type Definitions

**File**: `src/types/circuit.ts`

```typescript
// Add junction to node types
export type CircuitNode = 
  | ResistorNode 
  | VoltageSourceNode 
  | CurrentSourceNode 
  | GroundNode
  | JunctionNode;

// Junction node data (minimal - just a connection point)
export interface JunctionNodeData {
  // No value, label, or other properties
  // Position comes from Node.position
}

// Type guard
export function isJunctionNode(node: CircuitNode): node is JunctionNode {
  return node.type === 'junction';
}
```

#### 1.2 Create Junction Node Component

**File**: `src/components/CircuitEditor/nodes/JunctionNode.tsx`

```typescript
/**
 * JunctionNode - invisible node that represents wire-to-wire connection point
 * Only visible when selected or during connection mode
 */
export const JunctionNode = memo(({ id, selected }: NodeProps) => {
  const theme = useTheme();
  const isConnecting = useConnectionStore(state => state.isConnecting);
  
  // Show junction dot when selected or in connection mode
  const isVisible = selected || isConnecting;
  
  return (
    <>
      {/* Invisible hit area for selection */}
      <div style={{
        width: 20,
        height: 20,
        transform: 'translate(-10px, -10px)',
      }} />
      
      {/* Visual junction dot (only when visible) */}
      {isVisible && (
        <svg width="20" height="20" style={{
          position: 'absolute',
          transform: 'translate(-10px, -10px)',
          pointerEvents: 'none',
        }}>
          <circle
            cx="10"
            cy="10"
            r="4"
            fill={selected ? theme.palette.primary.main : theme.palette.text.secondary}
            stroke={theme.palette.background.paper}
            strokeWidth="2"
          />
        </svg>
      )}
      
      {/* Handles for connections (4 directions) */}
      <ConnectableHandle
        type="source"
        position={Position.Top}
        nodeId={id}
        handleId="top"
        style={{ opacity: 0 }}
      />
      <ConnectableHandle
        type="source"
        position={Position.Right}
        nodeId={id}
        handleId="right"
        style={{ opacity: 0 }}
      />
      <ConnectableHandle
        type="source"
        position={Position.Bottom}
        nodeId={id}
        handleId="bottom"
        style={{ opacity: 0 }}
      />
      <ConnectableHandle
        type="source"
        position={Position.Left}
        nodeId={id}
        handleId="left"
        style={{ opacity: 0 }}
      />
    </>
  );
});
```

#### 1.3 Register Junction Node Type

**File**: `src/components/CircuitEditor/nodes/index.ts`

```typescript
export const nodeTypes = {
  resistor: ResistorNode,
  voltageSource: VoltageSourceNode,
  currentSource: CurrentSourceNode,
  ground: GroundNode,
  junction: JunctionNode, // Add this
};
```

---

### Phase 2: Edge Click Detection

#### 2.1 Add Edge Click Handler to WireEdge

**File**: `src/components/CircuitEditor/edges/WireEdge/index.tsx`

```typescript
export const WireEdge = memo((props: EdgeProps) => {
  // ... existing code
  
  const { startConnection } = useCircuitFlow();
  const { screenToFlowPosition } = useReactFlow();
  
  /**
   * Handle Ctrl+Click on edge to start connection from wire
   */
  const handleEdgeClick = useCallback((event: React.MouseEvent) => {
    // Only handle Ctrl+Click (or Cmd+Click on Mac)
    if (!event.ctrlKey && !event.metaKey) return;
    
    event.stopPropagation();
    
    // Get click position in flow coordinates
    const clickPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    logger.debug({ caller: 'WireEdge' }, 'Starting connection from edge', {
      edgeId: id,
      clickPosition,
    });
    
    // Start connection with special flag indicating edge source
    startConnection(null, null, clickPosition, { sourceEdgeId: id });
  }, [id, startConnection, screenToFlowPosition]);
  
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{...}}
        interactionWidth={20}
        onClick={handleEdgeClick} // Add click handler
      />
      {/* ... rest of component */}
    </>
  );
});
```

#### 2.2 Update Connection Store for Edge Sources

**File**: `src/store/connectionStore.ts`

```typescript
interface ConnectionState {
  // ... existing fields
  
  /** Source edge ID if starting from edge (null if from handle) */
  sourceEdgeId: EdgeId | null;
  
  // ... existing methods
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // ... existing state
  sourceEdgeId: null,
  
  startConnecting: (sourceNode, sourceHandle, sourcePosition, options?) => {
    set({
      isConnecting: true,
      sourceNode,
      sourceHandle,
      sourcePosition,
      sourceEdgeId: options?.sourceEdgeId ?? null,
      waypoints: [],
      cursorPosition: null,
      lastDirection: null,
    });
  },
  
  // ... rest of implementation
}));
```

---

### Phase 3: Connection Completion on Edges

#### 3.1 Add Edge Hover Detection

**File**: `src/components/CircuitEditor/edges/WireEdge/index.tsx`

```typescript
export const WireEdge = memo((props: EdgeProps) => {
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseEnter = useCallback(() => {
    if (isConnecting) {
      setIsHovered(true);
    }
  }, [isConnecting]);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);
  
  /**
   * Handle click on edge during connection mode to complete connection
   */
  const handleConnectionComplete = useCallback((event: React.MouseEvent) => {
    if (!isConnecting) return;
    
    event.stopPropagation();
    
    const clickPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    // Signal to connection handler that we want to connect to this edge
    // This will trigger junction creation
    onConnect({
      targetEdgeId: id,
      targetPosition: clickPosition,
    });
  }, [isConnecting, id, onConnect, screenToFlowPosition]);
  
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          strokeWidth: isHovered ? 4 : (selected ? 3 : 2),
          stroke: isHovered 
            ? theme.palette.success.main 
            : (selected ? theme.palette.primary.main : theme.palette.text.primary),
        }}
        interactionWidth={20}
        onClick={isConnecting ? handleConnectionComplete : handleEdgeClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      {/* ... rest */}
    </>
  );
});
```

#### 3.2 Update Connection Handlers

**File**: `src/contexts/CircuitFlowContext/useConnectionHandlers.ts`

```typescript
const onConnect = useCallback((connection: Connection | EdgeConnection) => {
  const result = useConnectionStore.getState().endConnecting();
  const waypoints = result?.waypoints ?? [];
  
  // Check if connecting to an edge (not a handle)
  if ('targetEdgeId' in connection) {
    // Create junction node at target position
    const junctionId = createNodeId(`junction-${Date.now()}`);
    const junctionNode: CircuitNode = {
      id: junctionId,
      type: 'junction',
      position: connection.targetPosition,
      data: {},
    };
    
    // Add junction node
    addNode(junctionNode);
    
    // Split the target edge at junction point
    const targetEdge = edges.find(e => e.id === connection.targetEdgeId);
    if (targetEdge) {
      splitEdgeAtJunction(targetEdge, junctionId, connection.targetPosition);
    }
    
    // Create edge from source to junction
    const newEdge: CircuitEdge = {
      id: createEdgeId(`edge-${Date.now()}`),
      source: sourceNode ?? junctionId, // If from edge, use junction
      sourceHandle: sourceHandle ?? 'auto',
      target: junctionId,
      targetHandle: 'auto',
      ...(waypoints.length > 0 && { waypoints }),
    };
    
    addEdge(newEdge);
  } else {
    // Normal handle-to-handle connection
    // ... existing logic
  }
}, [addNode, addEdge, edges]);
```

---

### Phase 4: Edge Splitting Logic

#### 4.1 Create Edge Splitting Utility

**File**: `src/utils/edgeSplitting.ts`

```typescript
/**
 * Split an edge at a junction point
 * Creates two new edges: source->junction and junction->target
 */
export function splitEdgeAtJunction(
  originalEdge: CircuitEdge,
  junctionId: NodeId,
  junctionPosition: Position,
  deleteEdge: (id: EdgeId) => void,
  addEdge: (edge: CircuitEdge) => void
): void {
  // Calculate waypoints for each segment
  const { beforeWaypoints, afterWaypoints } = splitWaypointsAtPosition(
    originalEdge.waypoints ?? [],
    junctionPosition
  );
  
  // Create edge from source to junction
  const edge1: CircuitEdge = {
    id: createEdgeId(`${originalEdge.id}-before`),
    source: originalEdge.source,
    sourceHandle: originalEdge.sourceHandle,
    target: junctionId,
    targetHandle: 'auto',
    waypoints: beforeWaypoints,
  };
  
  // Create edge from junction to target
  const edge2: CircuitEdge = {
    id: createEdgeId(`${originalEdge.id}-after`),
    source: junctionId,
    sourceHandle: 'auto',
    target: originalEdge.target,
    targetHandle: originalEdge.targetHandle,
    waypoints: afterWaypoints,
  };
  
  // Delete original edge
  deleteEdge(originalEdge.id);
  
  // Add new edges
  addEdge(edge1);
  addEdge(edge2);
}

/**
 * Split waypoints at a position along the path
 */
function splitWaypointsAtPosition(
  waypoints: Waypoint[],
  splitPosition: Position
): { beforeWaypoints: Waypoint[]; afterWaypoints: Waypoint[] } {
  // Find closest segment to split position
  // Insert split position as waypoint
  // Return waypoints before and after split
  
  // TODO: Implement path distance calculation
  // For now, simple approach: find closest waypoint
  
  if (waypoints.length === 0) {
    return { beforeWaypoints: [], afterWaypoints: [] };
  }
  
  // Find closest waypoint index
  let closestIndex = 0;
  let minDistance = Infinity;
  
  waypoints.forEach((wp, index) => {
    const distance = Math.hypot(wp.x - splitPosition.x, wp.y - splitPosition.y);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });
  
  return {
    beforeWaypoints: waypoints.slice(0, closestIndex + 1),
    afterWaypoints: waypoints.slice(closestIndex),
  };
}
```

---

### Phase 5: Analysis & Validation Updates

#### 5.1 Update Graph Transformation

**File**: `src/contexts/ValidationContext/graphTransformation.ts`

```typescript
/**
 * Transform circuit to analysis graph
 * Now handles junction nodes as electrical connection points
 */
export function transformCircuitToGraph(circuit: Circuit): AnalysisGraph {
  const nodes: ElectricalNode[] = [];
  const branches: Branch[] = [];
  
  // Process all nodes (including junctions)
  circuit.nodes.forEach(node => {
    if (node.type === 'junction') {
      // Junction is just a connection point - no component
      nodes.push({
        id: node.id,
        connectedBranchIds: [],
        isJunction: true, // Flag for analysis
      });
    } else {
      // Regular component node
      // ... existing logic
    }
  });
  
  // Process edges (branches)
  circuit.edges.forEach(edge => {
    // Each edge is a branch
    // Junctions are treated as nodes in the graph
    branches.push({
      id: edge.id,
      type: getComponentType(edge.source, circuit.nodes),
      value: getComponentValue(edge.source, circuit.nodes),
      fromNodeId: edge.source,
      toNodeId: edge.target,
    });
  });
  
  // ... rest of transformation
}
```

#### 5.2 Update Validation Rules

**File**: `src/contexts/ValidationContext/validation.ts`

```typescript
/**
 * Validate circuit for analysis
 * Junction nodes are valid connection points
 */
export function validateCircuit(graph: AnalysisGraph): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for isolated junctions (no connections)
  graph.nodes.forEach(node => {
    if (node.isJunction && node.connectedBranchIds.length < 2) {
      warnings.push(`Junction ${node.id} has fewer than 2 connections`);
    }
  });
  
  // ... existing validation rules
  
  return {
    isValid: errors.length === 0,
    isSolvable: errors.length === 0 && hasValidTopology(graph),
    errors,
    warnings,
  };
}
```

---

### Phase 6: Junction Cleanup

#### 6.1 Auto-remove Unused Junctions

**File**: `src/contexts/CircuitFlowContext/useEdgeOperations.ts`

```typescript
const deleteEdges = useCallback((edgeIds: EdgeId[]) => {
  // Delete edges
  setEdges(current => current.filter(e => !edgeIds.includes(e.id)));
  
  // Find junctions that may now be unused
  const potentiallyUnusedJunctions = new Set<NodeId>();
  
  edgeIds.forEach(edgeId => {
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      // Check if source/target are junctions
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode?.type === 'junction') {
        potentiallyUnusedJunctions.add(edge.source);
      }
      if (targetNode?.type === 'junction') {
        potentiallyUnusedJunctions.add(edge.target);
      }
    }
  });
  
  // Check each junction and remove if it has < 2 connections
  potentiallyUnusedJunctions.forEach(junctionId => {
    const remainingConnections = edges.filter(e => 
      (e.source === junctionId || e.target === junctionId) &&
      !edgeIds.includes(e.id)
    );
    
    if (remainingConnections.length < 2) {
      // Remove junction
      deleteNodes([junctionId]);
      
      // If exactly 1 connection remains, merge the edges
      if (remainingConnections.length === 1) {
        mergeEdgesAtJunction(junctionId, remainingConnections[0]);
      }
    }
  });
  
  // Sync to store
  useCircuitStore.getState().deleteEdges(circuitId, edgeIds);
}, [circuitId, edges, nodes, setEdges, deleteNodes]);
```

---

## Visual Design

### Connection Mode Indicators

1. **Starting from edge (Ctrl+Click)**:
   - Edge highlights in green
   - Cursor shows "+" icon
   - Tooltip: "Click to start connection from wire"

2. **Hovering over edge during connection**:
   - Edge highlights in green
   - Cursor shows "connect" icon
   - Tooltip: "Click to connect to wire"

3. **Junction nodes**:
   - Invisible by default
   - Small dot when selected
   - Visible during connection mode (semi-transparent)
   - Full opacity when hovered

### Keyboard Shortcuts

- **Ctrl+Click on edge**: Start connection from wire
- **Click on edge (during connection)**: Complete connection to wire
- **Escape**: Cancel connection (existing)

---

## Testing Strategy

### Unit Tests

1. **Junction node creation**
   - Test junction node component renders correctly
   - Test handle positions

2. **Edge splitting**
   - Test waypoint distribution
   - Test edge ID generation
   - Test cleanup of original edge

3. **Connection store**
   - Test sourceEdgeId tracking
   - Test state transitions

### Integration Tests

1. **Wire-to-wire connection flow**
   - Ctrl+Click edge → Click another edge
   - Verify junction created
   - Verify edges split correctly
   - Verify waypoints preserved

2. **Node-to-wire connection flow**
   - Click handle → Click edge
   - Verify junction created
   - Verify edge split

3. **Junction cleanup**
   - Delete edge connected to junction
   - Verify junction removed if < 2 connections
   - Verify edges merged if junction had 2 connections

### Manual Testing Scenarios

1. **Complex circuit with multiple junctions**
   - Create grid of wires
   - Add multiple tap points
   - Verify analysis works correctly

2. **Junction editing**
   - Drag junction node
   - Verify connected edges update
   - Verify waypoints adjust

3. **Undo/Redo with junctions**
   - Create junction
   - Undo
   - Verify junction and split edges removed

---

## Migration Strategy

### Backward Compatibility

Existing circuits (node-to-node only) will work without changes:
- No junctions in existing data
- Connection logic falls back to handle-to-handle
- Analysis/validation handles both cases

### Data Migration

No migration needed - junction nodes are additive:
- Old circuits: No junction nodes
- New circuits: May have junction nodes
- Both formats valid

---

## Performance Considerations

### Potential Issues

1. **Many junctions**: Each junction adds a node to React Flow
2. **Edge splitting**: Creates more edges in the graph
3. **Rendering**: More elements to render

### Optimizations

1. **Lazy junction rendering**: Only render junction dots when needed
2. **Edge merging**: Automatically merge edges when junctions removed
3. **Memoization**: Memo all junction-related components
4. **Viewport culling**: Don't render junctions outside viewport

---

## Open Questions

### 1. Should junctions be user-creatable?

**Option A**: Only auto-created when connecting to edges
**Option B**: Allow manual junction placement from palette

**Recommendation**: Start with Option A, add Option B later if needed

### 2. How to handle junction visualization in analysis?

**Option A**: Show junctions as nodes in graph visualization
**Option B**: Hide junctions, show as connection points on edges

**Recommendation**: Option A for consistency

### 3. Should junctions have properties (labels, etc.)?

**Option A**: Junctions are pure connection points (no properties)
**Option B**: Allow optional labels for documentation

**Recommendation**: Option A initially, Option B as enhancement

### 4. How to represent junctions in circuit analysis?

**Option A**: Junctions are nodes with zero impedance
**Option B**: Junctions are merged into adjacent nodes

**Recommendation**: Option A - simpler and more explicit

---

## Timeline Estimate

- **Phase 1** (Junction nodes): 2-3 hours
- **Phase 2** (Edge click detection): 1-2 hours
- **Phase 3** (Connection completion): 2-3 hours
- **Phase 4** (Edge splitting): 3-4 hours
- **Phase 5** (Analysis updates): 2-3 hours
- **Phase 6** (Junction cleanup): 2-3 hours
- **Testing & Polish**: 3-4 hours

**Total**: ~15-22 hours

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Discuss open questions** and make decisions
3. **Create detailed tasks** for each phase
4. **Begin implementation** with Phase 1
5. **Iterate based on feedback**

---

## Alternative: React Flow Nodes as Junction Points

If virtual junction nodes prove problematic, we could explore using React Flow's built-in node system more explicitly, but this is essentially what we're already doing with Option 1.

The key insight is that **React Flow is designed around nodes and edges**, so fighting that design by trying to implement edge-to-edge connections without nodes would be much more complex than embracing the node-based approach.
