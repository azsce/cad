# Phase 1: Foundation

## Overview

Establish the foundational types, components, and registration for junction nodes. This phase creates the basic junction node without connection logic.

## Tasks

### Task 1.1: Update Type Definitions

**File**: `src/types/circuit.ts`

#### Add Junction Node Types

```typescript
/**
 * Data for a junction node (connection point).
 */
export type JunctionNodeData = {
  /** Optional label for the junction (e.g., "VCC", "GND", "Node A") */
  label?: string;
}

/**
 * Junction node - represents an electrical connection point where multiple wires meet.
 * Unlike components, junctions have no electrical properties (zero impedance).
 */
export interface JunctionNode extends Node {
  id: NodeId;
  type: 'junction';
  position: { x: number; y: number };
  data: JunctionNodeData;
}
```

#### Update CircuitNode Union Type

```typescript
/**
 * Union type for all circuit node types.
 */
export type CircuitNode = 
  | ResistorNode 
  | VoltageSourceNode 
  | CurrentSourceNode 
  | GroundNode
  | JunctionNode;  // Add this
```

#### Add Type Guard

```typescript
/**
 * Type guard to check if a node is a junction.
 */
export function isJunctionNode(node: CircuitNode): node is JunctionNode {
  return node.type === 'junction';
}
```

#### Update ComponentData Union

```typescript
/**
 * Union type for all component data types.
 * Note: JunctionNodeData is separate as junctions are not components.
 */
export type ComponentData = 
  | ResistorData 
  | VoltageSourceData 
  | CurrentSourceData
  | JunctionNodeData;  // Add this
```

**Verification**:
- Run `~/.bun/bin/bun tsgo` to check for type errors
- Ensure no breaking changes to existing code

---

### Task 1.2: Create Junction Node Component

**File**: `src/components/CircuitEditor/nodes/JunctionNode/index.tsx`

```typescript
/**
 * JunctionNode - Visual representation of an electrical connection point.
 * Always visible, can connect to multiple wires from any direction.
 */

import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useTheme, Box, Typography } from '@mui/material';
import { useConnectionStore } from '../../../../store/connectionStore';
import { logger } from '../../../../utils/logger';
import type { JunctionNode as JunctionNodeType } from '../../../../types/circuit';

export const JunctionNode = memo(({ id, data, selected }: NodeProps<JunctionNodeType>) => {
  const theme = useTheme();
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Visual states
  const isFilled = selected;
  const isHighlighted = isHovered || (isConnecting && isHovered);
  const outlineWidth = isHighlighted ? 3 : 2;
  const circleRadius = 8; // 16px diameter
  const svgSize = 20; // Extra space for outline

  logger.debug({ caller: 'JunctionNode' }, 'Rendering junction', {
    id,
    selected,
    isConnecting,
    hasLabel: Boolean(data.label),
  });

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: 'relative',
        width: svgSize,
        height: svgSize,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: isConnecting ? 'pointer' : 'default',
      }}
    >
      {/* Junction circle */}
      <svg
        width={svgSize}
        height={svgSize}
        style={{
          overflow: 'visible',
        }}
      >
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={circleRadius}
          fill={isFilled ? theme.palette.primary.main : 'none'}
          stroke={theme.palette.primary.main}
          strokeWidth={outlineWidth}
          style={{
            transition: 'all 0.2s ease',
            filter: isHighlighted ? 'drop-shadow(0 0 4px currentColor)' : 'none',
          }}
        />
      </svg>

      {/* Label (if exists) */}
      {data.label && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: svgSize + 2,
            fontSize: '10px',
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {data.label}
        </Typography>
      )}

      {/* Single invisible handle at center for connections */}
      {/* Position doesn't matter - routing is handled by waypoints */}
      <Handle
        type="source"
        position={Position.Top}
        id="center"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: svgSize,
          height: svgSize,
          opacity: 0,
          border: 'none',
          background: 'transparent',
          cursor: isConnecting ? 'pointer' : 'crosshair',
        }}
      />
    </Box>
  );
});

JunctionNode.displayName = 'JunctionNode';
```

**Key Design Decisions**:
- Single handle at center (invisible)
- Handle covers entire junction area for easy clicking
- Visual states: normal, hovered, selected, connecting
- Label positioned below junction
- No rectangular background (just circle + label)

**Verification**:
- Component renders without errors
- Handle is clickable but invisible
- Visual states work correctly

---

### Task 1.3: Create Temporary Junction Component

**File**: `src/components/CircuitEditor/nodes/JunctionNode/TemporaryJunction.tsx`

```typescript
/**
 * TemporaryJunction - Rendered during connection mode when clicking an edge.
 * Shown as dashed outline with reduced opacity.
 */

import { memo } from 'react';
import { useTheme } from '@mui/material';
import type { Position } from '../../../../types/circuit';

interface TemporaryJunctionProps {
  position: Position;
}

export const TemporaryJunction = memo(({ position }: TemporaryJunctionProps) => {
  const theme = useTheme();
  
  const circleRadius = 8;
  const outlineWidth = 2;

  return (
    <circle
      cx={position.x}
      cy={position.y}
      r={circleRadius}
      fill="none"
      stroke={theme.palette.primary.main}
      strokeWidth={outlineWidth}
      strokeDasharray="3 3"
      opacity={0.6}
      style={{
        pointerEvents: 'none',
      }}
    />
  );
});

TemporaryJunction.displayName = 'TemporaryJunction';
```

**Usage**: Rendered in ConnectionOverlay when temporary junction exists.

---

### Task 1.4: Add Junction to Component Palette

**File**: `src/components/CircuitEditor/ComponentPalette/index.tsx`

#### Add Junction Palette Item

```typescript
import { FiberManualRecord } from '@mui/icons-material'; // Circle icon for junction

// In palette items array
const paletteItems = [
  {
    type: 'resistor',
    label: 'Resistor',
    icon: <ResistorIcon />,
  },
  {
    type: 'voltageSource',
    label: 'Voltage Source',
    icon: <VoltageSourceIcon />,
  },
  {
    type: 'currentSource',
    label: 'Current Source',
    icon: <CurrentSourceIcon />,
  },
  {
    type: 'ground',
    label: 'Ground',
    icon: <GroundIcon />,
  },
  {
    type: 'junction',
    label: 'Junction',
    icon: <FiberManualRecord />, // Circle icon
  },
];
```

#### Update Drag Handler

```typescript
const onDragStart = (event: React.DragEvent, nodeType: string) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
  
  logger.debug({ caller: 'ComponentPalette' }, 'Drag started', { nodeType });
};
```

**Verification**:
- Junction appears in palette
- Can drag junction from palette
- Icon is visible and appropriate

---

### Task 1.5: Register Junction Node Type

**File**: `src/components/CircuitEditor/nodes/index.ts`

```typescript
import { ResistorNode } from './ResistorNode';
import { VoltageSourceNode } from './VoltageSourceNode';
import { CurrentSourceNode } from './CurrentSourceNode';
import { GroundNode } from './GroundNode';
import { JunctionNode } from './JunctionNode'; // Add import

export const nodeTypes = {
  resistor: ResistorNode,
  voltageSource: VoltageSourceNode,
  currentSource: CurrentSourceNode,
  ground: GroundNode,
  junction: JunctionNode, // Register junction
};
```

**Verification**:
- React Flow recognizes 'junction' node type
- No console errors about unknown node type

---

### Task 1.6: Update Component Drop Handler

**File**: `src/components/CircuitEditor/CircuitEditorPane/useComponentDrop.ts`

#### Handle Junction Drop (No Config Dialog)

```typescript
const onDrop = useCallback((event: React.DragEvent) => {
  event.preventDefault();

  const nodeType = event.dataTransfer.getData('application/reactflow');
  if (!nodeType) return;

  const position = reactFlowInstance.screenToFlowPosition({
    x: event.clientX,
    y: event.clientY,
  });

  logger.debug({ caller: 'useComponentDrop' }, 'Component dropped', {
    nodeType,
    position,
  });

  // Junction doesn't need config dialog - create immediately
  if (nodeType === 'junction') {
    const junctionNode: CircuitNode = {
      id: createNodeId(`junction-${Date.now()}`),
      type: 'junction',
      position,
      data: {}, // No label initially
    };
    
    addNodeToFlow(junctionNode);
    return;
  }

  // Other components need config dialog
  setPendingComponent({ type: nodeType, position });
  setConfigDialogOpen(true);
}, [reactFlowInstance, addNodeToFlow]);
```

**Verification**:
- Dropping junction creates node immediately
- No config dialog for junction
- Junction appears at drop position

---

### Task 1.7: Update Store Actions

**File**: `src/store/circuitStore.ts`

#### Ensure Junction Nodes Are Handled

The existing `addNode`, `updateNode`, `deleteNode` actions should work with junction nodes without changes, since they operate on `CircuitNode` union type.

**Verification**:
- Can add junction to store
- Can update junction data (label)
- Can delete junction from store

---

## Testing Checklist

### Unit Tests
- [ ] JunctionNode component renders correctly
- [ ] TemporaryJunction component renders correctly
- [ ] Type guards work (isJunctionNode)
- [ ] Junction data structure is valid

### Integration Tests
- [ ] Junction appears in palette
- [ ] Can drag junction from palette
- [ ] Dropping junction creates node
- [ ] Junction renders on canvas
- [ ] Junction can be selected
- [ ] Junction can be moved
- [ ] Junction can be deleted (via keyboard)

### Visual Tests
- [ ] Junction circle is outlined (not filled) when not selected
- [ ] Junction circle is filled when selected
- [ ] Junction has glow effect when hovered
- [ ] Label appears below junction (if set)
- [ ] Temporary junction has dashed outline

## Acceptance Criteria

- ✅ Junction node type defined in types
- ✅ JunctionNode component created and styled
- ✅ TemporaryJunction component created
- ✅ Junction added to palette
- ✅ Junction node type registered
- ✅ Drop handler creates junction immediately
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No console errors

## Next Phase

Proceed to **Phase 2: Connection System** to implement connection logic for junctions.
