# Requirements Document

## Introduction

This document outlines the requirements for a web-based circuit analysis application that allows users to visually design electrical circuits and automatically perform nodal and loop analysis. The application will provide a professional-grade tool for analyzing DC circuits using graph theory and matrix methods, with step-by-step mathematical solutions presented in a readable format.

The application features a three-pane interface: a circuit manager for organizing multiple circuits, a visual editor with drag-and-drop component placement, and an analysis pane that displays detailed mathematical solutions with proper formatting.

**Important Note:** The implementation must account for corrections to the reference CAD lecture materials, particularly in the construction of topology matrices (Incidence, Tie-set, and Cut-set matrices). The corrected formulations will be documented in the design phase to ensure mathematical accuracy.

## Requirements

### Requirement 1: Circuit Visual Editor

**User Story:** As a user, I want to visually design circuits by dragging and dropping components onto a canvas, so that I can quickly build circuit diagrams without manual coding.

#### Acceptance Criteria

1. WHEN the user drags a component from the palette THEN the system SHALL allow dropping it onto the canvas at the cursor position
2. WHEN a component is dropped THEN the system SHALL open a dialog to configure the component's properties (ID, value)
3. WHEN the user connects two component terminals THEN the system SHALL create a wire connection between them
4. WHEN the user moves a component THEN the system SHALL update the component's position in the data model
5. WHEN the user deletes a component or connection THEN the system SHALL remove it from the circuit data model

### Requirement 2: Component Library

**User Story:** As a user, I want access to standard circuit components (resistors, voltage sources, current sources), so that I can build realistic circuit models.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a component palette with resistor, voltage source, and current source options
2. WHEN a resistor is placed THEN the system SHALL render it with two terminals and an editable resistance value
3. WHEN a voltage source is placed THEN the system SHALL render it with two terminals, polarity indicators, and an editable voltage value
4. WHEN a voltage source direction icon is clicked THEN the system SHALL toggle the polarity direction
5. WHEN a current source is placed THEN the system SHALL render it with two terminals, direction indicator, and an editable current value
6. WHEN component values are edited inline THEN the system SHALL update the data model immediately

### Requirement 3: Multi-Circuit Management

**User Story:** As a user, I want to create and manage multiple circuit designs within the same session, so that I can work on different problems without losing my work.

#### Acceptance Criteria

1. WHEN the user clicks "New Circuit" THEN the system SHALL create a new empty circuit and add it to the circuit list
2. WHEN the user selects a circuit from the list THEN the system SHALL display that circuit in the editor and analysis panes
3. WHEN the user deletes a circuit THEN the system SHALL remove it from the circuit list and clear the editor if it was active
4. WHEN circuits are created THEN the system SHALL assign each a unique ID and default name
5. WHEN the user edits a circuit name THEN the system SHALL update the name in the circuit list

### Requirement 4: Circuit Validation

**User Story:** As a user, I want the system to validate my circuit before analysis, so that I receive clear feedback about any issues that would prevent solving.

#### Acceptance Criteria

1. WHEN the user requests analysis THEN the system SHALL check if the circuit graph is fully connected
2. IF the circuit has isolated components THEN the system SHALL display an error message indicating disconnected parts
3. WHEN validating THEN the system SHALL verify at least one voltage or current source exists
4. WHEN validating THEN the system SHALL detect loops containing only voltage sources and report them as errors
5. WHEN validating THEN the system SHALL detect cut-sets containing only current sources and report them as errors
6. IF validation fails THEN the system SHALL NOT proceed with mathematical analysis

### Requirement 5: Nodal Analysis (Cut-Set Method)

**User Story:** As a user, I want the system to perform nodal analysis on my circuit, so that I can determine all node voltages and branch currents.

#### Acceptance Criteria

1. WHEN nodal analysis is selected THEN the system SHALL identify all unique electrical nodes in the circuit
2. WHEN nodes are identified THEN the system SHALL select one node as the reference (ground) node
3. WHEN performing nodal analysis THEN the system SHALL construct the incidence matrix (A) based on branch-node connections
4. WHEN performing nodal analysis THEN the system SHALL construct the branch admittance matrix (YB) as a diagonal matrix
5. WHEN matrices are constructed THEN the system SHALL solve the equation (A * YB * A^T) * V = I_sources using linear algebra
6. WHEN the solution is obtained THEN the system SHALL calculate all branch currents from the node voltages
7. IF the system of equations is singular THEN the system SHALL display an error indicating the circuit cannot be solved

### Requirement 6: Loop Analysis (Tie-Set Method)

**User Story:** As a user, I want the system to perform loop analysis on my circuit, so that I can determine all loop currents and branch voltages.

#### Acceptance Criteria

1. WHEN loop analysis is selected THEN the system SHALL construct a graph from the circuit nodes and edges
2. WHEN the graph is constructed THEN the system SHALL find a spanning tree of the graph
3. WHEN the spanning tree is found THEN the system SHALL identify all links (edges not in the tree)
4. WHEN links are identified THEN the system SHALL define fundamental loops for each link
5. WHEN loops are defined THEN the system SHALL construct the tie-set matrix (B) from the fundamental loops
6. WHEN performing loop analysis THEN the system SHALL construct the branch impedance matrix (ZB)
7. WHEN matrices are constructed THEN the system SHALL solve the equation (B * ZB * B^T) * I_loop = V_sources using linear algebra
8. WHEN the solution is obtained THEN the system SHALL calculate all branch voltages and currents
9. IF the system of equations is singular THEN the system SHALL display an error indicating the circuit cannot be solved

### Requirement 7: Step-by-Step Solution Presentation

**User Story:** As a user, I want to see the complete step-by-step mathematical solution with properly formatted matrices and equations, so that I can understand and verify the analysis process.

#### Acceptance Criteria

1. WHEN analysis completes THEN the system SHALL generate a formatted report showing all analysis steps
2. WHEN displaying matrices THEN the system SHALL render them using LaTeX notation with proper formatting
3. WHEN displaying equations THEN the system SHALL render them using mathematical notation (KaTeX)
4. WHEN presenting the solution THEN the system SHALL include sections for: incidence/tie-set matrix, impedance/admittance matrix, system equations, and final results
5. WHEN showing final results THEN the system SHALL display branch currents and voltages in a formatted table
6. WHEN the report is generated THEN the system SHALL use Markdown for structure and readability

### Requirement 8: Centralized State Management

**User Story:** As a developer, I want all circuit data managed through a centralized state system, so that the UI components remain synchronized and the data model is the single source of truth.

#### Acceptance Criteria

1. WHEN the application initializes THEN the system SHALL create a Zustand store for all circuit data
2. WHEN any component modifies circuit data THEN the system SHALL update the store through defined actions
3. WHEN the store updates THEN the system SHALL trigger re-renders of all subscribed components
4. WHEN React Flow nodes/edges change THEN the system SHALL update the centralized data model, not local React Flow state
5. WHEN multiple circuits exist THEN the system SHALL maintain them in a keyed record structure with an active circuit ID

### Requirement 9: Responsive Three-Pane Layout

**User Story:** As a user, I want a resizable three-pane interface, so that I can adjust the workspace to focus on different aspects of my work.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display three resizable panes: circuit manager (left), editor (center), and analysis (right)
2. WHEN the user drags a pane divider THEN the system SHALL resize the adjacent panes dynamically
3. WHEN panes are resized THEN the system SHALL enforce minimum size constraints to prevent panes from disappearing
4. WHEN the window is resized THEN the system SHALL maintain the proportional layout of all panes
5. WHEN the layout is adjusted THEN the system SHALL ensure all content remains accessible and properly rendered

### Requirement 11: Theme System

**User Story:** As a user, I want to switch between light and dark themes, so that I can work comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL apply a default theme (light or dark based on system preference)
2. WHEN the user clicks the theme toggle THEN the system SHALL switch between light and dark themes
3. WHEN the theme changes THEN the system SHALL update all UI components consistently
4. WHEN the theme is changed THEN the system SHALL persist the user's preference
5. WHEN using Material-UI components THEN the system SHALL apply the active theme to all MUI components

### Requirement 10: Analysis Pipeline Architecture

**User Story:** As a developer, I want the analysis logic separated into distinct layers (validation, calculation, presentation), so that the system is modular, testable, and maintainable.

#### Acceptance Criteria

1. WHEN a circuit is selected THEN the system SHALL pass it through a validation context layer
2. WHEN validation succeeds THEN the system SHALL pass the validated graph to a calculation context layer
3. WHEN calculations complete THEN the system SHALL pass the results to a presentation context layer
4. WHEN any layer encounters an error THEN the system SHALL propagate the error to the UI without crashing
5. WHEN the circuit model changes THEN the system SHALL automatically trigger the pipeline to re-run
6. WHEN implementing the pipeline THEN the system SHALL use React Context providers for each layer
