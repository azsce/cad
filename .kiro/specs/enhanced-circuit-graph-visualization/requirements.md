# Requirements Document

## Introduction

This feature replaces the existing Cytoscape-based graph visualization with a new custom SVG-based visualization system built around the CircuitGraphEngine. The new system will provide the same interactive features (zoom, pan, export, tooltips, mode switching) while using the custom graph renderer for better performance and visual consistency.

## Glossary

- **CircuitGraphEngine**: The existing custom SVG graph layout and rendering engine located in `src/components/AnalysisPane/CircuitGraphEngine/`
- **LayoutGraph**: A data structure containing pre-calculated node positions, edge paths, and label positions for SVG rendering
- **GraphLayoutEngine**: The engine that calculates the LayoutGraph from an AnalysisGraph
- **CircuitGraphRenderer**: The base SVG renderer component that draws nodes, edges, arrows, and labels
- **Visualization Mode**: One of five display modes: graph, tree, loops, cutsets, or results
- **View Component**: A React component that renders a specific visualization mode using the LayoutGraph
- **AnalysisPane**: The parent component that contains the graph visualization and analysis controls
- **PresentationContext**: React context providing visualization data and mode state
- **ModeInfoPanel**: A panel displaying mode-specific information, statistics, and equations

## Requirements

### Requirement 1

**User Story:** As a user, I want to view my circuit graph with zoom and pan controls, so that I can explore large circuits comfortably

#### Acceptance Criteria

1. WHEN the user views a valid circuit, THE CircuitGraphContainer SHALL render the circuit graph using the CircuitGraphEngine
2. WHEN the user drags on the graph canvas, THE CircuitGraphContainer SHALL pan the view to follow the drag motion
3. WHEN the user uses pinch gestures or scroll wheel, THE CircuitGraphContainer SHALL zoom the view in or out
4. WHEN the user clicks the zoom in button, THE CircuitGraphContainer SHALL increase the zoom level by 20 percent
5. WHEN the user clicks the zoom out button, THE CircuitGraphContainer SHALL decrease the zoom level by 20 percent
6. WHEN the user clicks the fit view button, THE CircuitGraphContainer SHALL adjust zoom and pan to show the entire graph with padding

### Requirement 2

**User Story:** As a user, I want to switch between different visualization modes, so that I can view different aspects of my circuit analysis

#### Acceptance Criteria

1. WHEN the user selects graph mode, THE CircuitGraphContainer SHALL render the BasicGraphView component with the LayoutGraph
2. WHEN the user selects tree mode, THE CircuitGraphContainer SHALL render the SpanningTreeView placeholder component
3. WHEN the user selects loops mode, THE CircuitGraphContainer SHALL render the LoopsView placeholder component
4. WHEN the user selects cutsets mode, THE CircuitGraphContainer SHALL render the CutSetsView placeholder component
5. WHEN the user selects results mode, THE CircuitGraphContainer SHALL render the ResultsView placeholder component
6. WHEN a placeholder view renders, THE view component SHALL display a message indicating the view will be implemented in a future spec
7. WHEN the visualization mode changes, THE CircuitGraphContainer SHALL calculate the LayoutGraph once and pass it to the selected view component

### Requirement 3

**User Story:** As a user, I want to see tooltips when hovering over graph elements, so that I can view detailed information about nodes and branches

#### Acceptance Criteria

1. WHEN the user hovers over a node, THE GraphTooltip SHALL display the node ID and connection count
2. WHEN the user hovers over an edge, THE GraphTooltip SHALL display the branch ID, component type, and resistance value
3. WHILE the user hovers over a graph element, THE GraphTooltip SHALL position itself near the element in SVG coordinate space
4. WHEN the user moves the mouse away from a graph element, THE GraphTooltip SHALL hide after 100 milliseconds
5. WHEN the graph is zoomed or panned, THE GraphTooltip SHALL maintain correct positioning relative to graph elements

### Requirement 4

**User Story:** As a user, I want to export the current graph view as an image, so that I can include it in reports and documentation

#### Acceptance Criteria

1. WHEN the user clicks the export button, THE GraphControls SHALL capture the current visible graph view as PNG
2. WHEN the export completes, THE GraphControls SHALL trigger a browser download with filename format circuit-graph-TIMESTAMP.png
3. WHEN exporting, THE GraphControls SHALL include the graph content at the current zoom level and pan position
4. WHEN exporting, THE GraphControls SHALL exclude the control buttons and mode info panel from the exported image

### Requirement 5

**User Story:** As a user, I want to see mode-specific information and statistics, so that I can understand the mathematical properties of my circuit

#### Acceptance Criteria

1. WHEN viewing graph mode, THE ModeInfoPanel SHALL display node count and branch count
2. WHEN viewing tree mode, THE ModeInfoPanel SHALL display twig count, link count, and the formula N-1 for twigs
3. WHEN viewing loops mode, THE ModeInfoPanel SHALL display loop equations with color-coded chips and the formula L equals B-N+1
4. WHEN viewing cutsets mode, THE ModeInfoPanel SHALL display cut-set equations with color-coded chips and the formula N-1 for cut-sets
5. WHEN viewing results mode, THE ModeInfoPanel SHALL display current range statistics with minimum and maximum values
6. WHEN the user clicks a loop or cut-set chip in the panel, THE ModeInfoPanel SHALL trigger element highlighting on the graph

### Requirement 6

**User Story:** As a user, I want the new visualization to replace the old Cytoscape-based one, so that I have a consistent and performant graph viewing experience

#### Acceptance Criteria

1. WHEN the AnalysisPane renders, THE AnalysisPane SHALL use CircuitGraphContainer instead of the old GraphVisualization component
2. WHEN the new visualization is integrated, THE AnalysisPane SHALL remove all references to the old GraphVisualization component
3. WHEN the new visualization is complete, THE development team SHALL delete the src/components/AnalysisPane/GraphVisualization directory
4. WHEN the new visualization renders, THE CircuitGraphContainer SHALL provide the same interactive features as the old visualization
5. WHEN switching between modes, THE CircuitGraphContainer SHALL maintain the same user experience as the old visualization

### Requirement 7

**User Story:** As a user, I want to click on graph elements to highlight related components, so that I can explore circuit topology interactively

#### Acceptance Criteria

1. WHEN the user clicks a node, THE view component SHALL invoke the onNodeClick callback with the node ID
2. WHEN the user clicks an edge, THE view component SHALL invoke the onEdgeClick callback with the branch ID
3. WHEN a click callback is invoked, THE CircuitGraphContainer SHALL update highlighted elements through PresentationContext
4. WHEN elements are highlighted, THE view component SHALL apply visual emphasis to the highlighted elements
5. WHEN the user clicks on empty space, THE CircuitGraphContainer SHALL clear all highlighted elements
