# Requirements Document

## Introduction

This document defines the requirements for implementing a custom edge connection mode with waypoints in the circuit editor. The feature enables users to create wire connections between circuit components with intermediate stop points (waypoints) that define the path of the wire. Instead of the default React Flow behavior where users must hold down the mouse button while dragging, this feature introduces a click-based connection mode where users click to start connecting, add waypoints with subsequent clicks, and complete the connection by clicking on a target handle or pressing Escape to cancel.

This enhancement improves the user experience for creating complex circuit layouts where wires need to follow specific paths around components, creating orthogonal (right-angle) routing patterns common in professional circuit diagrams.

**Research Reference:** This feature is based on the "Proteus-style" connection architecture documented in #[[file:docs/flow/connection.md]], which provides a comprehensive analysis of implementing dual-phase (drawing and rendering) waypoint-based edge connections in React Flow.

## Glossary

- **Connection Mode**: A state where the editor is actively creating a new edge connection
- **Waypoint**: An intermediate point along an edge path that defines where the wire should route
- **Stop Point**: Synonym for waypoint - a point where the edge path changes direction
- **Handle**: A connection point (terminal) on a circuit component node where edges can attach
- **Source Handle**: The starting handle of an edge connection
- **Target Handle**: The ending handle of an edge connection
- **Edge Segment**: A straight line section between two consecutive points (handle, waypoint, or handle)
- **CircuitFlowContext**: The React context component that manages React Flow state and synchronizes with the Zustand store
- **Connection State**: The data structure tracking the active connection being created (source, waypoints, current position)
- **Orthogonal Routing**: Wire routing that uses only horizontal and vertical line segments (right angles)
- **CircuitEdge**: A persistent edge object stored in the Zustand store representing a wire connection between two component handles
- **ReactFlow**: The React Flow library component responsible for rendering the circuit canvas and managing node/edge visualization
- **Zustand Store**: The centralized state management store that persists all circuit data including nodes, edges, and waypoints

## Requirements

### Requirement 1

**User Story:** As a circuit designer, I want to click on a node handle to start creating a connection without holding the mouse button, so that I can easily create wire connections with multiple waypoints.

#### Acceptance Criteria

1. WHEN the user clicks on a source Handle, THE CircuitFlowContext SHALL enter Connection Mode
2. WHEN Connection Mode is active, THE CircuitFlowContext SHALL store the source node ID and source Handle ID
3. WHEN Connection Mode is active, THE CircuitFlowContext SHALL track the current mouse position
4. WHEN Connection Mode is active, THE CircuitFlowContext SHALL display a temporary edge line from the source Handle to the current mouse position
5. WHEN the user moves the mouse in Connection Mode, THE CircuitFlowContext SHALL update the temporary edge line endpoint to follow the cursor

### Requirement 2

**User Story:** As a circuit designer, I want to add waypoints by clicking on the canvas, so that I can define the exact path my wire should follow.

#### Acceptance Criteria

1. WHEN the user clicks on the canvas in Connection Mode, THE CircuitFlowContext SHALL add a Waypoint at the click position
2. WHEN a Waypoint is added, THE CircuitFlowContext SHALL create an Edge Segment from the previous point to the new Waypoint
3. WHEN a Waypoint is added, THE CircuitFlowContext SHALL update the temporary edge line to start from the new Waypoint
4. WHEN multiple Waypoints exist, THE CircuitFlowContext SHALL render all Edge Segments as straight lines
5. WHEN the user moves the mouse after adding a Waypoint, THE CircuitFlowContext SHALL display a temporary line from the last Waypoint to the cursor

### Requirement 3

**User Story:** As a circuit designer, I want to complete a connection by clicking on a target handle, so that I can finalize the wire connection between two components.

#### Acceptance Criteria

1. WHEN the user clicks on a target Handle in Connection Mode, THE CircuitFlowContext SHALL create a CircuitEdge with all Waypoints
2. WHEN a CircuitEdge is created, THE CircuitFlowContext SHALL store the source Handle, target Handle, and all Waypoint positions in the Zustand Store
3. WHEN a CircuitEdge is created, THE CircuitFlowContext SHALL exit Connection Mode
4. WHEN a CircuitEdge is created, THE CircuitFlowContext SHALL synchronize the edge data to both the local React Flow state and the Zustand Store
5. WHEN a CircuitEdge with Waypoints is rendered, THE ReactFlow SHALL display the edge as connected line segments through all Waypoints
### Requirement 4

**User Story:** As a circuit designer, I want to cancel a connection in progress by pressing Escape, so that I can abort creating a wire if I make a mistake.

#### Acceptance Criteria

1. WHEN the user presses the Escape key in Connection Mode, THE CircuitFlowContext SHALL exit Connection Mode
2. WHEN the user exits Connection Mode, THE CircuitFlowContext SHALL remove all temporary edge visualizations
3. WHEN the user exits Connection Mode, THE CircuitFlowContext SHALL clear all stored Waypoints from Connection State
4. WHEN the user exits Connection Mode without completing a connection, THE CircuitFlowContext SHALL discard the Connection State without creating a CircuitEdge
5. WHEN the user exits Connection Mode, THE CircuitFlowContext SHALL restore normal editing mode

### Requirement 5

**User Story:** As a circuit designer, I want visual feedback showing the connection path as I create it, so that I can see exactly where my wire will be routed.

#### Acceptance Criteria

1. WHEN Connection Mode is active, THE CircuitFlowContext SHALL render all completed Edge Segments with a solid line style
2. WHEN Connection Mode is active, THE CircuitFlowContext SHALL render the temporary edge line with a dashed line style
3. WHEN the user hovers over a valid target Handle in Connection Mode, THE CircuitFlowContext SHALL highlight the Handle
4. WHEN a Waypoint is added, THE CircuitFlowContext SHALL render a visual marker at the Waypoint position
5. WHEN the mouse moves in Connection Mode, THE CircuitFlowContext SHALL update the temporary line endpoint position within 16 milliseconds

### Requirement 6

**User Story:** As a circuit designer, I want waypoints to be editable after creating a connection, so that I can adjust wire routing without recreating the entire connection.

#### Acceptance Criteria

1. WHEN a CircuitEdge with Waypoints is selected, THE custom edge component SHALL display draggable handles at each Waypoint
2. WHEN the user drags a Waypoint handle, THE custom edge component SHALL update the Waypoint position in local React Flow state immediately
3. WHEN a Waypoint is being dragged, THE custom edge component SHALL update the adjacent Edge Segments in real-time without syncing to the Zustand Store
4. WHEN a Waypoint drag ends, THE custom edge component SHALL sync the final Waypoint positions to the Zustand Store via updateEdge action
5. WHEN the user double-clicks a Waypoint handle, THE custom edge component SHALL remove that Waypoint and immediately sync the updated waypoints array to the Zustand Store

### Requirement 7

**User Story:** As a circuit designer, I want to prevent invalid connections during waypoint creation, so that I only create electrically valid wire connections.

#### Acceptance Criteria

1. WHEN the user attempts to connect to the same Handle as the source, THE CircuitFlowContext SHALL prevent the connection
2. WHEN the user attempts to create a duplicate connection, THE CircuitFlowContext SHALL prevent the connection
3. WHEN hovering over an invalid target Handle, THE CircuitFlowContext SHALL display a visual indicator that the connection is not allowed
4. WHEN clicking on an invalid target Handle, THE CircuitFlowContext SHALL remain in Connection Mode without creating an edge
5. WHEN Connection Mode is active, THE CircuitFlowContext SHALL disable other editing operations (node dragging, selection)

### Requirement 8

**User Story:** As a circuit designer, I want waypoint data to persist when I save and reload circuits, so that my custom wire routing is preserved across sessions.

#### Acceptance Criteria

1. THE CircuitEdge data model SHALL include a waypoints property as an array of position objects
2. WHEN a CircuitEdge with Waypoints is created, THE CircuitFlowContext SHALL store all Waypoint positions in the Zustand Store
3. WHEN a Waypoint is modified on an existing CircuitEdge, THE CircuitFlowContext SHALL update the CircuitEdge waypoints array in the Zustand Store
4. WHEN a circuit is loaded from the Zustand Store, THE CircuitFlowContext SHALL restore all CircuitEdge Waypoints from the stored data
5. WHEN rendering a loaded CircuitEdge with Waypoints, THE ReactFlow SHALL display the edge through all stored Waypoints
6. WHEN rendering a loaded CircuitEdge without Waypoints, THE ReactFlow SHALL display the edge as a direct connection between source and target handles

### Requirement 9

**User Story:** As a circuit designer, I want the connection mode to work seamlessly with existing editor features, so that I can use waypoint connections alongside other editing operations.

#### Acceptance Criteria

1. WHEN Connection Mode is active, THE CircuitFlowContext SHALL prevent node selection and dragging
2. WHEN Connection Mode is active, THE CircuitFlowContext SHALL prevent edge selection
3. WHEN the user clicks outside the canvas in Connection Mode, THE CircuitFlowContext SHALL remain in Connection Mode
4. WHEN a node is deleted that has edges with Waypoints, THE CircuitFlowContext SHALL delete all connected edges
5. WHEN Connection Mode is not active, THE CircuitFlowContext SHALL allow all normal editing operations

### Requirement 10

**User Story:** As a circuit designer, I want clear visual indicators of the connection mode state, so that I always know whether I'm in connection mode or normal editing mode.

#### Acceptance Criteria

1. WHEN Connection Mode is active, THE CircuitFlowContext SHALL change the cursor to a crosshair style
2. WHEN Connection Mode is active, THE CircuitFlowContext SHALL display a status message with the text "Connection Mode - Click to add waypoints, click handle to connect, ESC to cancel"
3. WHEN the user hovers over a valid target Handle in Connection Mode, THE CircuitFlowContext SHALL change the cursor to a pointer style
4. WHEN Connection Mode is exited, THE CircuitFlowContext SHALL restore the cursor to the default style
5. WHEN Connection Mode is active, THE CircuitFlowContext SHALL reduce the opacity of unavailable UI elements to 50 percent
