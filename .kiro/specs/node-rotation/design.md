# Design Document

## Overview

This design document outlines the implementation approach for adding rotation functionality to circuit component nodes. The feature allows users to rotate components in 90-degree increments using dedicated rotation buttons. The design ensures proper synchronization between React Flow's visual state and the Zustand store's data model while maintaining the existing architecture patterns.

The rotation feature will be implemented as a cross-cutting concern that affects:
- Data model (adding rotation property to CircuitNode)
- Visual rendering (CSS transforms and handle positioning)
- User interaction (rotation buttons and event handlers)
- State synchronization (CircuitFlowContext updates)

## Architecture

### Data Flow

```
User clicks rotation button
    ↓
Node component calculates new rotation angle
    ↓
updateNodeData() called via CircuitFlowContext
    ↓
Context updates local React Flow state
    ↓
Context updates Zustand store
    ↓
Node re-renders with new rotation angle
```

### Component Hierarchy

```
CircuitEditorPane
  └── CircuitFlowProvider (manages state)
      └── ReactFlow
          ├── ResistorNode (with rotation controls)
          ├── VoltageSourceNode (with rotation controls)
          └── CurrentSourceNode (with rotation controls)
```

## Components and Interfaces

### 1. Data Model Updates

**File:** `src/types/circuit.ts`

Add rotation property to component data types:

```typescript
export type ResistorData = {
  value: number;
  label?: string;
  rotation?: 0 | 90 | 180 | 270; // New property
}

export type VoltageSourceData = {
  value: number;
  direction: 'up' | 'down';
  label?: string;
  rotation?: 0 | 90 | 180 | 270; // New property
}

export type CurrentSourceData = {
  value: number;
  direction: 'up' | 'down';
  label?: string;
  rotation?: 0 | 90 | 180 | 270; // New property
}
```

**Rationale:** Making rotation optional with a default of 0 ensures backward compatibility with existing circuits that don't have rotation data.

### 2. Rotation Button Component

**File:** `src/components/CircuitEditor/nodes/RotationButton.tsx` (new file)

A reusable component for rotation controls:

```typescript
interface RotationButtonProps {
  direction: 'clockwise' | 'counterclockwise';
  position: 'top-left' | 'bottom-left';
  onClick: () => void;
  visible: boolean;
}
```

**Features:**
- Circular button with rotation arrow icon (using MUI icons: RotateRight, RotateLeft)
- Positioned absolutely OUTSIDE the node's border, at the corners
- Tooltip showing rotation direction
- Hover effects for better UX
- Only visible when node is hovered or selected

**Styling:**
- 24px diameter circular button
- Semi-transparent background (rgba with theme colors)
- Positioned at corners OUTSIDE the node:
  - Top-left: `{ top: -12px, left: -12px }` (overlaps corner)
  - Bottom-left: `{ bottom: -12px, left: -12px }` (overlaps corner)
- z-index to ensure buttons appear above everything
- Buttons are positioned on the outer wrapper, so they DON'T rotate with node content

### 3. Node Component Updates

**Files:** 
- `src/components/CircuitEditor/nodes/ResistorNode.tsx`
- `src/components/CircuitEditor/nodes/VoltageSourceNode.tsx`
- `src/components/CircuitEditor/nodes/CurrentSourceNode.tsx`

Each node component will be updated with:

1. **State Management:**
   - Track hover state to show/hide rotation buttons
   - Track selected state from React Flow

2. **Rotation Logic:**
   ```typescript
   const rotation = data.rotation ?? 0;
   
   const handleRotateClockwise = useCallback(() => {
     const newRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
     updateNodeData(id, { rotation: newRotation });
   }, [rotation, id, updateNodeData]);
   
   const handleRotateCounterClockwise = useCallback(() => {
     const newRotation = ((rotation - 90 + 360) % 360) as 0 | 90 | 180 | 270;
     updateNodeData(id, { rotation: newRotation });
   }, [rotation, id, updateNodeData]);
   ```

3. **Visual Transformation:**
   - Apply CSS transform to rotate the entire node container INCLUDING value labels
   - Use `transform-origin: center` to rotate around center point
   - Value labels rotate with the node (vertical at 90°/270°, upside-down at 180°)
   - **Position Adjustment:** When rotation changes node dimensions (e.g., 80x40 becomes 40x80), React Flow automatically handles the visual positioning through its internal layout system. The stored position (x, y) represents the top-left corner, but CSS transform with `transform-origin: center` ensures rotation happens around the center, so no manual position recalculation is needed.

4. **Handle Position Updates:**
   - Dynamically calculate React Flow handle positions based on rotation
   - Map logical handle IDs (left/right for resistor, top/bottom for sources) to actual React Flow positions after rotation
   - Handle IDs remain constant (e.g., "top" is always "top"), only their React Flow Position changes
   - Example for resistor:
     ```typescript
     const getHandlePosition = (handleId: 'left' | 'right', rotation: number) => {
       const positionMap = {
         0: { left: Position.Left, right: Position.Right },
         90: { left: Position.Top, right: Position.Bottom },
         180: { left: Position.Right, right: Position.Left },
         270: { left: Position.Bottom, right: Position.Top },
       };
       return positionMap[rotation][handleId];
     };
     ```
   - Example for voltage/current source:
     ```typescript
     const getHandlePosition = (handleId: 'top' | 'bottom', rotation: number) => {
       const positionMap = {
         0: { top: Position.Top, bottom: Position.Bottom },
         90: { top: Position.Right, bottom: Position.Left },
         180: { top: Position.Bottom, bottom: Position.Top },
         270: { top: Position.Left, bottom: Position.Right },
       };
       return positionMap[rotation][handleId];
     };
     ```
   - Polarity/direction is separate from handle IDs and can be toggled without affecting connections

### 4. Context Updates

**File:** `src/contexts/CircuitFlowContext.tsx`

No structural changes needed. The existing `updateNodeData` function already handles partial updates to node data, which will include the rotation property.

**Verification:** Ensure that rotation updates trigger proper synchronization:
- Local React Flow state updates immediately
- Zustand store receives the rotation value
- No infinite render loops from rotation changes

### 5. Store Updates

**File:** `src/store/circuitStore.ts`

No changes needed. The store's `updateNode` function already handles partial updates and will automatically persist the rotation property.

## Data Models

### CircuitNode with Rotation

```typescript
interface CircuitNode {
  id: string;
  type: 'resistor' | 'voltageSource' | 'currentSource' | 'ground';
  position: { x: number; y: number };
  data: {
    value: number;
    rotation?: 0 | 90 | 180 | 270; // Optional, defaults to 0
    // ... other component-specific properties
  };
}
```

### React Flow Node Rendering

```typescript
// Outer wrapper maintains consistent bounding box for React Flow
<Box
  sx={{
    position: 'relative',
    width: nodeWidth,
    height: nodeHeight,
    // No rotation on wrapper - keeps React Flow positioning stable
  }}
>
  {/* Inner content rotates - INCLUDING value labels */}
  <Box
    sx={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      transformOrigin: 'center',
      // ... other styles
    }}
  >
    {/* Node content (SVG, etc.) */}
    <svg>...</svg>
    
    {/* Value label INSIDE rotated container - rotates with node */}
    <Box
      sx={{
        position: 'absolute',
        bottom: -25,
        left: '50%',
        transform: `translateX(-50%)`,
        // This rotates with parent, so:
        // 0°: horizontal left-to-right
        // 90°: vertical top-to-bottom
        // 180°: horizontal right-to-left (upside down)
        // 270°: vertical bottom-to-top
      }}
    >
      {value}Ω
    </Box>
  </Box>

  {/* Rotation buttons positioned on outer wrapper - DON'T rotate */}
  <RotationButton position="top-left" direction="clockwise" />
  <RotationButton position="bottom-left" direction="counterclockwise" />
  
  {/* Handles positioned on outer wrapper with rotation-aware positions */}
  <Handle position={getHandlePosition('start')} id="start" />
  <Handle position={getHandlePosition('end')} id="end" />
</Box>
```

**Key Design Decision:** By using a two-layer approach (outer wrapper + inner rotated content), we ensure:
1. React Flow sees a consistent bounding box (no position recalculation needed)
2. Visual rotation happens within that box, including value labels
3. Handles are positioned on the outer wrapper with rotation-aware positioning
4. Rotation buttons stay fixed (don't rotate) for easy access
5. No need to update the stored position (x, y) when rotating
6. Electrical properties (polarity, direction) maintain their meaning through rotation

## Error Handling

### Invalid Rotation Values

**Scenario:** Rotation value from store is not 0, 90, 180, or 270

**Handling:**
```typescript
const normalizeRotation = (rotation: number | undefined): 0 | 90 | 180 | 270 => {
  if (rotation === undefined) return 0;
  const normalized = rotation % 360;
  if ([0, 90, 180, 270].includes(normalized)) {
    return normalized as 0 | 90 | 180 | 270;
  }
  logger.warn({ caller: 'NodeComponent' }, 'Invalid rotation value, defaulting to 0', { rotation });
  return 0;
};
```

### Handle Position Calculation Errors

**Scenario:** Rotation angle doesn't map to a valid handle position

**Handling:**
- Use fallback position mapping
- Log warning for debugging
- Ensure handles remain functional even with unexpected rotation values

### React Flow Synchronization Issues

**Scenario:** Rotation update causes render loop or position drift

**Handling:**
- Use `useMemo` for rotation-dependent calculations
- Use `useCallback` for rotation handlers with stable dependencies
- Follow existing patterns from react-patterns.md steering rules
- Test with React DevTools Profiler to detect unnecessary re-renders

## Testing Strategy

### Unit Testing

**Component Tests:**
1. Test rotation button rendering (visible on hover/select)
2. Test rotation angle calculations (clockwise and counter-clockwise)
3. Test handle position mapping for all rotation angles
4. Test rotation value normalization

**Integration Tests:**
1. Test rotation updates flow through CircuitFlowContext
2. Test rotation persistence in Zustand store
3. Test rotation state initialization from store

### Manual Testing Scenarios

1. **Basic Rotation:**
   - Add a resistor to canvas
   - Click clockwise rotation button 4 times
   - Verify node returns to original orientation
   - Verify handles remain connectable at all orientations

2. **Counter-Clockwise Rotation:**
   - Add a voltage source to canvas
   - Click counter-clockwise rotation button
   - Verify rotation goes from 0° to 270°
   - Verify polarity indicators remain correct

3. **Persistence:**
   - Create circuit with rotated components
   - Refresh browser
   - Verify rotations are preserved

4. **Connection Integrity:**
   - Connect two components with a wire
   - Rotate one component
   - Verify wire remains connected
   - Verify wire updates to new handle position
   - Verify no position drift or offset after rotation

5. **Position Stability:**
   - Place a node at a specific position
   - Rotate it through all angles (0° → 90° → 180° → 270° → 0°)
   - Verify the node returns to exact same position
   - Verify no cumulative position drift

6. **Multiple Components:**
   - Add multiple components of different types
   - Rotate each to different angles
   - Verify no interference between components
   - Verify all rotation states are independent

7. **Polarity Independence:**
   - Connect a voltage source to other components
   - Rotate the voltage source to different angles
   - Toggle the polarity (click the circle)
   - Verify connections remain intact (wires don't disconnect)
   - Verify only the visual polarity indicators (+ and -) change
   - Verify handle IDs remain constant

8. **Edge Cases:**
   - Rotate component while dragging (should not interfere)
   - Rotate component while editing value (should not close editor)
   - Rotate component with multiple connections (all wires should update)
   - Toggle polarity on a rotated component (connections should remain stable)

### Performance Testing

1. **Render Performance:**
   - Create circuit with 20+ components
   - Rotate multiple components rapidly
   - Monitor frame rate and re-render count
   - Ensure no performance degradation

2. **Memory Leaks:**
   - Rotate components repeatedly
   - Monitor memory usage in DevTools
   - Verify no memory leaks from event handlers

## Implementation Notes

### Position vs Rotation Separation

**Critical Design Principle:** The stored position (x, y) and rotation angle are independent properties:

- **Position (x, y):** Represents the top-left corner of the node's bounding box in React Flow coordinates. This value is NEVER modified by rotation.
- **Rotation angle:** A visual transformation applied via CSS. This value is stored in the node's data property.

**Why this works:**
1. React Flow manages node positioning based on the bounding box
2. CSS transforms (rotation) are visual-only and don't affect layout
3. By using a fixed-size outer wrapper, the bounding box remains constant
4. The inner content rotates within that fixed box
5. Handles are positioned on the outer wrapper, so their absolute positions update correctly when rotation changes

**Alternative approach if issues arise:**
If the CSS-only approach causes positioning problems, we can implement position compensation:
```typescript
const getPositionOffset = (rotation: number, width: number, height: number) => {
  // Calculate offset needed to keep visual center in same place
  // when node dimensions effectively swap (e.g., 80x40 → 40x80)
  // This would only be needed if we don't use the wrapper approach
};
```

However, the wrapper approach (outer fixed box + inner rotated content) should eliminate the need for position compensation.

### CSS Transform Approach

Using CSS transforms for rotation is preferred over recalculating SVG coordinates because:
- Simpler implementation
- Better performance (GPU-accelerated)
- Easier to maintain
- Consistent with React best practices

**Position Handling:**
The CSS `transform: rotate()` with `transform-origin: center` rotates the node visually around its center point without changing the actual DOM position. This means:
- The stored position (x, y) in the data model remains unchanged
- React Flow's internal positioning system handles the node's bounding box
- No manual position recalculation is needed when rotation changes
- Connections (edges) automatically update because React Flow tracks handle positions relative to the rotated node

However, if visual alignment issues occur (e.g., rotated nodes appearing offset), we can adjust by:
1. Using a wrapper div with fixed dimensions that doesn't rotate
2. Rotating only the inner content
3. This keeps the React Flow node's bounding box consistent regardless of rotation

### Handle Position Strategy

Handles must update their React Flow position prop based on rotation:
- React Flow uses Position enum (Top, Right, Bottom, Left)
- Rotation requires mapping logical positions to actual positions
- Example: A resistor's "left" handle becomes "top" when rotated 90° clockwise

### Avoiding Render Loops

Following the patterns from react-patterns.md:
- Rotation handlers use `useCallback` with stable dependencies
- No memoized values in callback dependencies
- Access fresh state directly from context when needed
- Rotation value is part of node data, not separate state

### Backward Compatibility

Existing circuits without rotation data will work seamlessly:
- Rotation defaults to 0 when undefined
- No migration needed for existing data
- New circuits automatically include rotation property

## Visual Design

### Rotation Button Appearance

```
    ↻  ← Clockwise button (OUTSIDE top-left corner)
┌─────────────────┐
│     [Node]      │
│                 │
│   [Content]     │
│     10Ω         │  ← Value label (INSIDE node, rotates with it)
│                 │
└─────────────────┘
↺  ← Counter-clockwise button (OUTSIDE bottom-left corner)
```

**Key Points:**
- Rotation buttons are positioned OUTSIDE the node border at the corners
- Value labels are INSIDE the node and rotate with the entire node content
- Buttons remain accessible and don't rotate, even when node is rotated

### Rotation States

```
0°:   ─[R]─     (horizontal, default)
90°:  ┬[R]┴     (vertical, rotated clockwise)
180°: ─[R]─     (horizontal, flipped)
270°: ┬[R]┴     (vertical, rotated counter-clockwise)
```

### Value Label Positioning

Value labels are INSIDE the node and rotate WITH it to match standard circuit diagram conventions:
- At 0°: Horizontal, left-to-right (normal reading)
- At 90°: Vertical, top-to-bottom
- At 180°: Horizontal, right-to-left (upside down)
- At 270°: Vertical, bottom-to-top
- Positioned using absolute positioning within the rotated inner container
- Maintains consistent spacing from node border
- Labels are part of the rotated content, not positioned outside

**Visual Layout:**
```
        [↻]  ← Rotation button (outside, top-left corner)
    ┌─────────┐
    │  Node   │
    │ Content │
    │  10Ω    │  ← Value label (inside, rotates with node)
    └─────────┘
[↺]  ← Rotation button (outside, bottom-left corner)
```

### Polarity and Direction Handling

For voltage and current sources, handles and polarity are separate concerns:

**Critical Design Principle:**
- **Handles have neutral IDs** like "start" and "end" (or "top" and "bottom") that represent physical terminals
- **Polarity/direction is a separate property** stored in the node data that can be toggled independently
- **Connections are preserved** when polarity changes because they're tied to handle IDs, not polarity
- **Visual indicators** (+ and - signs, arrows) rotate with the component and reflect the current polarity/direction

**Voltage Source:**
- Has two handles with IDs: "top" and "bottom" (neutral, not "positive"/"negative")
- The `direction` property ('up' or 'down') determines which terminal is positive:
  - `direction: 'up'` means "top" terminal is positive, "bottom" is negative
  - `direction: 'down'` means "top" terminal is negative, "bottom" is positive
- When rotated, handles move to new React Flow positions but keep their logical IDs ("top"/"bottom" refer to the 0° orientation)
- When polarity is toggled, only the `direction` property changes, connections remain intact
- Visual polarity indicators (+ and -) are inside the rotated container and update based on `direction`

**Current Source:**
- Has two handles with IDs: "top" and "bottom" (neutral)
- The `direction` property ('up' or 'down') determines current flow:
  - `direction: 'up'` means current flows from "bottom" to "top"
  - `direction: 'down'` means current flows from "top" to "bottom"
- When rotated, handles move to new React Flow positions but keep their logical IDs
- When direction is toggled, only the `direction` property changes, connections remain intact
- Visual arrow indicator is inside the rotated container and updates based on `direction`

**Resistor:**
- Has two handles with IDs: "left" and "right" (neutral, no polarity)
- No direction property (resistors are non-polarized)
- When rotated, handles move to new React Flow positions but keep their logical IDs

**Implementation:**
```typescript
// Handles have neutral IDs based on 0° orientation - NOT polarity-based
<Handle 
  id="top"     // Logical position at 0°, not electrical polarity
  position={getHandlePosition('top', rotation)} 
/>
<Handle 
  id="bottom"  // Logical position at 0°, not electrical polarity
  position={getHandlePosition('bottom', rotation)} 
/>

// Visual polarity indicators are determined by the direction property
// They are inside the rotated container and rotate with the component
{direction === 'up' ? (
  <>
    <text>+</text>  {/* Shows at "top" terminal */}
    <text>−</text>  {/* Shows at "bottom" terminal */}
  </>
) : (
  <>
    <text>−</text>  {/* Shows at "top" terminal */}
    <text>+</text>  {/* Shows at "bottom" terminal */}
  </>
)}
```

**Why This Matters:**
1. Wires stay connected to the same physical terminals (handle IDs) when polarity changes
2. Polarity can be toggled without breaking connections
3. Rotation doesn't affect the logical relationship between handles and polarity
4. The circuit topology remains stable while electrical properties can be adjusted
