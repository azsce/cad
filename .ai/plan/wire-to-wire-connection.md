# Wire-to-Wire Connection Implementation Plan

## Problem Statement

Currently, the circuit editor only allows connections between component handles (e.g., resistor terminal to voltage source terminal). However, in real electrical circuits, wires can branch and connect to other wires at junction points, not just at component terminals.

**Current Limitation:**
- ✅ Can connect: Component Handle → Component Handle
- ❌ Cannot connect: Component Handle → Wire (at any point along the wire)
- ❌ Cannot connect: Wire → Wire (creating T-junctions or multi-way junctions)

**Required Behavior:**
Users should be able to click on an existing wire during connection mode to create a junction point, effectively splitting the wire and creating a new connection point.

## Architecture Overview

### Current Connection System


1. **Connection Store** (`src/store/connectionStore.ts`):
   - Manages temporary connection state during drawing
   - Tracks source node, source handle, waypoints, cursor position
   - Handles direction locking and auto-waypoint creation

2. **ConnectableHandle** (`src/components/CircuitEditor/nodes/ConnectableHandle.tsx`):
   - Wraps React Flow Handle component
   - Click to start connection (if not connecting)
   - Click to complete connection (if connecting)

3. **Connection Handlers** (`src/contexts/CircuitFlowContext/useConnectionHandlers.ts`):
   - `startConnection()` - Initiates connection mode
   - `onConnect()` - Completes connection and creates edge
   - `onPaneClick()` - Adds waypoints during connection
   - `onPaneMouseMove()` - Updates cursor position and auto-waypoints

4. **WireEdge** (`src/components/CircuitEditor/edges/WireEdge/`):
   - Renders edges with orthogonal routing
   - Supports waypoints (manual and auto)
   - Waypoint dragging and deletion

### Electrical Node Identification

The system uses **Union-Find algorithm** to identify electrical nodes:
- Connection points linked by wires are grouped into electrical nodes
- Each electrical node represents a single voltage potential
- Components (branches) connect between electrical nodes

**Current Implementation** (`src/analysis/utils/graphTransformer.ts`):
```typescript
function identifyElectricalNodes(edges: Circuit['edges']): {
  electricalNodes: ElectricalNode[];
  connectionPointToNodeId: Map<string, string>;
}
```

## Required Changes

### Phase 1: Data Model Updates

#### 1.1 Junction Node Type


**File**: `src/types/circuit.ts`

Add a new node type for wire junctions:

```typescript
interface JunctionNode extends BaseNode {
  type: 'junction';
  data: {
    // Minimal data - junctions are just connection points
    label?: string; // Optional label for debugging
  };
}

// Update CircuitNode union type
type CircuitNode = 
  | ResistorNode 
  | VoltageSourceNode 
  | CurrentSourceNode 
  | JunctionNode;
```

**Characteristics of Junction Nodes:**
- Invisible in UI (or shown as small dot when selected)
- No value or configuration
- Purely for electrical connectivity
- Can have multiple handles (2+ connections)
- Auto-created when connecting to wires
- Can be manually created by user (future enhancement)

#### 1.2 Edge Splitting Logic

When connecting to a wire, the system must:
1. Identify the click position on the wire
2. Create a junction node at that position
3. Split the original edge into two edges
4. Create a new edge from source to junction

**Example Transformation:**

```
BEFORE:
Node A ----edge1----> Node B

User clicks on edge1 during connection from Node C

AFTER:
Node A ----edge1a----> Junction J ----edge1b----> Node B
Node C ----edge2-----> Junction J
```

### Phase 2: UI Interaction Updates

#### 2.1 Wire Click Detection During Connection Mode

**File**: `src/components/CircuitEditor/edges/WireEdge/index.tsx`

Add click handler to WireEdge when in connection mode:

```typescript
const isConnecting = useConnectionStore((state) => state.isConnecting);

const handleEdgeClick = useCallback((event: React.MouseEvent) => {
  if (!isConnecting) return;
  
  event.stopPropagation();
  
  // Get click position in flow coordinates
  const clickPosition = screenToFlowPosition({
    x: event.clientX,
    y: event.clientY,
  });
  
  // Complete connection to this wire
  completeConnectionToWire(id, clickPosition);
}, [isConnecting, id]);
```

**Visual Feedback:**
- Highlight wire on hover when in connection mode
- Show cursor as crosshair over wires
- Display tooltip: "Click to connect to wire"

#### 2.2 Connection Completion Handler

**File**: `src/contexts/CircuitFlowContext/useConnectionHandlers.ts`

Add new handler for wire connections:

```typescript
const completeConnectionToWire = useCallback((
  edgeId: string,
  clickPosition: Position
) => {
  // 1. Get the edge being clicked
  const edge = edges.find(e => e.id === edgeId);
  if (!edge) return;
  
  // 2. Create junction node at click position
  const junctionNode = createJunctionNode(clickPosition);
  addNode(junctionNode);
  
  // 3. Split the edge
  const { edge1, edge2 } = splitEdge(edge, junctionNode.id);
  deleteEdges([edgeId]);
  addEdge(edge1);
  addEdge(edge2);
  
  // 4. Create connection from source to junction
  const connectionData = useConnectionStore.getState().endConnecting();
  if (!connectionData) return;
  
  const newEdge = createEdge({
    source: sourceNode,
    sourceHandle,
    target: junctionNode.id,
    targetHandle: 'input', // Junction has generic handles
    waypoints: connectionData.waypoints,
  });
  addEdge(newEdge);
}, [edges, addNode, addEdge, deleteEdges]);
```

### Phase 3: Junction Node Implementation

#### 3.1 Junction Node Component

**File**: `src/components/CircuitEditor/nodes/JunctionNode.tsx`

```typescript
export const JunctionNode = memo(({ id, selected }: NodeProps) => {
  const theme = useTheme();
  
  return (
    <div style={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: selected 
        ? theme.palette.primary.main 
        : theme.palette.text.secondary,
      border: `2px solid ${theme.palette.background.paper}`,
    }}>
      {/* Multiple handles for connections */}
      <ConnectableHandle
        type="target"
        position={Position.Top}
        nodeId={id}
        handleId="top"
      />
      <ConnectableHandle
        type="source"
        position={Position.Right}
        nodeId={id}
        handleId="right"
      />
      <ConnectableHandle
        type="target"
        position={Position.Bottom}
        nodeId={id}
        handleId="bottom"
      />
      <ConnectableHandle
        type="source"
        position={Position.Left}
        nodeId={id}
        handleId="left"
      />
    </div>
  );
});
```

**Handle Strategy:**
- Junction nodes have 4 handles (top, right, bottom, left)
- All handles can be both source and target
- React Flow will automatically route to nearest handle

#### 3.2 Register Junction Node Type

**File**: `src/components/CircuitEditor/CircuitEditorPane.tsx`

```typescript
const nodeTypes = useMemo(() => ({
  resistor: ResistorNode,
  voltageSource: VoltageSourceNode,
  currentSource: CurrentSourceNode,
  junction: JunctionNode, // Add junction type
}), []);
```

### Phase 4: Edge Splitting Utilities

#### 4.1 Split Edge Function

**File**: `src/utils/edgeSplitting.ts` (new file)

```typescript
/**
 * Splits an edge at a junction point
 */
export function splitEdge(
  edge: CircuitEdge,
  junctionNodeId: NodeId,
  splitPosition: Position
): { edge1: CircuitEdge; edge2: CircuitEdge } {
  // Determine which waypoints go to each new edge
  const { waypoints1, waypoints2 } = splitWaypoints(
    edge.data?.waypoints ?? [],
    splitPosition
  );
  
  // Create two new edges
  const edge1: CircuitEdge = {
    id: createEdgeId(`${edge.id}-a`),
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: junctionNodeId,
    targetHandle: 'auto', // Let React Flow choose
    data: {
      waypoints: waypoints1,
    },
  };
  
  const edge2: CircuitEdge = {
    id: createEdgeId(`${edge.id}-b`),
    source: junctionNodeId,
    sourceHandle: 'auto',
    target: edge.target,
    targetHandle: edge.targetHandle,
    data: {
      waypoints: waypoints2,
    },
  };
  
  return { edge1, edge2 };
}

/**
 * Splits waypoints array at the split position
 */
function splitWaypoints(
  waypoints: Waypoint[],
  splitPosition: Position
): { waypoints1: Waypoint[]; waypoints2: Waypoint[] } {
  // Find closest waypoint or segment to split position
  // Distribute waypoints to each new edge
  // Add split position as waypoint if needed
  
  // Implementation details...
}
```

#### 4.2 Junction Node Creation

**File**: `src/utils/nodeCreation.ts` (update existing)

```typescript
export function createJunctionNode(position: Position): CircuitNode {
  return {
    id: createNodeId(generateId()),
    type: 'junction',
    position,
    data: {},
  };
}
```

### Phase 5: Analysis Updates

#### 5.1 Graph Transformation

**File**: `src/analysis/utils/graphTransformer.ts`

**No changes needed!** The existing Union-Find algorithm already handles junctions correctly:

- Junction nodes are just regular circuit nodes
- Edges connected to junctions are treated like any other edge
- The Union-Find groups all connection points correctly
- Junction nodes will naturally become part of electrical nodes

**Example:**
```
Circuit:
  A ---edge1--- Junction J ---edge2--- B
                    |
                  edge3
                    |
                    C

Electrical Nodes:
  - Node n0: {A's handle}
  - Node n1: {J's handles} ← All junction handles group together
  - Node n2: {B's handle}
  - Node n3: {C's handle}

Branches:
  - Branch a: n0 → n1 (from A to J)
  - Branch b: n1 → n2 (from J to B)
  - Branch c: n1 → n3 (from J to C)
```

#### 5.2 Validation Updates

**File**: `src/analysis/utils/validation.ts`

**No changes needed!** Validation works on the analysis graph, which already handles junctions correctly through the Union-Find grouping.

### Phase 6: Visual Feedback & Polish

#### 6.1 Connection Mode Visual Feedback

**File**: `src/components/CircuitEditor/edges/WireEdge/index.tsx`

```typescript
const isConnecting = useConnectionStore((state) => state.isConnecting);

// Highlight wire on hover during connection mode
const edgeStyle = useMemo(() => ({
  ...style,
  strokeWidth: selected ? 3 : isConnecting ? 2.5 : 2,
  stroke: selected 
    ? theme.palette.primary.main 
    : isConnecting 
      ? theme.palette.info.light 
      : theme.palette.text.primary,
  cursor: isConnecting ? 'crosshair' : 'default',
}), [selected, isConnecting, style, theme]);
```

#### 6.2 Junction Node Visibility

**Options:**
1. **Always Invisible**: Junction nodes are never shown (cleanest UI)
2. **Show When Selected**: Small dot appears when edge is selected
3. **Show in Edit Mode**: Visible during editing, hidden in analysis
4. **Always Visible**: Small dots always shown (most explicit)

**Recommendation**: Start with option 2 (show when selected) for debugging, can make invisible later.

#### 6.3 Cursor Feedback

**File**: `src/components/CircuitEditor/CircuitEditorPane.tsx`

```typescript
const isConnecting = useConnectionStore((state) => state.isConnecting);

<ReactFlow
  // ... other props
  style={{
    cursor: isConnecting ? 'crosshair' : 'default',
  }}
/>
```

### Phase 7: Store Updates

#### 7.1 Connection Store

**File**: `src/store/connectionStore.ts`

Add method to complete connection to wire:

```typescript
interface ConnectionState {
  // ... existing fields
  
  /** Complete connection to a wire (creates junction) */
  completeToWire: (edgeId: string, position: Position) => {
    waypoints: Waypoint[];
    edgeId: string;
    position: Position;
  } | null;
}
```

#### 7.2 Circuit Store

**File**: `src/store/circuitStore.ts`

Add helper for junction operations:

```typescript
/**
 * Splits an edge by inserting a junction node
 */
splitEdgeWithJunction: (
  circuitId: CircuitId,
  edgeId: EdgeId,
  junctionPosition: Position
) => void;
```

## Implementation Order

### Week 1: Foundation
1. ✅ Add JunctionNode type to circuit types
2. ✅ Create JunctionNode component
3. ✅ Register junction node type in CircuitEditorPane
4. ✅ Create edge splitting utilities
5. ✅ Add junction node creation helper

### Week 2: Connection Logic
6. ✅ Add wire click detection in WireEdge
7. ✅ Implement completeConnectionToWire handler
8. ✅ Update connection store with wire connection support
9. ✅ Add visual feedback for hovering wires in connection mode
10. ✅ Test basic wire-to-wire connection

### Week 3: Polish & Testing
11. ✅ Add cursor feedback
12. ✅ Implement junction node visibility options
13. ✅ Test with complex multi-junction circuits
14. ✅ Verify analysis works correctly with junctions
15. ✅ Update validation if needed

### Week 4: Edge Cases & Documentation
16. ✅ Handle edge cases (clicking near waypoints, etc.)
17. ✅ Add undo/redo support for junction operations
18. ✅ Performance testing with many junctions
19. ✅ Update user documentation
20. ✅ Code quality checks (lint, types, CC < 10)

## Testing Strategy

### Manual Test Cases

1. **Basic Wire Connection**:
   - Create two resistors with a wire between them
   - Start connection from voltage source
   - Click on the wire between resistors
   - Verify junction created and three edges exist

2. **Multiple Junctions**:
   - Create a wire with multiple junction points
   - Verify all junctions are electrically connected
   - Run analysis and verify correct node grouping

3. **Junction to Junction**:
   - Create junction J1 on wire
   - Start connection from component
   - Click on junction J1
   - Verify connection completes to junction

4. **Waypoint Preservation**:
   - Create wire with manual waypoints
   - Split wire at junction
   - Verify waypoints distributed correctly to new edges

5. **Analysis Verification**:
   - Create circuit with junctions
   - Run nodal analysis
   - Verify junction points group into single electrical node
   - Verify branch currents sum correctly at junction (KCL)

### Automated Tests

**File**: `src/utils/__tests__/edgeSplitting.test.ts`

```typescript
describe('splitEdge', () => {
  it('splits edge into two edges with junction', () => {
    const edge = createTestEdge();
    const junction = createJunctionNode({ x: 100, y: 100 });
    
    const { edge1, edge2 } = splitEdge(edge, junction.id, junction.position);
    
    expect(edge1.target).toBe(junction.id);
    expect(edge2.source).toBe(junction.id);
  });
  
  it('preserves waypoints when splitting', () => {
    // Test waypoint distribution
  });
});
```

## Edge Cases & Considerations

### 1. Clicking Near Waypoints
**Problem**: User clicks wire very close to existing waypoint
**Solution**: If click is within threshold (e.g., 10px) of waypoint, snap to waypoint instead of creating junction

### 2. Clicking Near Handles
**Problem**: User clicks wire very close to component handle
**Solution**: If click is within threshold of handle, connect to handle instead of creating junction

### 3. Multiple Connections to Same Junction
**Problem**: User creates multiple connections to same junction point
**Solution**: Junction nodes support multiple connections naturally (4+ handles)

### 4. Junction Node Deletion
**Problem**: User deletes junction node - what happens to connected edges?
**Solution**: 
- Option A: Delete all connected edges (safest)
- Option B: Merge edges if only 2 connections (smart but complex)
- **Recommendation**: Start with Option A

### 5. Junction Node Movement
**Problem**: User drags junction node
**Solution**: Allow dragging - connected edges update automatically (React Flow handles this)

### 6. Undo/Redo
**Problem**: Undoing junction creation should restore original edge
**Solution**: Store operation as atomic transaction in history

### 7. Performance
**Problem**: Many junctions could slow down rendering
**Solution**: 
- Junction nodes are lightweight (no complex rendering)
- Use React.memo for JunctionNode
- Monitor performance with 100+ junctions

### 8. Export/Import
**Problem**: Junction nodes need to be serialized
**Solution**: Junction nodes are regular CircuitNodes, already handled by store persistence

## Success Criteria

✅ **Functional Requirements:**
1. User can click on any wire during connection mode
2. Junction node is created at click position
3. Original wire splits into two wires through junction
4. New connection completes to junction
5. Multiple connections to same junction work correctly
6. Analysis correctly groups junction connections into electrical nodes
7. Validation works with junctions

✅ **Quality Requirements:**
1. No TypeScript errors
2. No ESLint errors
3. Cyclomatic complexity < 10 for all functions
4. All functions use logger (not console)
5. Proper useMemo/useCallback usage
6. Code follows project patterns (branded types, helper functions)

✅ **UX Requirements:**
1. Visual feedback when hovering wire in connection mode
2. Cursor changes to crosshair over wires
3. Junction nodes visible when selected (or always invisible)
4. Smooth interaction with no lag
5. Clear indication of connection target

## Future Enhancements

### Phase 2 Features (Post-MVP):
1. **Manual Junction Creation**: Add junction node to component palette
2. **Smart Junction Merging**: Merge nearby junctions automatically
3. **Junction Labels**: Allow users to label junction points
4. **Junction Highlighting**: Highlight all edges connected to junction on hover
5. **Multi-way Junctions**: Support 5+ connections at single point
6. **Junction Snapping**: Snap junctions to grid or alignment guides
7. **Junction Styles**: Different visual styles for junctions (dot, cross, etc.)

## References

- **Current Connection Implementation**: `.kiro/specs/edge-waypoint-connection/click-to-connect-implementation.md`
- **Edge Manipulation Plan**: `.ai/plan/edge-segment-manipulation.md`
- **Circuit Analysis Tasks**: `.kiro/specs/circuit-analysis-app/tasks.md`
- **Graph Transformation**: `src/analysis/utils/graphTransformer.ts`
- **Validation Logic**: `src/analysis/utils/validation.ts`

## Key Insights

1. **Union-Find Already Handles Junctions**: The existing electrical node identification algorithm naturally groups junction connections correctly. No changes needed to analysis code!

2. **Junction Nodes Are Simple**: They're just connection points with no electrical properties. Keep implementation minimal.

3. **Edge Splitting Is Core Operation**: The main complexity is splitting edges and distributing waypoints correctly.

4. **Visual Feedback Is Critical**: Users need clear indication that they can click on wires during connection mode.

5. **Start Simple**: Begin with basic junction creation, add polish and edge cases later.

## Notes

- Junction nodes are electrically equivalent to wire segments - they don't add resistance or other properties
- In analysis, junction points become part of electrical nodes (same voltage potential)
- This feature is essential for creating realistic circuit topologies (parallel branches, complex networks)
- Implementation should be incremental - get basic functionality working first, then add polish
