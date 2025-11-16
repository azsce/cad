# Wire-to-Wire Connections - Master Plan

## Overview

This plan implements junction nodes to enable wire-to-wire and node-to-wire connections in the circuit editor. Junctions are visible connection points that allow multiple wires to meet at a single electrical node.

## Key Requirements

### Junction Characteristics
- ✅ **Always visible** - Outlined circle with optional label
- ✅ **Manually placed** - User explicitly creates junctions
- ✅ **Omnidirectional** - Single invisible handle, routing via waypoints
- ✅ **Labeled** - Optional labels (e.g., "VCC", "GND", "Node A")
- ✅ **First-class nodes** - Part of circuit topology, not just visual

### Connection Modes
- ✅ **Handle → Handle** - Direct component connections (existing)
- ✅ **Handle → Junction** - Connect component to junction
- ✅ **Junction → Handle** - Connect junction to component
- ✅ **Junction → Junction** - Connect two junctions
- ✅ **Handle/Junction → Edge** - Click edge creates junction at point

### Visual Behavior
- ✅ **Selected edge highlights endpoints** - Handles or junctions
- ✅ **Waypoints near junctions** - Minimum 5px gap
- ✅ **Temporary junction** - Appears when clicking edge during connection
- ✅ **Context menu** - Right-click for Edit/Delete

### Analysis Integration
- ✅ **Junction collapse** - Analysis finds direct component-to-component paths
- ✅ **Connection tree traversal** - Trace all connections through junctions
- ✅ **Electrical equivalence** - Junctions are zero-impedance nodes

## Implementation Phases

### Phase 1: Foundation
**Files**: `01-foundation.md`
- Type definitions for junction nodes
- Junction node component (visual design)
- Component palette integration
- Node type registration

### Phase 2: Connection System
**Files**: `02-connection-system.md`
- Single omnidirectional handle implementation
- Connection validation for junctions
- Temporary junction in ConnectionStore
- Edge click handler for junction creation

### Phase 3: Edge Splitting
**Files**: `03-edge-splitting.md`
- Edge splitting algorithm
- Waypoint distribution
- Junction placement on edges
- Edge merging on junction deletion

### Phase 4: Visual Feedback
**Files**: `04-visual-feedback.md`
- Connection highlighting (handles + junctions)
- Temporary junction rendering
- Hover states and selection
- Label editing UI

### Phase 5: Analysis Integration
**Files**: `05-analysis-integration.md`
- Junction collapse algorithm
- Connection tree traversal
- Graph transformation updates
- Validation rules for junctions

### Phase 6: Polish & Testing
**Files**: `06-polish-testing.md`
- Context menu implementation
- Keyboard shortcuts
- Edge cases and error handling
- Comprehensive testing

## Technical Decisions

### 1. Junction Handle Strategy
**Decision**: Single invisible handle at center
- **Rationale**: Waypoints handle routing, handle only needed for React Flow connection system
- **Implementation**: One handle with `position={Position.Top}` (arbitrary, not used for routing)
- **Edge routing**: Determined by waypoints, not handle position

### 2. Temporary Junction State
**Decision**: Store in ConnectionStore until connection completes
- **Rationale**: Avoids polluting node array with temporary entities
- **Implementation**: `temporaryJunction: { position, edgeId } | null`
- **Lifecycle**: Created on edge click, removed on cancel, converted to real node on completion

### 3. Edge Splitting Timing
**Decision**: Split edge only when connection completes
- **Rationale**: Easier to cancel, less disruptive to circuit
- **Implementation**: On connection completion, split edge and create junction node
- **Rollback**: If cancelled, no changes to circuit

### 4. Junction in Analysis
**Decision**: Collapse junctions to find component-to-component paths
- **Rationale**: Simplifies analysis, junctions are just connection points
- **Implementation**: Traverse through junctions to find all connected component terminals
- **Algorithm**: BFS/DFS from component terminal through junction graph

### 5. Waypoint-Junction Distance
**Decision**: Minimum 5px gap between waypoints and junctions
- **Rationale**: Prevents visual clutter, maintains clear routing
- **Implementation**: Check distance when adding waypoints, skip if too close
- **Visual feedback**: None (silent skip)

### 6. Junction Deletion
**Decision**: Merge edges if 2 connections, else delete all with confirmation
- **Rationale**: Preserves circuit when possible, prevents accidental data loss
- **Implementation**: 
  - 2 edges: Merge into single edge, combine waypoints
  - ≠2 edges: Show confirmation dialog, delete all edges

## Data Model

### Junction Node
```typescript
interface JunctionNode extends Node {
  id: NodeId;
  type: 'junction';
  position: { x: number; y: number };
  data: {
    label?: string;
  };
}
```

### Connection Store Extension
```typescript
interface ConnectionState {
  // ... existing fields
  temporaryJunction: {
    position: Position;
    edgeId: EdgeId;
  } | null;
}
```

### Edge with Junction Endpoints
```typescript
interface CircuitEdge {
  id: EdgeId;
  source: NodeId; // Can be component or junction
  sourceHandle: string; // 'top'/'right'/etc for components, 'center' for junctions
  target: NodeId; // Can be component or junction
  targetHandle: string;
  waypoints?: Waypoint[];
}
```

## Visual Design

### Junction Appearance
```
Normal:           Selected:         Temporary:
   ○                 ●                 ○
  VCC               VCC            (dashed)
```

- **Size**: 16px diameter (same as waypoint)
- **Outline**: 2px solid (normal), 3px (hovered), filled (selected)
- **Color**: Primary theme color
- **Label**: Small text, centered below, optional
- **Temporary**: Dashed outline, 60% opacity

### Connection States
- **Normal**: Primary color outline
- **Hovered**: Thicker outline + glow effect
- **Selected**: Filled with primary color
- **Connected to selected edge**: Highlight color (blue)
- **During connection mode**: Cursor changes to pointer

## User Workflows

### Create Junction
1. Drag junction from palette
2. Drop on canvas
3. Junction appears (no label)
4. Optional: Right-click → Edit Properties → Add label

### Connect Handle to Junction
1. Click component handle (start connection)
2. Click junction (end connection)
3. Edge created with waypoints

### Connect Junction to Junction
1. Click junction (start connection)
2. Click another junction (end connection)
3. Edge created with waypoints

### Connect to Edge (Create Junction)
1. Click handle or junction (start connection)
2. Click on any edge (not endpoint)
3. Temporary junction appears at click point
4. Connection completes immediately
5. Junction created, edge split, new edge added

### Edit Junction Label
1. Right-click junction → Edit Properties
2. Enter label in dialog
3. Label appears below junction
4. Double-click label to edit again

### Delete Junction
1. Right-click junction → Delete
2. If 2 edges: Edges merged automatically
3. If ≠2 edges: Confirmation dialog → Delete all edges

## File Structure

```
.ai/plan/wire-to-wire-connections/
├── 00-master-plan.md (this file)
├── 01-foundation.md
├── 02-connection-system.md
├── 03-edge-splitting.md
├── 04-visual-feedback.md
├── 05-analysis-integration.md
└── 06-polish-testing.md
```

## Timeline Estimate

- **Phase 1** (Foundation): 3-4 hours
- **Phase 2** (Connection System): 4-5 hours
- **Phase 3** (Edge Splitting): 4-5 hours
- **Phase 4** (Visual Feedback): 3-4 hours
- **Phase 5** (Analysis Integration): 4-5 hours
- **Phase 6** (Polish & Testing): 4-5 hours

**Total**: ~22-28 hours

## Success Criteria

- ✅ Junctions can be placed from palette
- ✅ All connection modes work (handle↔handle, handle↔junction, junction↔junction, →edge)
- ✅ Edges split correctly when junction created on edge
- ✅ Selected edge highlights connected handles/junctions
- ✅ Waypoints maintain 5px gap from junctions
- ✅ Junction labels can be added/edited/removed
- ✅ Junction deletion merges edges when possible
- ✅ Analysis correctly traces connections through junctions
- ✅ Circuit validation handles junction topology
- ✅ No visual glitches or performance issues

## Next Steps

1. Review this master plan
2. Read detailed phase documents (01-06)
3. Confirm technical approach
4. Begin implementation with Phase 1

---

**Status**: Planning Complete - Ready for Implementation
**Last Updated**: 2024
