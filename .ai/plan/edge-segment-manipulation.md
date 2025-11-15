# Edge Segment Manipulation Plan

## Overview
Implement advanced edge manipulation features allowing users to:
1. Move edge segments (lines between waypoints/handles)
2. Add waypoints by Alt+Click on edge segments
3. Delete waypoints by Ctrl+Alt+Click on waypoints
4. Visual cursor feedback for different modes

## Current State Analysis

### ✅ Completed Features
- **WireEdge.tsx**: Renders orthogonal (Manhattan-style) edges with waypoints
- **Waypoint Dragging**: Waypoints can be dragged when edge is selected
- **Waypoint Deletion**: Double-click on waypoint removes it
- **Orthogonal Routing**: Edges automatically route with horizontal/vertical segments
- **Edge Selection**: Edges can be selected, showing waypoint handles
- **Click-to-Connect**: Connection mode starts on handle click, stays active until ESC or connection complete
- **Auto Waypoints**: System automatically creates waypoints when user changes direction during drawing (20px threshold)
- **Direction Locking**: Movement direction locks after threshold, prevents path from flipping
- **Direction Metadata**: Each waypoint stores its approach direction for consistent routing
- **Handle Highlighting**: Connected handles highlight when their edge is selected (using MUI theme colors)
- **Waypoint Cleaning**: Redundant auto waypoints removed on connection completion, manual waypoints preserved
- **Waypoint Hover**: Improved hover area with `pointerEvents: 'all'` on handle circles
- **ESC Key Handling**: Enhanced event handling with capture and propagation control for connection mode cancellation

### Data Structure
```typescript
interface CircuitEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  waypoints?: Waypoint[];  // Array of intermediate points with metadata
}

interface Waypoint extends Position {
  x: number;
  y: number;
  auto?: boolean;  // true = auto-created on direction change, false/undefined = manual
  direction?: 'horizontal' | 'vertical';  // Direction of segment leading TO this waypoint
}
```

### Current Waypoint Management
- Waypoints stored in `edge.data.waypoints` array as `Waypoint[]` objects
- `updateEdge(edgeId, updates)` method updates edge data in both React Flow state and Zustand store
- Orthogonal path calculated from: source → waypoints → target
- Each waypoint stores its creation method (auto/manual) and approach direction
- Auto waypoints created when user changes direction during drawing (threshold: 20px)
- Waypoint cleaning removes redundant auto waypoints on straight lines, preserving manual waypoints
- Direction information preserved to maintain routing consistency and prevent path flipping
- Waypoint handles have improved hover detection with explicit pointer events

## Feature Requirements

### 1. Edge Segment Selection & Movement
**Goal**: Click and drag any line segment to move it perpendicular to its direction

**Behavior**:
- Horizontal segments: Move up/down only
- Vertical segments: Move left/right only
- Moving a segment creates/updates waypoints at segment endpoints
- Maintains orthogonal routing with proper direction metadata
- New waypoints created by segment dragging should be marked as manual (not auto)

**Technical Approach**:
- Detect which segment is clicked (between which two points)
- Calculate perpendicular movement constraint
- Update/create waypoints to reflect new segment position
- Set `auto: false` and appropriate `direction` on created waypoints
- Leverage existing direction metadata system to maintain routing consistency

### 2. Add Waypoint (Alt+Click)
**Goal**: Add a new waypoint at click position when Alt is held

**Behavior**:
- Alt+Click on any edge segment adds waypoint at click position
- Cursor shows "+" icon when Alt is held over edge
- New waypoint inserted at correct index in waypoints array
- New waypoint marked as manual (auto: false/undefined)
- Maintains orthogonal routing with proper direction metadata

**Technical Approach**:
- Detect Alt key state
- Find which segment was clicked
- Calculate insertion index
- Insert waypoint with `auto: false` and appropriate `direction` value
- **IMPORTANT**: Preserve direction information from surrounding waypoints

### 3. Delete Waypoint (Ctrl+Alt+Click)
**Goal**: Remove waypoint when Ctrl+Alt+Click on waypoint handle

**Behavior**:
- Ctrl+Alt+Click on waypoint removes it
- Cursor shows "-" icon when Ctrl+Alt is held over waypoint
- Alternative to double-click deletion (already implemented)
- Edge re-routes through remaining waypoints
- **IMPORTANT**: Can delete both auto and manual waypoints

**Technical Approach**:
- Detect Ctrl+Alt key combination
- Identify clicked waypoint
- Remove from waypoints array (preserving direction info of remaining waypoints)
- Update edge
- **Note**: Double-click deletion already works, this adds keyboard modifier alternative

### 4. Visual Cursor Feedback
**Goal**: Show appropriate cursor for each interaction mode

**Cursors**:
- Default: `default` or `pointer` over edge
- Alt (add mode): `crosshair` or custom "+" cursor
- Ctrl+Alt (delete mode): custom "-" cursor
- Dragging segment: `move` or directional arrows
- Dragging waypoint: `move` (already implemented)

## Implementation Plan

### Phase 1: Edge Segment Detection & Data Structure

#### Task 1.1: Calculate Edge Segments
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx` or new utility file

**Actions**:
- Create `calculateEdgeSegments()` function
- Input: source, target, waypoints (with direction metadata)
- Output: Array of segments with start/end points and direction
- Consider orthogonal routing (segments are H or V)
- **IMPORTANT**: Use waypoint.direction to determine routing, don't recalculate based on deltaX/deltaY
- Leverage existing `calculateOrthogonalPath()` logic if available

**Segment Structure**:
```typescript
interface EdgeSegment {
  start: Position;
  end: Position;
  direction: 'horizontal' | 'vertical';
  index: number;  // Position in path
  beforeWaypoint?: number;  // Waypoint index before this segment
  afterWaypoint?: number;   // Waypoint index after this segment
  isAutoWaypoint?: boolean;  // Whether the waypoint at end is auto-created
}
```

**Note**: 
- Respect existing waypoint.direction values to maintain routing consistency
- Can reuse path calculation logic from WireEdge component
- Consider extracting to utility file if logic becomes complex

#### Task 1.2: Hit Detection for Segments
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- Create `findSegmentAtPoint(point, segments, threshold)` function
- Check if point is within threshold distance of any segment
- Return segment info or null
- Account for orthogonal lines (simpler hit detection)

### Phase 2: Segment Movement

#### Task 2.1: Render Invisible Hit Areas
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- Render invisible `<path>` elements over each segment
- Wider stroke width for easier clicking (e.g., 20px)
- Only render when edge is selected
- Add pointer event handlers

#### Task 2.2: Implement Segment Drag Logic
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- Add state: `draggingSegment: number | null`
- `onPointerDown`: Identify clicked segment, start drag
- `onPointerMove`: Calculate perpendicular movement
  - Horizontal segment: only update Y coordinate
  - Vertical segment: only update X coordinate
- `onPointerUp`: Finalize waypoint positions, update edge via `updateEdge()`

**Waypoint Creation Logic**:
```typescript
// When dragging segment between points A and B:
// 1. If no waypoints at A or B, create them with auto: false
// 2. Set appropriate direction metadata based on segment orientation
// 3. Move the appropriate waypoint(s) perpendicular to segment
// 4. Maintain orthogonal routing
// 5. Update both React Flow state and Zustand store via updateEdge()
```

**Important Considerations**:
- Mark created waypoints as manual (`auto: false`) since user explicitly moved segment
- Preserve direction metadata to prevent routing inconsistencies
- Use existing `updateEdge()` from CircuitFlowContext for state synchronization

#### Task 2.3: Cursor Feedback for Segment Dragging
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- Set cursor based on segment direction:
  - Horizontal: `ns-resize` (up/down arrows)
  - Vertical: `ew-resize` (left/right arrows)
- Apply to invisible hit area paths

### Phase 3: Add Waypoint (Alt+Click)

#### Task 3.1: Keyboard State Management
**File**: `src/components/CircuitEditor/CircuitEditorPane.tsx` or new hook

**Actions**:
- Create `useKeyboardModifiers()` hook
- Track Alt, Ctrl, Shift key states
- Return: `{ altKey, ctrlKey, shiftKey }`
- Use `keydown`/`keyup` event listeners

#### Task 3.2: Alt+Click Handler
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- Check if Alt key is pressed on segment click
- Calculate click position in flow coordinates (may need `screenToFlowPosition()`)
- Find which segment was clicked
- Calculate insertion index in waypoints array
- Insert new waypoint at click position with `auto: false`
- Determine and set appropriate `direction` metadata based on segment orientation
- Call `updateEdge()` with new waypoints

**Insertion Logic**:
```typescript
// If clicked segment is between waypoint[i] and waypoint[i+1]:
// Insert at index i+1
// If segment is before first waypoint: insert at index 0
// If segment is after last waypoint: append to end
// Set direction based on the segment's orientation
```

**Direction Metadata**:
- New waypoint should inherit direction logic from surrounding waypoints
- If inserting on horizontal segment, next segment should be vertical (or vice versa)
- Maintain orthogonal routing pattern

#### Task 3.3: Cursor Feedback for Alt Mode
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- When Alt is pressed and hovering over edge segment:
  - Change cursor to `crosshair` or custom "+" cursor
- Use CSS cursor or custom SVG cursor

### Phase 4: Delete Waypoint (Ctrl+Alt+Click)

#### Task 4.1: Ctrl+Alt+Click Handler
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- Check if Ctrl+Alt keys are pressed on waypoint click
- Prevent default waypoint drag behavior (use `event.stopPropagation()`)
- Remove waypoint from array (works for both auto and manual waypoints)
- Preserve direction metadata of remaining waypoints
- Call `updateEdge()` with filtered waypoints

**Note**: This complements the existing double-click deletion, providing keyboard-modifier alternative

#### Task 4.2: Cursor Feedback for Delete Mode
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- When Ctrl+Alt is pressed and hovering over waypoint:
  - Change cursor to custom "-" cursor
- Override default `move` cursor

### Phase 5: Custom Cursors

#### Task 5.1: Create Custom Cursor Assets
**File**: `src/assets/cursors/` (new directory)

**Actions**:
- Create SVG cursor icons:
  - `cursor-add.svg`: Plus sign
  - `cursor-remove.svg`: Minus sign
- Export as data URLs or CSS

#### Task 5.2: Apply Custom Cursors
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- Use CSS `cursor` property with custom images
- Fallback to standard cursors
- Example: `cursor: url(data:image/svg+xml,...), crosshair`

### Phase 6: Edge Cases & Polish

#### Task 6.1: Prevent Conflicts
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- Segment dragging should not trigger when Alt or Ctrl+Alt is pressed
- Alt+Click should not trigger segment drag
- Ctrl+Alt+Click should not trigger waypoint drag
- Use `event.stopPropagation()` and `event.preventDefault()` appropriately
- Consider event capture phase for proper handling order
- Test interaction with existing ESC key handling for connection mode

#### Task 6.2: Orthogonal Routing Preservation
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- Ensure moved segments maintain orthogonal routing
- Leverage existing direction metadata system to prevent routing issues
- Snap waypoints to grid (optional - consider for future enhancement)
- Validate waypoint positions don't create diagonal lines
- Reuse existing waypoint cleaning logic if applicable to remove redundant waypoints after operations

#### Task 6.3: Visual Feedback During Operations
**File**: `src/components/CircuitEditor/edges/WireEdge.tsx`

**Actions**:
- Highlight segment being hovered (when Alt pressed)
- Show preview of new waypoint position
- Animate waypoint addition/removal (optional)

#### Task 6.4: Undo/Redo Support
**File**: `src/store/circuitStore.ts`

**Actions**:
- Ensure all edge updates are properly tracked
- Test undo/redo with waypoint operations
- May need to enhance store history tracking

## Technical Considerations

### Coordinate Systems
- **Screen Coordinates**: Mouse event clientX/clientY
- **Flow Coordinates**: React Flow's internal coordinate system
- Use `screenToFlowPosition()` from React Flow for conversion
- Account for zoom and pan transforms
- WireEdge component already handles coordinate transformations

### Performance
- Segment hit detection on every mouse move (when Alt pressed)
- Optimize with:
  - `useMemo` for segment calculations (follow React performance guidelines)
  - `useCallback` for event handlers (follow React performance guidelines)
  - Throttle mouse move events if needed
  - Only calculate when edge is selected
- Follow project's strict performance optimization rules (see tech.md)

### Orthogonal Routing Complexity
- Moving a segment may require adjusting multiple waypoints
- Need to maintain Manhattan-style routing
- Leverage existing direction metadata system (already implemented)
- Reuse existing orthogonal routing logic from WireEdge component
- Consider extracting shared logic to utility functions

### State Management
- Edge updates go through `updateEdge()` in CircuitFlowContext
- Updates both local React Flow state and Zustand store (already implemented)
- Batch updates during drag operations to minimize re-renders
- Follow existing patterns from waypoint dragging implementation
- Avoid infinite render loops by using stable dependencies in callbacks (see react-patterns.md)

### Direction Metadata System
- Each waypoint stores `direction: 'horizontal' | 'vertical'`
- Direction indicates the segment leading TO that waypoint
- System already prevents path flipping during connection drawing
- New waypoints must set appropriate direction to maintain routing consistency
- Don't recalculate direction from deltaX/deltaY - use stored metadata

## Testing Strategy

### Manual Testing Scenarios
1. **Segment Movement**:
   - Drag horizontal segment up/down
   - Drag vertical segment left/right
   - Verify waypoints are created/updated correctly
   - Test with edges that have 0, 1, 3+ waypoints

2. **Add Waypoint**:
   - Alt+Click on various segments
   - Verify waypoint inserted at correct position
   - Test on first segment, middle segments, last segment
   - Verify orthogonal routing maintained

3. **Delete Waypoint**:
   - Ctrl+Alt+Click on waypoints
   - Verify waypoint removed
   - Test removing all waypoints
   - Compare with double-click deletion

4. **Cursor Feedback**:
   - Verify cursor changes with Alt key
   - Verify cursor changes with Ctrl+Alt keys
   - Test cursor on different segment directions

5. **Edge Cases**:
   - Very short segments
   - Overlapping segments
   - Edges with many waypoints
   - Rapid key presses
   - Drag while changing modifier keys

### Integration Testing
- Test with node movement (edges should update)
- Test with edge deletion
- Test with undo/redo
- Test with multiple selected edges

## Success Criteria

1. ✅ User can click and drag any edge segment perpendicular to its direction
2. ✅ Dragging a segment creates/updates waypoints automatically
3. ✅ Alt+Click on edge segment adds waypoint at click position
4. ✅ Ctrl+Alt+Click on waypoint removes it
5. ✅ Cursor shows "+" when Alt is held over edge
6. ✅ Cursor shows "-" when Ctrl+Alt is held over waypoint
7. ✅ Orthogonal routing is maintained after all operations
8. ✅ All operations work smoothly without conflicts
9. ✅ Changes persist and sync to store correctly
10. ✅ Performance is acceptable with multiple edges

## Files to Modify

### Primary Files
1. `src/components/CircuitEditor/edges/WireEdge.tsx` - Main implementation (already has waypoint dragging, deletion, direction metadata)
2. `src/components/CircuitEditor/CircuitEditorPane.tsx` - Keyboard state management (or create new hook)
3. `src/hooks/useKeyboardModifiers.ts` - New hook for keyboard state (to be created)

### Supporting Files
4. `src/types/circuit.ts` - May need new types for segments (Waypoint interface already has auto and direction)
5. `src/utils/edgeSegments.ts` - New utility for segment calculations (optional - can keep in WireEdge.tsx initially)
6. `src/assets/cursors/` - Custom cursor assets (optional - can use CSS cursors initially)

### Context Files (Already Exist)
7. `src/contexts/CircuitFlowContext.tsx` - Already has `updateEdge()` method
8. `src/store/connectionStore.ts` - Already handles connection state and waypoint management

### Testing Files
9. Manual testing checklist document
10. Update existing edge tests if any

## Implementation Order

1. **Phase 1**: Segment detection and data structures (foundation)
2. **Phase 3**: Alt+Click to add waypoints (simpler, builds confidence)
3. **Phase 4**: Ctrl+Alt+Click to delete waypoints (extends Phase 3)
4. **Phase 2**: Segment movement (most complex, benefits from Phase 1)
5. **Phase 5**: Custom cursors (polish)
6. **Phase 6**: Edge cases and refinement (final polish)

## Notes

- Start with Phase 1 and Phase 3 as they're foundational and simpler
- Phase 2 (segment movement) is the most complex - save for when other phases are working
- Consider implementing a "debug mode" to visualize segments and hit areas
- May want to add configuration for hit detection threshold
- Consider adding keyboard shortcuts help tooltip

## Key Learnings from Previous Work

1. **Direction Metadata is Critical**: Always preserve and set waypoint.direction to maintain routing consistency
2. **Auto vs Manual Waypoints**: System distinguishes between auto-created (during drawing) and manual (user-created) waypoints
3. **Event Handling**: Use capture phase and stopPropagation carefully to prevent conflicts
4. **State Synchronization**: Always use `updateEdge()` from CircuitFlowContext to sync both React Flow and Zustand store
5. **Performance**: Follow strict `useMemo`/`useCallback` patterns per project guidelines
6. **Hover Areas**: Explicit `pointerEvents` styling may be needed for reliable interaction
7. **ESC Key**: Connection mode already has robust ESC handling - don't interfere with it

## Potential Challenges

1. **Segment Hit Detection**: Need accurate detection without impacting performance
2. **Coordinate Conversion**: Must properly convert between screen and flow coordinates
3. **Direction Inference**: When adding waypoints, must correctly infer direction metadata
4. **Event Conflicts**: Multiple interaction modes (drag segment, add waypoint, delete waypoint, drag waypoint) must not conflict
5. **Orthogonal Constraints**: Segment movement must maintain Manhattan routing without creating diagonal lines
