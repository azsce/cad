# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Install react-zoom-pan-pinch package
  - Create views directory under CircuitGraphEngine
  - Update CircuitGraphEngine index.tsx exports
  - _Requirements: 1.1, 2.1, 6.1_

- [x] 2. Create placeholder view components
  - [x] 2.1 Create BasicGraphView component
    - Accept layoutGraph prop
    - Render CircuitGraphRenderer with layoutGraph
    - Forward onNodeClick and onEdgeClick handlers
    - Forward onNodeHover, onEdgeHover, and onMouseLeave handlers
    - _Requirements: 2.1, 7.1, 7.2_
  
  - [x] 2.2 Create SpanningTreeView placeholder
    - Accept layoutGraph and twigBranchIds props
    - Render centered placeholder message "Spanning Tree View - To be implemented"
    - Display layoutGraph dimensions for reference
    - _Requirements: 2.2, 2.6_
  
  - [x] 2.3 Create LoopsView placeholder
    - Accept layoutGraph and loopDefinitions props
    - Render centered placeholder message "Loops View - To be implemented"
    - Display loop count for reference
    - _Requirements: 2.3, 2.6_
  
  - [x] 2.4 Create CutSetsView placeholder
    - Accept layoutGraph and cutSetDefinitions props
    - Render centered placeholder message "Cut-Sets View - To be implemented"
    - Display cut-set count for reference
    - _Requirements: 2.4, 2.6_
  
  - [x] 2.5 Create ResultsView placeholder
    - Accept layoutGraph and branchResults props
    - Render centered placeholder message "Results View - To be implemented"
    - Display result count for reference
    - _Requirements: 2.5, 2.6_

- [x] 3. Create GraphTooltip component
  - [x] 3.1 Define TooltipData interface
    - Create type with type, position, and content fields
    - Export from types.ts
    - _Requirements: 3.1, 3.2_
  
  - [x] 3.2 Implement GraphTooltip SVG rendering
    - Accept data, svgWidth, and svgHeight props
    - Render SVG group with rect background and text elements
    - Position tooltip near hovered element
    - Adjust position to stay within SVG bounds
    - _Requirements: 3.3, 3.5_
  
  - [x] 3.3 Add tooltip styling and animations
    - Apply white background with opacity
    - Add border and shadow
    - Implement fade in/out animation
    - _Requirements: 3.3, 3.4_

- [x] 4. Copy and adapt GraphControls component
  - [x] 4.1 Copy GraphControls.tsx from old directory
    - Copy to CircuitGraphEngine directory
    - Update imports to use new paths
    - _Requirements: 1.4, 1.5, 1.6_
  
  - [x] 4.2 Copy and adapt useGraphControls hook
    - Copy useGraphControls.ts from old directory
    - Adapt for react-zoom-pan-pinch API instead of Cytoscape
    - Implement zoom in/out using transformRef
    - Implement fit view using transformRef
    - _Requirements: 1.4, 1.5, 1.6_
  
  - [x] 4.3 Implement PNG export functionality
    - Capture SVG element as data URL
    - Convert to PNG using canvas
    - Trigger browser download with timestamp filename
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Copy ModeInfoPanel component
  - Copy ModeInfoPanel.tsx from old directory to CircuitGraphEngine
  - Update imports to use new paths
  - Verify component works with new architecture
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 6. Create CircuitGraphContainer component
  - [x] 6.1 Set up component structure and state
    - Define CircuitGraphContainerProps interface
    - Initialize state for layoutGraph and tooltipData
    - Create transformRef for zoom/pan controls
    - _Requirements: 1.1, 2.7_
  
  - [x] 6.2 Implement layout calculation
    - Use useMemo to calculate layoutGraph from analysisGraph
    - Handle GraphLayoutEngine errors gracefully
    - Display error message if layout calculation fails
    - _Requirements: 1.1, 2.7_
  
  - [x] 6.3 Implement mode switching logic
    - Create renderView function that switches on visualizationData.mode
    - Render BasicGraphView for graph mode
    - Render SpanningTreeView for tree mode
    - Render LoopsView for loops mode
    - Render CutSetsView for cutsets mode
    - Render ResultsView for results mode
    - Pass layoutGraph and mode-specific data to each view
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_
  
  - [x] 6.4 Implement tooltip handlers
    - Create handleNodeHover to show node tooltip
    - Create handleEdgeHover to show edge tooltip
    - Create handleMouseLeave to hide tooltip
    - Extract tooltip content from analysisGraph
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 6.5 Implement click handlers
    - Create handleNodeClick to forward to onElementClick prop
    - Create handleEdgeClick to forward to onElementClick prop
    - Handle empty space clicks to clear highlights
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [x] 6.6 Integrate react-zoom-pan-pinch
    - Wrap view component with TransformWrapper and TransformComponent
    - Configure zoom limits and pan boundaries
    - Pass transformRef to useGraphControls hook
    - _Requirements: 1.2, 1.3_
  
  - [x] 6.7 Compose final layout
    - Render TransformWrapper with selected view component
    - Render GraphTooltip as overlay inside TransformComponent
    - Render GraphControls positioned absolutely
    - Render ModeInfoPanel below graph
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 5.1_

- [x] 7. Update CircuitGraphEngine exports
  - Export CircuitGraphContainer from index.tsx
  - Export all view components from index.tsx
  - Export GraphTooltip from index.tsx
  - Export GraphControls from index.tsx
  - Export ModeInfoPanel from index.tsx
  - Export TooltipData type from types.ts
  - _Requirements: 6.1, 6.2_

- [x] 8. Integrate into AnalysisPane
  - [x] 8.1 Update AnalysisPane imports
    - Import CircuitGraphContainer from CircuitGraphEngine
    - Remove old GraphVisualization import
    - _Requirements: 6.1, 6.2_
  
  - [x] 8.2 Replace GraphVisualization with CircuitGraphContainer
    - Update GraphVisualization function to use CircuitGraphContainer
    - Pass analysisGraph, visualizationData, and handleElementClick props
    - Remove old Cytoscape-based GraphVisualizationComponent usage
    - _Requirements: 6.1, 6.4_
  
  - [x] 8.3 Test all visualization modes
    - Verify graph mode renders correctly
    - Verify tree mode shows placeholder
    - Verify loops mode shows placeholder
    - Verify cutsets mode shows placeholder
    - Verify results mode shows placeholder
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.5_
  
  - [x] 8.4 Test interactive features
    - Verify zoom in/out buttons work
    - Verify fit view button works
    - Verify mouse wheel zoom works
    - Verify drag to pan works
    - Verify export PNG works
    - Verify tooltips appear on hover
    - Verify click handlers work
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 4.1, 7.1, 7.2_

- [x] 9. Clean up old code
  - Delete src/components/AnalysisPane/GraphVisualization directory
  - Remove cytoscape from package.json dependencies
  - Remove react-cytoscapejs from package.json dependencies
  - Run type checking to ensure no broken imports
  - _Requirements: 6.3_

- [x] 10. Final verification and documentation
  - Run all tests to ensure nothing broke
  - Verify all visualization modes work
  - Verify all interactive features work
  - Update component documentation
  - _Requirements: 6.4, 6.5_
