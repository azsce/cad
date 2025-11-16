# Phase 6: Polish & Testing

## Overview

Final refinements, comprehensive testing, edge case handling, and documentation for the junction node system.

## Tasks

### Task 6.1: Add Keyboard Shortcuts

**File**: `src/components/CircuitEditor/CircuitEditorPane/useKeyboardShortcuts.ts`

#### Add Junction-Specific Shortcuts

```typescript
export function useKeyboardShortcuts({
  nodes,
  edges,
  deleteNodes,
  deleteEdges,
}: UseKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete selected nodes/edges
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter(n => n.selected);
        const selectedEdges = edges.filter(e => e.selected);

        if (selectedNodes.length > 0) {
          // Check if any selected nodes are junctions with multiple connections
          const junctionsWithMultipleEdges = selectedNodes.filter(node => {
            if (node.type !== 'junction') return false;
            
            const connectedEdges = edges.filter(
              e => e.source === node.id || e.target === node.id
            );
            
            return connectedEdges.length > 2;
          });

          if (junctionsWithMultipleEdges.length > 0) {
            // Show confirmation dialog for junctions with multiple edges
            const confirmed = window.confirm(
              `Deleting ${junctionsWithMultipleEdges.length} junction(s) will also delete their connected edges. Continue?`
            );
            
            if (!confirmed) return;
          }

          event.preventDefault();
          deleteNodes(selectedNodes.map(n => n.id));
        }

        if (selectedEdges.length > 0) {
          event.preventDefault();
          deleteEdges(selectedEdges.map(e => e.id));
        }
      }

      // Escape - cancel connection (handled in useKeyboardHandler)
      // Could add more shortcuts here (e.g., Ctrl+J for junction placement)
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, deleteNodes, deleteEdges]);
}
```

**Verification**:
- Delete key removes selected junctions
- Confirmation dialog appears for junctions with >2 edges
- Escape cancels connection (existing)

---

### Task 6.2: Add Junction Deletion Confirmation Dialog

**File**: `src/components/CircuitEditor/nodes/JunctionNode/JunctionDeletionDialog.tsx`

```typescript
/**
 * Confirmation dialog for deleting junctions with multiple connections.
 */

import { memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Warning } from '@mui/icons-material';

interface JunctionDeletionDialogProps {
  open: boolean;
  junctionCount: number;
  edgeCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const JunctionDeletionDialog = memo(({
  open,
  junctionCount,
  edgeCount,
  onConfirm,
  onCancel,
}: JunctionDeletionDialogProps) => {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color="warning" />
        Delete Junction{junctionCount > 1 ? 's' : ''}?
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Deleting {junctionCount} junction{junctionCount > 1 ? 's' : ''} will also delete{' '}
          {edgeCount} connected edge{edgeCount > 1 ? 's' : ''}. This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
});

JunctionDeletionDialog.displayName = 'JunctionDeletionDialog';
```

**Verification**:
- Dialog shows correct counts
- Confirm deletes junctions
- Cancel preserves junctions

---

### Task 6.3: Handle Edge Cases

**File**: `src/utils/edgeSplitting.ts`

#### Add Edge Case Handling

```typescript
/**
 * Split waypoints at a position along the edge path.
 * Handles edge cases: no waypoints, split at endpoints, etc.
 */
export function splitWaypointsAtPosition(
  sourcePos: Position,
  targetPos: Position,
  waypoints: Waypoint[],
  splitPosition: Position
): { beforeWaypoints: Waypoint[]; afterWaypoints: Waypoint[] } {
  // Edge case: No waypoints
  if (waypoints.length === 0) {
    return { beforeWaypoints: [], afterWaypoints: [] };
  }

  // Edge case: Split very close to source
  const distToSource = distance(splitPosition, sourcePos);
  if (distToSource < 10) {
    return { beforeWaypoints: [], afterWaypoints: waypoints };
  }

  // Edge case: Split very close to target
  const distToTarget = distance(splitPosition, targetPos);
  if (distToTarget < 10) {
    return { beforeWaypoints: waypoints, afterWaypoints: [] };
  }

  // Normal case: Find closest segment
  const pathPoints: Position[] = [sourcePos, ...waypoints, targetPos];
  
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
  
  const waypointSplitIndex = closestSegmentIndex;
  
  return {
    beforeWaypoints: waypoints.slice(0, waypointSplitIndex),
    afterWaypoints: waypoints.slice(waypointSplitIndex),
  };
}

/**
 * Merge edges with validation.
 */
export function mergeEdges(
  edge1: CircuitEdge,
  edge2: CircuitEdge,
  junctionId: NodeId
): CircuitEdge {
  // Validate that edges connect through junction
  const edge1ConnectsToJunction = 
    edge1.source === junctionId || edge1.target === junctionId;
  const edge2ConnectsToJunction = 
    edge2.source === junctionId || edge2.target === junctionId;

  if (!edge1ConnectsToJunction || !edge2ConnectsToJunction) {
    throw new Error('Edges do not connect through junction');
  }

  // Determine order
  let firstEdge: CircuitEdge;
  let secondEdge: CircuitEdge;
  
  if (edge1.target === junctionId && edge2.source === junctionId) {
    firstEdge = edge1;
    secondEdge = edge2;
  } else if (edge2.target === junctionId && edge1.source === junctionId) {
    firstEdge = edge2;
    secondEdge = edge1;
  } else {
    throw new Error('Cannot determine edge order for merging');
  }

  // Combine waypoints
  const combinedWaypoints = [
    ...(firstEdge.waypoints ?? []),
    ...(secondEdge.waypoints ?? []),
  ];

  // Create merged edge
  return {
    id: createEdgeId(`merged-${Date.now()}`),
    source: firstEdge.source,
    sourceHandle: firstEdge.sourceHandle,
    target: secondEdge.target,
    targetHandle: secondEdge.targetHandle,
    ...(combinedWaypoints.length > 0 && { waypoints: combinedWaypoints }),
  };
}
```

**Verification**:
- Handles split near endpoints
- Validates edge connections
- Throws clear errors for invalid operations

---

### Task 6.4: Add Comprehensive Integration Tests

**File**: `src/components/CircuitEditor/__tests__/junction-integration.test.tsx`

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { CircuitEditorPane } from '../CircuitEditorPane';
import { useCircuitStore } from '../../../store/circuitStore';
import { createNodeId, createEdgeId } from '../../../types/identifiers';

describe('Junction Integration Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    useCircuitStore.getState().clearAll();
  });

  describe('Junction Creation', () => {
    it('should create junction when dropped from palette', () => {
      // Test drag-and-drop junction creation
    });

    it('should create junction when clicking edge during connection', () => {
      // Test edge-click junction creation
    });
  });

  describe('Junction Connections', () => {
    it('should connect handle to junction', () => {
      // Test handle -> junction connection
    });

    it('should connect junction to junction', () => {
      // Test junction -> junction connection
    });

    it('should split edge when junction created on edge', () => {
      // Test edge splitting
    });
  });

  describe('Junction Editing', () => {
    it('should open properties dialog on right-click', () => {
      // Test context menu
    });

    it('should update label when saved', () => {
      // Test label editing
    });

    it('should open dialog on double-click label', () => {
      // Test double-click editing
    });
  });

  describe('Junction Deletion', () => {
    it('should merge edges when deleting junction with 2 connections', () => {
      // Test edge merging
    });

    it('should delete all edges when deleting junction with >2 connections', () => {
      // Test edge deletion
    });

    it('should show confirmation for junctions with multiple edges', () => {
      // Test confirmation dialog
    });
  });

  describe('Visual Feedback', () => {
    it('should highlight junction when edge selected', () => {
      // Test highlighting
    });

    it('should highlight edge when hovered during connection', () => {
      // Test hover state
    });

    it('should show temporary junction during connection', () => {
      // Test temporary junction rendering
    });
  });

  describe('Analysis Integration', () => {
    it('should collapse junctions in analysis', () => {
      // Test junction collapse
    });

    it('should find connected terminals through junctions', () => {
      // Test connection traversal
    });

    it('should validate circuits with junctions', () => {
      // Test validation
    });
  });
});
```

**Verification**:
- All integration tests pass
- Edge cases covered
- No regressions

---

### Task 6.5: Add Documentation

**File**: `docs/features/junctions.md`

```markdown
# Junction Nodes

## Overview

Junction nodes are connection points that allow multiple wires to meet at a single electrical node. They enable complex circuit topologies beyond simple point-to-point connections.

## Features

### Creating Junctions

**From Palette**:
1. Drag junction from component palette
2. Drop on canvas at desired location
3. Junction appears with no label

**During Connection**:
1. Start connection from handle or junction
2. Click on any edge (not endpoint)
3. Junction created at click position
4. Edge splits automatically
5. Connection completes to new junction

### Connecting with Junctions

**Supported Connection Types**:
- Handle → Junction
- Junction → Handle
- Junction → Junction
- Handle/Junction → Edge (creates junction)

**Connection Process**:
1. Click source (handle or junction)
2. Add waypoints by clicking canvas (optional)
3. Click target (handle, junction, or edge)
4. Connection created with waypoints

### Editing Junctions

**Add/Edit Label**:
- Right-click junction → Edit Properties
- Enter label (e.g., "VCC", "GND", "Node A")
- Double-click existing label to edit

**Move Junction**:
- Click and drag junction to new position
- Connected edges update automatically

**Delete Junction**:
- Right-click → Delete
- Or select and press Delete key
- If 2 connections: Edges merge automatically
- If ≠2 connections: Confirmation dialog, all edges deleted

### Visual Design

**Appearance**:
- Outlined circle (16px diameter)
- Primary theme color
- Label below (if set)

**States**:
- Normal: Outlined circle
- Hovered: Thicker outline + glow
- Selected: Filled circle
- Connected to selected edge: Highlighted + glow

### Analysis Behavior

Junctions are **collapsed** during circuit analysis:
- Junctions don't appear in analysis graph
- Terminals connected through junctions are grouped into electrical nodes
- Analysis finds direct component-to-component connections

**Example**:
```
Circuit:  R1 → J1 → R2
Analysis: R1 → R2 (direct connection)
```

## Best Practices

1. **Use junctions for connection points**: When multiple wires meet, use a junction
2. **Label important junctions**: Add labels like "VCC", "GND" for clarity
3. **Avoid unnecessary junctions**: Don't use junctions for simple point-to-point connections
4. **Keep junctions organized**: Place junctions at logical connection points

## Limitations

- Junctions have single omnidirectional handle (routing via waypoints)
- Minimum 5px gap between waypoints and junctions
- Deleting junction with >2 edges requires confirmation

## Keyboard Shortcuts

- **Delete**: Delete selected junction
- **Escape**: Cancel connection mode
- **Double-click label**: Edit junction label

## Troubleshooting

**Junction not connecting**:
- Ensure you're clicking the junction itself, not nearby
- Check that connection mode is active

**Edge not splitting**:
- Ensure you're clicking during connection mode
- Check that click is on edge, not endpoint

**Edges not merging on deletion**:
- Merging only works with exactly 2 connections
- More than 2 connections will delete all edges
