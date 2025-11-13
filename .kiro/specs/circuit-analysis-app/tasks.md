# Implementation Plan

- [x] 1. Set up project dependencies and core type definitions




  - Install required dependencies: zustand, @xyflow/react, mathjs, react-resizable-panels, react-markdown, remark-math, rehype-katex, katex, cytoscape, react-cytoscapejs
  - Install dev dependencies: @types/katex, @types/cytoscape
  - Create core type definitions in `src/types/circuit.ts` for CircuitNode, CircuitEdge, Circuit, ComponentData
  - Create analysis type definitions in `src/types/analysis.ts` for AnalysisGraph, Branch, ElectricalNode, ValidationResult, CalculationResult, SpanningTree
  - _Requirements: 8.1, 8.2_

- [ ] 2. Implement centralized state management with Zustand
  - Create `src/store/circuitStore.ts` with circuit CRUD operations
  - Implement actions: createCircuit, deleteCircuit, setActiveCircuit, updateCircuitName
  - Implement node/edge actions: addNode, updateNode, deleteNode, addEdge, updateEdge, deleteEdge
  - Implement batch sync actions: syncNodesFromFlow, syncEdgesFromFlow
  - Implement selectors: getActiveCircuit, getCircuitById
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 3. Create three-pane application layout
  - Implement `src/App.tsx` with react-resizable-panels PanelGroup
  - Configure three panels: CircuitManager (20%, 15-30%), CircuitEditor (50%, 30%+), AnalysisPane (30%, 20%+)
  - Add PanelResizeHandle components between panes
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 4. Build Circuit Manager pane
  - Create `src/components/CircuitManager/CircuitManagerPane.tsx`
  - Display list of all circuits with metadata (name, creation date, last modified)
  - Implement "New Circuit" button that calls store.createCircuit()
  - Implement circuit selection that calls store.setActiveCircuit()
  - Implement delete circuit button with confirmation
  - Implement inline circuit name editing
  - Highlight active circuit in the list
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Implement custom circuit component nodes
- [ ] 5.1 Create ResistorNode component
  - Implement `src/components/CircuitEditor/nodes/ResistorNode.tsx`
  - Render SVG resistor symbol with two handles (left and right terminals)
  - Add inline editable resistance value input
  - Update store on value change
  - _Requirements: 2.2, 2.6_

- [ ] 5.2 Create VoltageSourceNode component
  - Implement `src/components/CircuitEditor/nodes/VoltageSourceNode.tsx`
  - Render SVG voltage source symbol with polarity indicators
  - Add two handles (top and bottom terminals)
  - Add direction toggle button for polarity
  - Add inline editable voltage value input
  - _Requirements: 2.3, 2.4, 2.6_

- [ ] 5.3 Create CurrentSourceNode component
  - Implement `src/components/CircuitEditor/nodes/CurrentSourceNode.tsx`
  - Render SVG current source symbol with arrow indicator
  - Add two handles for connections
  - Add direction toggle button
  - Add inline editable current value input
  - _Requirements: 2.5, 2.6_

- [ ] 6. Build Circuit Editor pane with React Flow
  - Create `src/components/CircuitEditor/CircuitEditorPane.tsx`
  - Integrate React Flow as controlled component (nodes/edges from store)
  - Implement onNodesChange handler that syncs to store
  - Implement onEdgesChange handler that syncs to store
  - Register custom node types (ResistorNode, VoltageSourceNode, CurrentSourceNode)
  - Implement custom WireEdge component for connections
  - _Requirements: 1.4, 8.4_

- [ ] 7. Create component palette for drag-and-drop
  - Create `src/components/CircuitEditor/ComponentPalette.tsx`
  - Add draggable palette items for resistor, voltage source, current source
  - Implement drag start handlers that set component type data
  - Implement drop handler on React Flow canvas that creates new nodes
  - Open configuration dialog on drop to set component ID and value
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 8. Implement circuit editing interactions
  - Implement node connection creation (wire between terminals)
  - Implement node deletion with keyboard shortcut
  - Implement edge deletion with keyboard shortcut
  - Implement node movement with position sync to store
  - Add isValidConnection check to prevent invalid connections
  - _Requirements: 1.3, 1.5_

- [ ] 9. Implement graph transformation utilities
  - Create `src/analysis/utils/graphTransformer.ts`
  - Implement createAnalysisGraph() to convert Circuit to AnalysisGraph
  - Identify unique electrical nodes from edge connections
  - Map components to branches with proper direction
  - Assign standard labels (nodes: n0, n1, ...; branches: a, b, c, ...)
  - Select reference (ground) node
  - Implement findAllSpanningTrees() using recursive enumeration
  - Implement selectSpanningTree() to choose specific tree for analysis
  - _Requirements: 4.1, 6.1_

- [ ] 10. Implement circuit validation logic
  - Create `src/analysis/utils/validation.ts`
  - Implement validateGraph() function
  - Check graph connectivity using BFS traversal
  - Validate presence of at least one voltage or current source
  - Detect voltage-source-only loops
  - Detect current-source-only cut-sets
  - Return ValidationResult with detailed error messages
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 11. Create Validation Context layer
  - Create `src/contexts/ValidationContext.tsx`
  - Accept Circuit from Zustand store as input
  - Automatically re-run validation when active circuit changes
  - Call createAnalysisGraph() and validateGraph()
  - Provide ValidationContextState (analysisGraph, validation, isValidating)
  - Handle errors gracefully without crashing
  - _Requirements: 10.1, 10.4, 10.5_

- [ ] 12. Implement nodal analysis (cut-set method)
  - Create `src/analysis/utils/nodalAnalysis.ts`
  - Implement buildIncidenceMatrix() - reduced matrix with reference node row omitted
  - Implement buildBranchAdmittanceMatrix() - diagonal YB matrix
  - Implement solveNodalEquations() using A*YB*A^T formulation
  - Solve for node voltages: EN = solve(A*YB*A^T, A*(IB - YB*EB))
  - Calculate branch voltages: VB = A^T * EN
  - Calculate branch currents: JB = YB*VB + YB*EB - IB
  - Handle singular matrix errors
  - Record each step for presentation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 13. Implement loop analysis (tie-set method)
  - Create `src/analysis/utils/loopAnalysis.ts`
  - Implement buildTieSetMatrix() - one row per fundamental loop
  - Trace fundamental loops through spanning tree for each link
  - Implement buildBranchImpedanceMatrix() - diagonal ZB matrix
  - Implement solveLoopEquations() using B*ZB*B^T formulation
  - Solve for loop currents: IL = solve(B*ZB*B^T, B*EB - B*ZB*IB)
  - Calculate branch currents: JB = B^T * IL
  - Calculate branch voltages: VB = ZB*(JB + IB) - EB
  - Handle singular matrix errors
  - Record each step for presentation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [ ] 14. Create Calculation Context layer
  - Create `src/contexts/CalculationContext.tsx`
  - Accept AnalysisGraph from ValidationContext
  - Trigger calculation only when user clicks "Run Analysis" button (on-demand)
  - Check if graph is solvable before proceeding
  - Call appropriate analysis method (nodal or loop) based on user selection
  - Provide CalculationContextState (result, isCalculating, error)
  - Handle calculation errors and propagate to UI
  - _Requirements: 10.2, 10.4_

- [ ] 15. Implement presentation and report generation
  - Create `src/analysis/utils/reportGenerator.ts`
  - Implement matrixToLatex() to convert mathjs Matrix to LaTeX string
  - Implement generateMarkdownReport() that formats CalculationResult
  - Include sections: method header, selected tree info, incidence/tie-set matrix, impedance/admittance matrix, system equations, final results table
  - Implement generateLoopDescription() for human-readable loop descriptions
  - Implement generateCutSetDescription() for cut-set descriptions
  - Format equations with proper mathematical notation
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 16. Create Presentation Context layer
  - Create `src/contexts/PresentationContext.tsx`
  - Accept CalculationResult from CalculationContext
  - Automatically generate presentation when calculation completes
  - Call generateMarkdownReport() to create formatted output
  - Generate visualization data: loop/cut-set definitions with colors, branch result mappings
  - Provide PresentationContextState (markdownOutput, isGenerating, visualizationData)
  - _Requirements: 10.3_

- [ ] 17. Build Analysis Pane wrapper and main component
  - Create `src/components/AnalysisPane/AnalysisPaneWrapper.tsx`
  - Wrap with three nested contexts: ValidationProvider → CalculationProvider → PresentationProvider
  - Show empty state when no circuit is selected
  - Create `src/components/AnalysisPane/AnalysisPane.tsx` with vertical split layout
  - Top section (40%): AnalysisControls + GraphVisualization
  - Bottom section (60%): ErrorDisplay / LoadingSpinner / ResultsDisplay
  - _Requirements: 10.1, 10.2, 10.3, 10.6_

- [ ] 18. Implement analysis controls toolbar
  - Create `src/components/AnalysisPane/AnalysisControls.tsx`
  - Add "Run Analysis" button that triggers calculation
  - Add method selector dropdown (Nodal / Loop / Both)
  - Add spanning tree selector dropdown
  - Add visualization mode tabs (Graph / Tree / Loops / Cut-Sets / Results)
  - Wire up controls to CalculationContext and PresentationContext
  - _Requirements: 5.1, 6.1_

- [ ] 19. Implement Cytoscape graph visualization
  - Create `src/components/AnalysisPane/GraphVisualization.tsx`
  - Integrate Cytoscape.js with react-cytoscapejs
  - Implement convertToCytoscapeElements() to transform AnalysisGraph
  - Label nodes as n0, n1, n2, ... (matching lecture notation)
  - Label branches as a, b, c, ... with component info
  - Configure Cytoscape stylesheet matching lecture visual conventions
  - Implement breadthfirst layout from reference node
  - Style reference node with ground symbol
  - Add directed edges with arrows showing current direction
  - _Requirements: 7.1_

- [ ] 20. Implement graph visualization modes
- [ ] 20.1 Implement spanning tree visualization mode
  - Highlight twigs (tree branches) in bold solid lines (green)
  - Show links (co-tree branches) in dashed lines (red)
  - Display tree statistics (twigs count, links count)
  - Allow switching between different spanning trees
  - _Requirements: 6.2, 6.3_

- [ ] 20.2 Implement loop overlay visualization mode
  - Highlight each fundamental loop in different color
  - Show loop direction with curved arrows
  - Display loop equation below graph
  - Allow selecting individual loops to highlight
  - Show number of loops = B-N+1
  - _Requirements: 6.4, 6.5_

- [ ] 20.3 Implement cut-set overlay visualization mode
  - Highlight each fundamental cut-set in different color
  - Show cut boundary as dashed line
  - Display cut-set equation below graph
  - Allow selecting individual cut-sets to highlight
  - Show number of cut-sets = N-1
  - _Requirements: 5.1, 5.2_

- [ ] 20.4 Implement results visualization mode
  - Overlay branch currents and voltages as labels on graph
  - Color-code branches based on current magnitude
  - Show node voltages on hover
  - _Requirements: 7.5_

- [ ] 21. Implement interactive graph features
  - Add hover tooltips showing component details and values
  - Implement zoom and pan controls
  - Add click handlers to highlight loops/cut-sets from list
  - Synchronize highlighting between graph and equations in bottom pane
  - Add export graph as PNG functionality
  - _Requirements: 7.1_

- [ ] 22. Create results display component
  - Create `src/components/AnalysisPane/ResultsDisplay.tsx`
  - Integrate react-markdown with remark-math and rehype-katex plugins
  - Render markdownOutput from PresentationContext
  - Configure KaTeX for proper LaTeX rendering
  - Style markdown sections for readability
  - Add copy equations to clipboard functionality
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 23. Implement error and loading states
  - Create `src/components/AnalysisPane/ErrorDisplay.tsx`
  - Show validation errors in red banner with detailed messages
  - Show calculation errors in modal with technical details
  - Show warnings in yellow banner
  - Create `src/components/AnalysisPane/LoadingSpinner.tsx` for calculation in progress
  - _Requirements: 4.2, 4.6, 5.7, 6.9, 10.4_

- [ ] 24. Write unit tests for core utilities
  - Test circuitStore actions and selectors
  - Test graphTransformer functions with known circuits
  - Test validation logic with various invalid circuits
  - Test matrix construction (incidence, tie-set, impedance, admittance)
  - Test nodal and loop analysis with circuits having known solutions
  - Test reportGenerator LaTeX formatting
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 25. Create reference test circuits
  - Create test data library with known solutions
  - Simple voltage divider (2 resistors, 1 voltage source)
  - Current divider (2 resistors, 1 current source)
  - Wheatstone bridge circuit
  - Multi-loop circuit (3+ loops)
  - Multi-node circuit (4+ nodes)
  - Include expected AnalysisGraph, matrices, and solutions for each
  - _Requirements: 5.7, 6.9_

- [ ] 26. Add performance optimizations
  - Add useMemo for expensive graph transformations
  - Add useMemo for matrix calculations
  - Add useMemo for LaTeX string generation
  - Debounce inline value edits (300ms)
  - Debounce node position updates during drag
  - Implement context selectors to prevent unnecessary re-renders
  - _Requirements: 8.3, 9.5_

- [ ] 27. Polish UI and styling
  - Style CircuitManagerPane with proper layout and spacing
  - Style ComponentPalette with visual component icons
  - Style AnalysisControls toolbar
  - Add responsive design for different screen sizes
  - Ensure proper contrast and accessibility
  - Add loading states and transitions
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 28. Final integration and testing
  - Test complete workflow: create circuit → design → validate → analyze → view results
  - Test multi-circuit management (create, switch, delete)
  - Test all three visualization modes in Cytoscape
  - Test error cases (disconnected circuit, no sources, singular matrix)
  - Verify LaTeX rendering in results
  - Test pane resizing and layout
  - Run linting and type checking
  - _Requirements: All requirements_
