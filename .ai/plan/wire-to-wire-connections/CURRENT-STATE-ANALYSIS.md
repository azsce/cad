# Wire-to-Wire Connections - Current State Analysis

## 📊 Implementation Status

### ✅ **COMPLETED** (Phases 1 & 2)

#### Phase 1: Foundation
- Junction node type definitions
- Junction node component with visual states
- Temporary junction component
- Component palette integration
- Node type registration
- Drop handler for junctions

#### Phase 2: Connection System  
- Temporary junction state in ConnectionStore
- Edge click handler during connection mode
- Junction creation and edge splitting
- Connection completion with junctions
- Temporary junction rendering in ConnectionOverlay

### 🔄 **CURRENT IMPLEMENTATION**

#### Edge Click During Connection Mode (WORKING ✅)
**Location**: `src/components/CircuitEditor/edges/WireEdge/useWireEdgeClick.ts`

**Flow**:
1. User starts connection from handle/junction
2. User clicks on edge while in connection mode
3. Junction created immediately at click position
4. Edge split into two edges through junction
5. Connection edge created from source to junction
6. Connection mode ends

**Features**:
- ✅ Edge highlights green when hovered during connection
- ✅ Junction created at exact click position
- ✅ Edge split correctly
- ✅ Waypoints preserved on first segment
- ✅ Connection completes immediately

#### Duplicate Edge Click Handler (REDUNDANT ⚠️)
**Location**: `src/contexts/CircuitFlowContext/useEdgeClickHandler.ts`

**Issue**: This handler does the SAME thing as `useWireEdgeClick.ts` but is registered at ReactFlow level via `onEdgeClick` prop.

**Result**: TWO handlers for the same functionality!

---

## 🎯 **MISSING FEATURE: Ctrl+Click to Start Connection from Edge**

### Current Behavior
- ❌ Cannot start connection FROM an edge
- ❌ No Ctrl key detection
- ❌ No cursor indication when Ctrl+hovering edge

### Required Behavior (NOT IMPLEMENTED)
When **NOT in connection mode** and user **Ctrl+Clicks** an edge:
1. Create temporary junction at click position
2. Start connection mode FROM that junction
3. User can then connect to any other connectable element

### Visual Requirements (NOT IMPLEMENTED)
When **Ctrl+hovering** edge (NOT in connection mode):
- Cursor changes to crosshair/plus
- Edge highlights with success color (green)
- Optional tooltip: "Ctrl+Click to start connection"

---

## 🔍 **Invalid Connections Analysis**

### When Starting from Edge (Ctrl+Click)

#### ✅ **VALID Connections**
1. **Temporary Junction → Component Handle** - Any component terminal
2. **Temporary Junction → Existing Junction** - Connect to junction
3. **Temporary Junction → Another Edge** - Create another junction (click edge during connection)
4. **Temporary Junction → Same Edge (different position)** - Multiple junctions on same wire

#### ❌ **INVALID Connections**
1. **Temporary Junction → Itself** - Self-loop (impossible in UI)
2. **Duplicate Connection** - Connection already exists (unlikely since junction is new)
3. **Temporary Junction → Non-connectable** - Pane, controls, etc.

#### 💡 **Simplified Validation**
Since temporary junction is **brand new**, validation is simpler:
- Only check: target exists and has handle
- No duplicate check needed (junction has no connections yet)
- No self-loop check needed (impossible to connect to itself)

---

## 📋 **Implementation Plan for Ctrl+Click Feature**

### Task 1: Add Ctrl Key Detection to Edge Hover
**File**: `src/components/CircuitEditor/edges/WireEdge/useWireEdgeClick.ts`

**Changes**:
```typescript
// Add state for Ctrl key
const [isCtrlPressed, setIsCtrlPressed] = useState(false);

// Add keyboard event listeners
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      setIsCtrlPressed(true);
    }
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      setIsCtrlPressed(false);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, []);
```

### Task 2: Update Edge Style for Ctrl+Hover
**File**: `src/components/CircuitEditor/edges/WireEdge/useWireEdgeClick.ts`

**Changes**:
```typescript
const edgeStyle = useMemo(() => ({
  strokeWidth: selected ? 3 : 2,
  stroke: selected ? theme.palette.primary.main : theme.palette.text.primary,
  
  // Highlight during connection mode when hovered
  ...(isConnecting && isHovered && {
    strokeWidth: 4,
    stroke: theme.palette.success.main,
    cursor: 'pointer',
  }),
  
  // NEW: Highlight when Ctrl+hovering (NOT in connection mode)
  ...(!isConnecting && isCtrlPressed && isHovered && {
    strokeWidth: 4,
    stroke: theme.palette.success.main,
    cursor: 'crosshair',
  }),
}), [selected, theme, isConnecting, isHovered, isCtrlPressed]);
```

### Task 3: Handle Ctrl+Click to Start Connection
**File**: `src/components/CircuitEditor/edges/WireEdge/useWireEdgeClick.ts`

**Changes**:
```typescript
const handleEdgeClick = useCallback((event: React.MouseEvent) => {
  logEdgeClick({ isConnecting, edgeId, clientX: event.clientX, clientY: event.clientY });

  // CASE 1: Ctrl+Click when NOT in connection mode - START connection from edge
  if (!isConnecting && (event.ctrlKey || event.metaKey)) {
    event.stopPropagation();
    
    const clickPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    
    logger.info({ caller: 'useWireEdgeClick' }, '🎯 Ctrl+Click on edge - Starting connection from edge', {
      edgeId,
      clickPosition,
    });
    
    // Create temporary junction
    const junctionNode = createJunctionNode(clickPosition);
    addNode(junctionNode);
    
    // Split edge at junction
    splitEdgeAtJunction({
      edgeId,
      junctionId: junctionNode.id,
      junctionPosition: clickPosition,
      edges: edges as CircuitEdge[],
      nodes: nodes as CircuitNode[],
      deleteEdges: (ids: string[]) => { deleteEdges(ids as EdgeId[]); },
      addEdge,
    });
    
    // Start connection FROM the junction
    useConnectionStore.getState().startConnecting(
      junctionNode.id,
      'center',
      clickPosition
    );
    
    logger.info({ caller: 'useWireEdgeClick' }, '✅ Connection started from junction on edge', {
      junctionId: junctionNode.id,
    });
    
    return;
  }

  // CASE 2: Click during connection mode - END connection at edge
  if (isConnecting) {
    // ... existing code for ending connection at edge
  }
  
  // CASE 3: Normal click (not Ctrl, not connecting) - do nothing
  logger.info({ caller: 'useWireEdgeClick' }, '❌ Normal edge click, ignoring');
}, [isConnecting, edgeId, screenToFlowPosition, nodes, edges, addNode, addEdge, deleteEdges]);
```

### Task 4: Update Connection Validation (Optional)
**File**: `src/components/CircuitEditor/CircuitEditorPane/useConnectionValidation.ts`

**No changes needed** - existing validation works for junctions!

---

## 🗑️ **Cleanup Required**

### Remove Duplicate Handler
**File**: `src/contexts/CircuitFlowContext/useEdgeClickHandler.ts`

**Action**: This entire file can be DELETED or REFACTORED since `useWireEdgeClick.ts` already handles edge clicks.

**Alternative**: Keep it but make it handle ONLY the ReactFlow-level `onEdgeClick` event, and have it delegate to the WireEdge handler.

---

## 📝 **Summary**

### What Works ✅
- Edge click during connection mode creates junction and completes connection
- Edge highlights green when hovered during connection
- Junction creation and edge splitting
- Waypoint preservation

### What's Missing ❌
- Ctrl+Click to START connection from edge
- Ctrl key detection and visual feedback
- Cursor change on Ctrl+hover
- Edge highlight on Ctrl+hover (when NOT in connection mode)

### What's Redundant ⚠️
- Two edge click handlers doing the same thing
- `useEdgeClickHandler.ts` duplicates `useWireEdgeClick.ts` functionality

### Next Steps 🎯
1. Add Ctrl key detection to `useWireEdgeClick.ts`
2. Update edge style for Ctrl+hover state
3. Handle Ctrl+Click to start connection from edge
4. Test all connection modes
5. Clean up duplicate handler

---

**Status**: Analysis Complete - Ready for Ctrl+Click Implementation
**Date**: 2024-11-16
