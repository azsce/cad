# Requirements Document

## Introduction

This document defines the requirements for adding rotation functionality to circuit component nodes in the visual circuit editor. The feature enables users to rotate components (resistors, voltage sources, current sources) in 90-degree increments (clockwise and counter-clockwise) to accommodate different circuit layout orientations. Rotation controls will be integrated directly into each node, and the rotation state must be synchronized between React Flow's visual representation and the Zustand store's data model.

## Glossary

- **CircuitNode**: A circuit component node in the data model that represents an electrical component (resistor, voltage source, current source)
- **React Flow Node**: The visual representation of a CircuitNode rendered by the React Flow library
- **Rotation Angle**: The orientation of a node in degrees, constrained to 0°, 90°, 180°, or 270°
- **Rotation Button**: A clickable UI control on a node that triggers rotation
- **Node Handle**: A connection point (terminal) on a node where wires can be attached
- **Zustand Store**: The centralized state management system that serves as the single source of truth for circuit data
- **CircuitFlowContext**: The React context that manages React Flow state independently and synchronizes with the Zustand store

## Requirements

### Requirement 1

**User Story:** As a circuit designer, I want to rotate components clockwise in 90-degree increments, so that I can orient components to match my desired circuit layout.

#### Acceptance Criteria

1. WHEN the user clicks the top-left rotation button on a CircuitNode, THE React Flow Node SHALL rotate 90 degrees clockwise
2. WHEN a CircuitNode rotates, THE Zustand Store SHALL update the rotation angle for that CircuitNode
3. WHEN a CircuitNode rotation angle reaches 360 degrees, THE React Flow Node SHALL reset the angle to 0 degrees
4. THE React Flow Node SHALL display a rotation button at the top-left corner with a clockwise rotation icon
5. WHEN a CircuitNode rotates, THE React Flow Node SHALL maintain its center position on the canvas

### Requirement 2

**User Story:** As a circuit designer, I want to rotate components counter-clockwise in 90-degree increments, so that I can quickly adjust component orientation in the opposite direction.

#### Acceptance Criteria

1. WHEN the user clicks the bottom-left rotation button on a CircuitNode, THE React Flow Node SHALL rotate 90 degrees counter-clockwise
2. WHEN a CircuitNode rotates counter-clockwise from 0 degrees, THE React Flow Node SHALL set the angle to 270 degrees
3. THE React Flow Node SHALL display a rotation button at the bottom-left corner with a counter-clockwise rotation icon
4. WHEN a CircuitNode rotates, THE Zustand Store SHALL persist the rotation angle with the circuit data

### Requirement 3

**User Story:** As a circuit designer, I want the entire component including its value label to rotate together, so that the component orientation matches standard circuit diagram conventions.

#### Acceptance Criteria

1. WHEN a CircuitNode rotates, THE React Flow Node SHALL apply CSS transform rotation to the entire node container including value labels
2. WHEN a CircuitNode rotates to 90 degrees, THE React Flow Node SHALL display the value label vertically from top to bottom
3. WHEN a CircuitNode rotates to 180 degrees, THE React Flow Node SHALL display the value label horizontally from right to left (upside down)
4. WHEN a CircuitNode rotates to 270 degrees, THE React Flow Node SHALL display the value label vertically from bottom to top
5. THE React Flow Node SHALL render the component symbol (resistor zigzag, voltage source, etc.) rotated according to the rotation angle
6. WHEN a CircuitNode rotates, THE React Flow Node SHALL adjust handle positions to match the rotated orientation

### Requirement 4

**User Story:** As a circuit designer, I want polarity and direction indicators to maintain their electrical meaning when rotated, so that voltage and current sources remain electrically correct regardless of visual orientation.

#### Acceptance Criteria

1. WHEN a VoltageSourceNode rotates, THE React Flow Node SHALL maintain the electrical polarity relationship between positive and negative terminals
2. WHEN a CurrentSourceNode rotates, THE React Flow Node SHALL maintain the current flow direction relative to the component's terminals
3. THE VoltageSourceNode SHALL define a "start terminal" (positive) and "end terminal" (negative) that rotate with the component
4. THE CurrentSourceNode SHALL define current flow direction from "start terminal" to "end terminal" that rotates with the component
5. WHEN a user toggles polarity or direction on a rotated component, THE React Flow Node SHALL update the electrical properties without affecting rotation angle

### Requirement 5

**User Story:** As a circuit designer, I want rotation state to persist when I save and reload circuits, so that my component orientations are preserved across sessions.

#### Acceptance Criteria

1. THE CircuitNode data model SHALL include a rotation property with values 0, 90, 180, or 270
2. WHEN a circuit is loaded from the Zustand Store, THE React Flow Node SHALL initialize with the stored rotation angle
3. WHEN the CircuitFlowContext initializes nodes from the store, THE React Flow Node SHALL apply the rotation angle from CircuitNode data
4. THE Zustand Store SHALL include the rotation angle when serializing circuit data

### Requirement 6

**User Story:** As a circuit designer, I want rotation controls to be visually distinct and easy to access, so that I can quickly rotate components without confusion.

#### Acceptance Criteria

1. THE React Flow Node SHALL display rotation buttons only when the node is hovered or selected
2. THE React Flow Node SHALL position the clockwise rotation button at the top-left corner with 8px offset from the node border
3. THE React Flow Node SHALL position the counter-clockwise rotation button at the bottom-left corner with 8px offset from the node border
4. THE React Flow Node SHALL render rotation buttons with a circular background and clear rotation arrow icons
5. WHEN the user hovers over a rotation button, THE React Flow Node SHALL display a tooltip indicating the rotation direction
6. THE React Flow Node SHALL render rotation buttons outside the rotated content area so they remain accessible at all rotation angles
