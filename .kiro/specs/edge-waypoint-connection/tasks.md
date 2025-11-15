# Implementation Plan: Edge Waypoint Connection System

## Overview

This implementation plan breaks down the waypoint connection feature into discrete, manageable coding tasks. Each task builds incrementally on previous work, following the dual-phase architecture (drawing mode → persistent rendering) defined in the design document.

## Task List

- [x] 1. Extend data model for waypoint support





  - Add `Position` type and `waypoints` property to `CircuitEdge` interface
  - Ensure backward compatibility with existing edges
  - _Requirements: 8.1, 8.2_

- [x] 2. Create connection state store




  - [x] 2.1 Implement Zustand connection store


    - Create `src/store/connectionStore.ts` with state management for drawing mode
    - Implement `startConnecting`, `addWaypoint`, `endConnecting`, `cancelConnecting` actions
    - Add TypeScript types for connection state
    - _Requirements: 1.1, 1.2, 2.1, 4.3_

- [x] 3. Implement custom connection line component




  - [x] 3.1 Create WaypointConnectionLine component


    - Create `src/components/CircuitEditor/edges/WaypointConnectionLine.tsx`
    - Subscribe to connection store waypoints
    - Build multi-segment SVG path with M and L commands
    - Render dashed line style and waypoint markers
    - _Requirements: 1.4, 2.4, 5.1, 5.2, 5.4_

- [x] 4. Enhance CircuitFlowContext with connection handlers




  - [x] 4.1 Add event handler methods


    - Implement `onConnectStart` handler to enter drawing mode
    - Implement `onPaneClick` handler to add waypoints using `screenToFlowPosition`
    - Implement `onConnectEnd` handler to cancel connections
    - Implement `onConnect` handler to create edges with waypoints (state handoff)
    - Add Escape key handler to cancel connection mode
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.3, 4.1, 4.2, 4.4_
  
  - [x] 4.2 Add updateEdge method


    - Implement `updateEdge` method following the `updateNodeData` pattern
    - Update local edges state immediately
    - Sync to Zustand store
    - Export method in context value
    - _Requirements: 6.4_

- [x] 5. Update CircuitStore with edge update capability

  - [x] 5.1 Add updateEdge action to circuitStore


    - Implement `updateEdge` method in `src/store/circuitStore.ts`
    - Update edge properties in circuits map
    - Update `modifiedAt` timestamp
    - _Requirements: 6.4, 8.3_

- [x] 6. Enhance WireEdge component for waypoint rendering








  - [x] 6.1 Implement waypoint path rendering


    - Extract waypoints from edge data prop
    - Build polyline SVG path through all waypoints
    - Ensure backward compatibility (render direct line if no waypoints)
    - _Requirements: 3.5, 8.5, 8.6_
  
  - [x] 6.2 Add draggable waypoint handles

    - Render SVG circle elements at waypoint positions when edge is selected
    - Implement pointer event handlers (onPointerDown, onPointerMove, onPointerUp)
    - Use `screenToFlowPosition` for coordinate conversion
    - Call `updateEdge` from context during drag
    - _Requirements: 6.1, 6.2, 6.3_
  
-

  - [x] 6.3 Implement waypoint removal


    - Add double-click handler to waypoint circles
    - Filter waypoints array and call `updateEdge`
    - _Requirements: 6.5_

- [x] 7. Configure CircuitEditorPane for click-to-connect
  - [x] 7.1 Wire up React Flow props
    - Set `connectOnClick={true}` on ReactFlow component
    - Pass `connectionLineComponent={WaypointConnectionLine}`
    - Wire `onConnectStart`, `onPaneClick`, `onConnectEnd` from context
    - _Requirements: 1.1, 2.1, 3.1_
  
  - [x] 7.2 Update connection validation
    - Extend `isValidConnection` to prevent invalid waypoint connections
    - Prevent self-connections and duplicate connections
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 8. Add visual feedback and UX polish
  - [x] 8.1 Implement cursor state changes
    - Change cursor to crosshair during connection mode
    - Change cursor to pointer when hovering valid target handles
    - Restore default cursor when exiting connection mode
    - _Requirements: 10.1, 10.3, 10.4_
  
  - [x] 8.2 Add connection mode status indicator
    - Display status message during connection mode
    - Show instructions: "Click to add waypoints, click handle to connect, ESC to cancel"
    - _Requirements: 10.2_
  
  - [x] 8.3 Implement handle highlighting
    - Highlight valid target handles on hover during connection mode
    - Show visual indicator for invalid connections
    - _Requirements: 5.3, 7.3_
  
  - [x] 8.4 Add UI element opacity control
    - Reduce opacity of unavailable UI elements during connection mode
    - Disable node selection and dragging during connection mode
    - _Requirements: 9.1, 9.2, 10.5_
  
  - [x] 8.5 Implement click-to-start connection mode
    - Connection mode starts on handle click (not drag)
    - Connection line follows cursor position
    - Connection mode stays active until ESC or valid connection
    - Created ConnectableHandle wrapper component for custom click handling
    - Added ConnectionOverlay component for cursor-following connection line
    - Updated connection store to track cursor position
    - _Requirements: 1.1, 1.2, 2.1, 4.1_

- [ ] 9. Verify data persistence
  - [ ] 9.1 Test waypoint storage and retrieval
    - Verify waypoints are saved to Zustand store when edge is created
    - Verify waypoints are loaded correctly when circuit is opened
    - Test edge rendering with stored waypoints
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  
  - [ ] 9.2 Test waypoint updates persist
    - Verify dragged waypoint positions are saved to store
    - Verify removed waypoints are deleted from store
    - Test circuit reload after waypoint modifications
    - _Requirements: 8.3_

- [ ] 10. Handle edge cases and cleanup
  - [ ] 10.1 Test connection cancellation scenarios
    - Verify Escape key cancels connection and clears waypoints
    - Verify clicking outside canvas doesn't cancel connection
    - Verify connection state resets properly
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 9.3_
  
  - [ ] 10.2 Test edge deletion with waypoints
    - Verify edges with waypoints can be deleted
    - Verify node deletion removes connected edges with waypoints
    - _Requirements: 9.4_
  
  - [ ] 10.3 Test backward compatibility
    - Verify existing edges without waypoints still render correctly
    - Verify new edges can be created without waypoints (direct connections)
    - Test mixed circuits with both waypoint and non-waypoint edges
    - _Requirements: 8.6_

## Implementation Notes

### Execution Order
1. Start with data model and store (tasks 1-2)
2. Implement Phase 1: Drawing mode (tasks 3-4)
3. Implement Phase 2: Persistent rendering (tasks 5-6)
4. Wire everything together (task 7)
5. Add polish and validation (tasks 8-10)

### Key Patterns to Follow
- **Independent Local State**: Update React Flow local state immediately, sync to store on completion
- **Batched Updates**: Waypoint dragging updates local state during drag, syncs to store on drag end
- **Context Orchestration**: All updates go through CircuitFlowContext methods, not direct store access
- **Coordinate Conversion**: Always use `screenToFlowPosition` for mouse/pointer coordinates
- **State Handoff**: Connection store waypoints → edge data prop in `onConnect` handler

### Testing Strategy
- Test each phase independently before integration
- Verify state synchronization between local state and store
- Test with various waypoint counts (0, 1, 3, 5+)
- Test edge cases: cancellation, deletion, invalid connections
- Verify backward compatibility with existing circuits

### Performance Considerations
- Use `useMemo` for path calculations
- Use `useCallback` for event handlers
- Render waypoint handles only when edge is selected
- Batch waypoint drag updates (don't sync to store on every pointer move)

## Success Criteria

The implementation is complete when:
1. ✅ Users can click a handle to start connection mode
2. ✅ Users can click canvas to add waypoints
3. ✅ Users can click target handle to complete connection
4. ✅ Users can press Escape to cancel connection
5. ✅ Edges render through all waypoints
6. ✅ Users can drag waypoints to edit paths
7. ✅ Users can double-click waypoints to remove them
8. ✅ Waypoints persist across circuit save/load
9. ✅ Visual feedback clearly indicates connection mode state
10. ✅ Existing edges without waypoints continue to work
