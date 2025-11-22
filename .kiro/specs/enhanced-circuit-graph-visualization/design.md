# Design Document

## Overview

This design replaces the Cytoscape-based graph visualization with a custom SVG-based system built on the existing CircuitGraphEngine. The architecture separates concerns into:

1. **Layout calculation** (already exists in GraphLayoutEngine)
2. **Container/orchestration** (new CircuitGraphContainer)
3. **View rendering** (new view components)
4. **Interactive controls** (new GraphControls, GraphTooltip)
5. **Information display** (copied ModeInfoPanel)

The key principle is that the LayoutGraph is calculated once and passed to all view components, ensuring visual consistency and performance.

## Architecture

### Component Hierarchy

```
AnalysisPane
└── CircuitGraphContainer
    ├── TransformWrapper (react-zoom-pan-pinch)
    │   └── TransformComponent
    │       ├── [Selected View Component]
    │       │   ├── BasicGraphView (uses CircuitGraphRenderer)
    │       │   ├── SpanningTreeView (placeholder)
    │       │   ├── LoopsView (placeholder)
    │       │   ├── CutSetsView (placeholder)
    │       │   └── ResultsView (placeholder)
    │       └── GraphTooltip (SVG overlay)
    ├── GraphControls (positioned absolutely)
    └── ModeInfoPanel (below graph)
```

### Data Flow

```
AnalysisPane
  ↓ (analysisGraph, visualizationData from contexts)
CircuitGraphContainer
  ↓ (calculates LayoutGraph once)
  ├→ BasicGraphView (receives LayoutGraph)
  ├→ SpanningTreeView (receives LayoutGraph + twigBranchIds)
  ├→ LoopsView (receives LayoutGraph + loopDefinitions)
  ├→ CutSetsView (receives LayoutGraph + cutSetDefinitions)
  └→ ResultsView (receives LayoutGraph + branchResults)
```

## Components and Interfaces

### 1. CircuitGraphContainer

**Purpose:** Main orchestration component that manages zoom/pan, mode switching, and layout calculation.

**Props:**
```typescript
interface CircuitGraphContainerProps {
  analysisGraph: AnalysisGraph;
  visualizationData: GraphVisualizationData;
  onElementClick?: (elementId: string) => void;
}
```

**State:**
- `layoutGraph: LayoutGraph | null` - Calculated once from analysisGraph
- `tooltipData: TooltipData | null` - Current tooltip content and position
- `transformRef: RefObject<ReactZoomPanPinchRef>` - Reference to zoom/pan controls

**Responsibilities:**
- Calculate LayoutGraph using GraphLayoutEngine
- Render appropriate view component based on visualizationData.mode
- Manage zoom/pan state via react-zoom-pan-pinch
- Handle export to PNG functionality
- Coordinate tooltip display
- Pass click handlers to view components

**Key Methods:**
- `calculateLayout()` - Calls GraphLayoutEngine.calculateLayout()
- `handleExportPNG()` - Captures SVG and exports as PNG
- `handleNodeHover()` - Shows tooltip for node
- `handleEdgeHover()` - Shows tooltip for edge
- `handleMouseLeave()` - Hides tooltip

### 2. BasicGraphView

**Purpose:** Renders the basic circuit graph using CircuitGraphRenderer.

**Props:**
```typescript
interface BasicGraphViewProps {
  layoutGraph: LayoutGraph;
  onNodeClick?: (nodeId: NodeId) => void;
  onEdgeClick?: (branchId: BranchId) => void;
  onNodeHover?: (nodeId: NodeId, event: React.MouseEvent) => void;
  onEdgeHover?: (branchId: BranchId, event: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}
```

**Responsibilities:**
- Render CircuitGraphRenderer with layoutGraph
- Forward hover and click events to parent
- No additional styling or overlays

### 3. SpanningTreeView (Placeholder)

**Purpose:** Placeholder for future spanning tree visualization.

**Props:**
```typescript
interface SpanningTreeViewProps {
  layoutGraph: LayoutGraph;
  twigBranchIds: Set<BranchId>;
  onNodeClick?: (nodeId: NodeId) => void;
  onEdgeClick?: (branchId: BranchId) => void;
}
```

**Implementation:**
- Renders a centered message: "Spanning Tree View - To be implemented"
- Displays the LayoutGraph dimensions for reference
- No actual graph rendering

### 4. LoopsView (Placeholder)

**Purpose:** Placeholder for future loops visualization.

**Props:**
```typescript
interface LoopsViewProps {
  layoutGraph: LayoutGraph;
  loopDefinitions: LoopDefinition[];
  highlightedElements: string[];
  onNodeClick?: (nodeId: NodeId) => void;
  onEdgeClick?: (branchId: BranchId) => void;
}
```

**Implementation:**
- Renders a centered message: "Loops View - To be implemented"
- Lists loop count for reference
- No actual graph rendering

### 5. CutSetsView (Placeholder)

**Purpose:** Placeholder for future cut-sets visualization.

**Props:**
```typescript
interface CutSetsViewProps {
  layoutGraph: LayoutGraph;
  cutSetDefinitions: CutSetDefinition[];
  highlightedElements: string[];
  onNodeClick?: (nodeId: NodeId) => void;
  onEdgeClick?: (branchId: BranchId) => void;
}
```

**Implementation:**
- Renders a centered message: "Cut-Sets View - To be implemented"
- Lists cut-set count for reference
- No actual graph rendering

### 6. ResultsView (Placeholder)

**Purpose:** Placeholder for future results visualization.

**Props:**
```typescript
interface ResultsViewProps {
  layoutGraph: LayoutGraph;
  branchResults: Map<string, { current: number; voltage: number }>;
  onNodeClick?: (nodeId: NodeId) => void;
  onEdgeClick?: (branchId: BranchId) => void;
}
```

**Implementation:**
- Renders a centered message: "Results View - To be implemented"
- Lists result count for reference
- No actual graph rendering

### 7. GraphTooltip

**Purpose:** Custom SVG-based tooltip for displaying element details on hover.

**Props:**
```typescript
interface GraphTooltipProps {
  data: TooltipData | null;
  svgWidth: number;
  svgHeight: number;
}

interface TooltipData {
  type: 'node' | 'edge';
  position: { x: number; y: number };
  content: {
    title: string;
    details: Array<{ label: string; value: string }>;
  };
}
```

**Rendering:**
- SVG `<g>` element positioned at data.position
- Background `<rect>` with rounded corners and shadow
- `<text>` elements for title and details
- Auto-adjusts position to stay within SVG bounds
- Fade in/out animation

**Styling:**
- Background: white with 90% opacity
- Border: 1px solid gray
- Padding: 8px
- Font: 12px sans-serif
- Title: bold, 14px

### 8. GraphControls

**Purpose:** Control buttons for zoom, pan, and export operations.

**Props:**
```typescript
interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onExportPNG: () => void;
}
```

**Layout:**
- Positioned absolutely in top-right corner
- Vertical stack of icon buttons
- MUI IconButton components
- Tooltips on hover (MUI Tooltip)

**Buttons:**
1. Zoom In (ZoomIn icon)
2. Zoom Out (ZoomOut icon)
3. Fit to View (FitScreen icon)
4. Export PNG (CameraAlt icon)

**Styling:**
- Background: white paper
- Box shadow: elevation 2
- Border radius: 4px
- Padding: 4px
- Gap: 8px between buttons

### 9. ModeInfoPanel

**Purpose:** Display mode-specific information, statistics, and equations.

**Source:** Copy from `src/components/AnalysisPane/GraphVisualization/ModeInfoPanel.tsx`

**Destination:** `src/components/AnalysisPane/CircuitGraphEngine/ModeInfoPanel.tsx`

**Props:**
```typescript
interface ModeInfoPanelProps {
  mode: VisualizationMode;
  visualizationData: GraphVisualizationData;
  analysisGraph: AnalysisGraph;
  onElementClick?: (elementId: string) => void;
}
```

**No modifications needed** - component works as-is with the new architecture.

## Data Models

### LayoutGraph (Already Exists)

```typescript
interface LayoutGraph {
  width: number;
  height: number;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}
```

### TooltipData (New)

```typescript
interface TooltipData {
  type: 'node' | 'edge';
  position: { x: number; y: number };
  content: {
    title: string;
    details: Array<{ label: string; value: string }>;
  };
}
```

### View Component Props Pattern

All view components follow this pattern:
```typescript
interface ViewComponentProps {
  layoutGraph: LayoutGraph;
  // Mode-specific data (twigs, loops, results, etc.)
  // Event handlers
  onNodeClick?: (nodeId: NodeId) => void;
  onEdgeClick?: (branchId: BranchId) => void;
  onNodeHover?: (nodeId: NodeId, event: React.MouseEvent) => void;
  onEdgeHover?: (branchId: BranchId, event: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}
```

## Error Handling

### Layout Calculation Errors

**Scenario:** GraphLayoutEngine fails to calculate layout

**Handling:**
- CircuitGraphContainer catches error
- Displays error message in place of graph
- Logs error details to console
- Provides retry button

### Export Errors

**Scenario:** PNG export fails

**Handling:**
- Show error toast notification
- Log error to console
- Don't crash the application

### Missing Data Errors

**Scenario:** Required visualization data is missing

**Handling:**
- View components check for null/undefined data
- Display appropriate placeholder message
- Don't attempt to render incomplete data

## Testing Strategy

### Unit Tests

**CircuitGraphContainer:**
- Layout calculation from analysisGraph
- Mode switching logic
- Export PNG functionality
- Tooltip show/hide logic

**BasicGraphView:**
- Renders CircuitGraphRenderer with correct props
- Forwards click events correctly
- Forwards hover events correctly

**GraphTooltip:**
- Renders tooltip content correctly
- Positions tooltip within SVG bounds
- Handles null data gracefully

**GraphControls:**
- All button click handlers fire correctly
- Tooltips display on hover

**Placeholder Views:**
- Render placeholder messages
- Accept required props without errors

### Integration Tests

**Mode Switching:**
- Switching modes renders correct view component
- LayoutGraph is reused across mode switches
- ModeInfoPanel updates correctly

**Zoom/Pan:**
- Zoom in/out buttons work
- Fit view button works
- Mouse wheel zoom works
- Drag to pan works

**Export:**
- Export captures current view
- Export filename includes timestamp
- Export triggers download

**Tooltips:**
- Hover over node shows tooltip
- Hover over edge shows tooltip
- Tooltip disappears on mouse leave
- Tooltip stays within bounds

### Visual Regression Tests

- Compare rendered graphs with baseline images
- Verify zoom/pan transformations
- Verify tooltip positioning
- Verify control button layout

## Performance Considerations

### Layout Calculation

- Calculate LayoutGraph once per analysisGraph change
- Memoize LayoutGraph to prevent recalculation
- Use useMemo for expensive computations

### Rendering Optimization

- Use React.memo for view components
- Use useCallback for event handlers
- Minimize re-renders during zoom/pan

### Export Performance

- Use requestAnimationFrame for smooth export
- Limit export resolution to prevent memory issues
- Show loading indicator during export

## Accessibility

### Keyboard Navigation

- Tab through control buttons
- Enter/Space to activate buttons
- Escape to close tooltips

### Screen Readers

- ARIA labels on all buttons
- ARIA live region for mode changes
- Alt text for exported images

### Color Contrast

- Ensure sufficient contrast for all text
- Don't rely solely on color for information
- Provide text labels in addition to colors

## Migration Strategy

### Phase 1: Create New Components

1. Create CircuitGraphContainer
2. Create BasicGraphView
3. Create placeholder view components
4. Create GraphTooltip
5. Copy GraphControls and adapt
6. Copy ModeInfoPanel

### Phase 2: Integration

1. Update AnalysisPane to use CircuitGraphContainer
2. Remove old GraphVisualization import
3. Test all modes and interactions
4. Verify export functionality

### Phase 3: Cleanup

1. Delete `src/components/AnalysisPane/GraphVisualization` directory
2. Remove Cytoscape dependencies from package.json
3. Update documentation

## Dependencies

### New Dependencies

- `react-zoom-pan-pinch` (^3.6.1) - Zoom and pan functionality

### Existing Dependencies

- `@mui/material` - UI components
- `@mui/icons-material` - Icons
- `react` - Core framework
- Existing CircuitGraphEngine components

### Dependencies to Remove (After Migration)

- `cytoscape` - Old graph library
- `react-cytoscapejs` - React wrapper for Cytoscape

## File Structure

```
src/components/AnalysisPane/CircuitGraphEngine/
├── CircuitGraphRenderer.tsx (existing)
├── GraphLayoutEngine.ts (existing)
├── types.ts (existing)
├── index.tsx (existing - update exports)
├── CircuitGraphContainer.tsx (new)
├── views/
│   ├── BasicGraphView.tsx (new)
│   ├── SpanningTreeView.tsx (new - placeholder)
│   ├── LoopsView.tsx (new - placeholder)
│   ├── CutSetsView.tsx (new - placeholder)
│   └── ResultsView.tsx (new - placeholder)
├── GraphTooltip.tsx (new)
├── GraphControls.tsx (new - copied and adapted)
├── ModeInfoPanel.tsx (new - copied)
└── useGraphControls.ts (new - copied and adapted)
```

## Open Questions

1. Should we add animation when switching between modes?
2. Should we persist zoom/pan state when switching modes?
3. Should we add keyboard shortcuts for zoom/pan/export?
4. Should we add a minimap for large graphs?

## Future Enhancements

1. Implement actual rendering for SpanningTreeView
2. Implement actual rendering for LoopsView
3. Implement actual rendering for CutSetsView
4. Implement actual rendering for ResultsView
5. Add animation transitions between modes
6. Add minimap for navigation
7. Add search/filter functionality
8. Add graph comparison mode
