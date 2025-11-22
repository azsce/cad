# Implementation Plan

## Project Status Overview

**Current Phase:** Phase 2 - Analysis Pipeline (Tasks 10-23)  
**Completed:** Tasks 1-9 (Foundation & UI)  
**Next Up:** Task 10 - Circuit Validation Logic

### What's Been Accomplished

Phase 1 delivered a fully functional circuit editor with:

- Complete UI with resizable three-pane layout
- Circuit manager with multi-circuit support and theme toggle
- Visual circuit editor using React Flow with drag-and-drop components
- Custom component nodes (Resistor, Voltage Source, Current Source) with MUI styling
- Component palette and configuration dialogs
- Helper lines for alignment during component placement
- Graph transformation utilities (Circuit → AnalysisGraph)
- Spanning tree enumeration and selection
- Centralized state management with Zustand (localStorage persistence)
- Comprehensive refactoring following code quality standards

### What's Next

Phase 2 focuses on the analysis pipeline:

1. **Validation layer** - Circuit connectivity and solvability checks
2. **Calculation layer** - Nodal and loop analysis with matrix methods
3. **Presentation layer** - LaTeX formatting and Markdown report generation
4. **Visualization** - Cytoscape graph with spanning trees, loops, and cut-sets
5. **UI integration** - Analysis controls, results display, error handling

### Key Architectural Decisions

- **Validation runs automatically** when circuit changes (lightweight, immediate feedback)
- **Calculation runs on-demand** when user clicks "Run Analysis" (expensive matrix operations)
- **Presentation runs automatically** when calculation completes (lightweight formatting)
- **Modular structure** with helper functions to keep cyclomatic complexity < 10
- **Branded types** for IDs to prevent mixing (CircuitId, NodeId, EdgeId)
- **Context-based pipeline** for clean separation of concerns

---

## Phase 1: Foundation & UI (Tasks 1-9) ✅ COMPLETED

- [x] 1. Set up project dependencies and core type definitions
  - ✅ All dependencies installed (zustand, @xyflow/react, mathjs, react-resizable-panels, react-markdown, remark-math, rehype-katex, katex, cytoscape, react-cytoscapejs)
  - ✅ Core type definitions created in `src/types/`
  - ✅ Analysis type definitions created
  - _Requirements: 8.1, 8.2_

- [x] 2. Implement centralized state management with Zustand
  - ✅ Complete store implementation with all CRUD operations
  - ✅ Branded types for IDs (CircuitId, NodeId, EdgeId)
  - ✅ Helper functions to reduce code duplication
  - ✅ LocalStorage persistence with zustand middleware
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 3. Create three-pane application layout
  - ✅ Fully functional resizable layout with react-resizable-panels
  - ✅ All three panes implemented and working
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4. Build Circuit Manager pane
  - ✅ Complete implementation with MUI components
  - ✅ Circuit list with metadata display
  - ✅ Theme toggle (light/dark mode)
  - ✅ All CRUD operations working
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 11.1-11.5_

- [x] 5. Implement custom circuit component nodes
  - ✅ All three node types fully implemented (Resistor, VoltageSource, CurrentSource)
  - ✅ SVG symbols with proper handles
  - ✅ MUI TextField for inline value editing
  - ✅ MUI IconButton for direction toggles
  - ✅ MUI Tooltip for component information
  - ✅ Complete MUI migration across all components
  - ✅ Theme system with light/dark mode
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 11.1-11.5_

- [x] 6. Build Circuit Editor pane with React Flow
  - ✅ Complete React Flow integration with CircuitFlowContext
  - ✅ Modular hook-based architecture (extracted from large component)
  - ✅ Custom nodes and edges registered
  - ✅ Proper store synchronization
  - _Requirements: 1.4, 8.4_

- [x] 7. Create component palette for drag-and-drop
  - ✅ Fully functional palette with all component types
  - ✅ ComponentConfigDialog for setting values
  - ✅ Drag-and-drop working smoothly
  - _Requirements: 1.1, 1.2, 2.1_

- [x] 8. Implement circuit editing interactions
  - ✅ All editing interactions working
  - ✅ Connection validation implemented
  - ✅ Keyboard shortcuts (Delete key)
  - ✅ Helper lines for alignment during drag
  - ✅ Auto-fit view functionality
  - _Requirements: 1.3, 1.5_

- [x] 9. Implement graph transformation utilities
  - ✅ Complete graphTransformer.ts implementation
  - ✅ createAnalysisGraph() with proper node/branch identification
  - ✅ findAllSpanningTrees() with recursive enumeration
  - ✅ selectSpanningTree() for tree selection
  - ✅ Standard labeling (n0, n1, ...; a, b, c, ...)
  - ✅ BFS-based default tree creation
  - ✅ Comprehensive helper functions with low cyclomatic complexity
  - _Requirements: 4.1, 6.1_

---

## Phase 2: Analysis Pipeline (Tasks 10-23) 🚧 IN PROGRESS

- [x] 10. Implement circuit validation logic
  - Create `src/analysis/utils/validation.ts`
  - Implement `validateGraph(graph: AnalysisGraph): ValidationResult`
  - **Validation checks:**
    - Graph connectivity using BFS traversal
    - Presence of at least one voltage or current source
    - Detect voltage-source-only loops (KVL contradiction)
    - Detect current-source-only cut-sets (KCL contradiction)
  - Return detailed ValidationResult with errors/warnings arrays
  - **Implementation notes:**
    - Use helper functions to keep cyclomatic complexity < 10
    - Extract loop detection into separate function
    - Extract cut-set detection into separate function
    - Use BFS from reference node for connectivity check
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 11. Create Validation Context layer
  - Create `src/contexts/ValidationContext/`
  - **Files:**
    - `ValidationContext.tsx` - Main context provider
    - `index.ts` - Public exports
    - `useValidation.ts` - Hook for consuming context
  - **Functionality:**
    - Accept Circuit from Zustand store as input
    - Automatically re-run validation when active circuit changes (useEffect)
    - Call createAnalysisGraph() and validateGraph()
    - Provide ValidationContextState: `{ analysisGraph, validation, isValidating }`
  - **Error handling:**
    - Wrap in try-catch to prevent crashes
    - Set error state on failure
    - Log errors with logger utility
  - _Requirements: 10.1, 10.4, 10.5_

- [x] 12. Implement nodal analysis (cut-set method)
  - Create `src/analysis/utils/nodalAnalysis/`
  - **Files:**
    - `index.ts` - Main exports
    - `buildIncidenceMatrix.ts` - Reduced incidence matrix (A)
    - `buildBranchAdmittanceMatrix.ts` - Diagonal YB matrix
    - `buildSourceVectors.ts` - EB and IB vectors
    - `solveNodalEquations.ts` - Main solver
  - **Matrix construction (following lecture formulations):**
    - Reduced incidence matrix A: (N-1) × B, reference node row omitted
    - A[i][j] = +1 if branch j leaves node i
    - A[i][j] = -1 if branch j enters node i
    - A[i][j] = 0 otherwise
    - Branch admittance matrix YB: diagonal, YB[i][i] = 1/R for resistors
  - **Solution process:**
    1. Build Y*node = A * YB \_ A^T (node admittance matrix)
    2. Build I*node = A * (IB - YB \_ EB) (node current vector)
    3. Solve EN = lusolve(Y_node, I_node) using mathjs
    4. Calculate VB = A^T \* EN (branch voltages)
    5. Calculate JB = YB _ VB + YB _ EB - IB (branch currents)
  - **Error handling:**
    - Catch singular matrix errors from lusolve
    - Return error in CalculationResult
  - **Step recording:**
    - Create AnalysisStep objects for each matrix/equation
    - Include title, description, matrix, equation string
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 13. Implement loop analysis (tie-set method)
  - Create `src/analysis/utils/loopAnalysis/`
  - **Files:**
    - `index.ts` - Main exports
    - `buildTieSetMatrix.ts` - Fundamental loop matrix (B)
    - `buildBranchImpedanceMatrix.ts` - Diagonal ZB matrix
    - `buildSourceVectors.ts` - EB and IB vectors
    - `solveLoopEquations.ts` - Main solver
    - `traceFundamentalLoop.ts` - Helper to trace loop through tree
  - **Matrix construction (following lecture formulations):**
    - Tie-set matrix B: L × B, where L = B - N + 1 (number of links)
    - For each link (defines one fundamental loop):
      - B[i][j] = +1 for the link that defines loop i
      - B[i][j] = +1 if tree branch j is in loop i with same direction as link
      - B[i][j] = -1 if tree branch j is in loop i with opposite direction
      - B[i][j] = 0 if branch j is not part of loop i
    - Branch impedance matrix ZB: diagonal, ZB[i][i] = R for resistors
  - **Loop tracing algorithm:**
    - For each link, find the unique path through the spanning tree
    - Path connects the two nodes of the link
    - Use BFS/DFS to find path in tree
    - Determine branch directions relative to link direction
  - **Solution process:**
    1. Build Z*loop = B * ZB \_ B^T (loop impedance matrix)
    2. Build E*loop = B * EB - B \_ ZB \* IB (loop voltage vector)
    3. Solve IL = lusolve(Z_loop, E_loop) using mathjs
    4. Calculate JB = B^T \* IL (branch currents)
    5. Calculate VB = ZB \* (JB + IB) - EB (branch voltages)
  - **Error handling:**
    - Catch singular matrix errors
    - Handle disconnected tree (should not happen if validation passed)
  - **Step recording:**
    - Create AnalysisStep objects for each matrix/equation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [x] 14. Create Calculation Context layer
  - Create `src/contexts/CalculationContext/`
  - **Files:**
    - `CalculationContext.tsx` - Main context provider
    - `index.ts` - Public exports
    - `useCalculation.ts` - Hook for consuming context
  - **Functionality:**
    - Accept AnalysisGraph from ValidationContext
    - Provide `runAnalysis(method: 'nodal' | 'loop' | 'both')` function
    - Trigger calculation only when runAnalysis is called (on-demand, not automatic)
    - Check validation.isSolvable before proceeding
    - Call appropriate analysis method based on parameter
    - Provide CalculationContextState: `{ result, isCalculating, error, runAnalysis }`
  - **Implementation:**
    - Use useState for result, isCalculating, error
    - Use useCallback for runAnalysis function
    - Wrap analysis calls in try-catch
    - Set isCalculating to true during calculation
    - Log calculation start/end with logger
  - **Error handling:**
    - Catch and store errors in state
    - Display user-friendly error messages
    - Include technical details for debugging
  - _Requirements: 10.2, 10.4_

- [x] 15. Implement presentation and report generation
  - Create `src/analysis/utils/reportGenerator/`
  - **Files:**
    - `index.ts` - Main exports
    - `matrixToLatex.ts` - Matrix to LaTeX conversion
    - `generateMarkdownReport.ts` - Main report generator
    - `generateLoopDescription.ts` - Loop descriptions
    - `generateCutSetDescription.ts` - Cut-set descriptions
    - `formatEquation.ts` - Equation formatting helpers
  - **LaTeX formatting:**
    - Convert mathjs Matrix to LaTeX pmatrix format
    - Format: `\begin{pmatrix} ... \end{pmatrix}`
    - Round values to 3 decimal places
    - Handle vectors (column matrices) properly
  - **Markdown report structure:**
    1. Header: Circuit name, analysis method, timestamp
    2. Selected spanning tree info (twigs, links)
    3. Topology matrix (A or B) with LaTeX
    4. Branch impedance/admittance matrix (ZB or YB)
    5. Source vectors (EB, IB)
    6. System matrix and vector
    7. Solution vector (EN or IL)
    8. Final results: branch voltages and currents table
    9. Summary section
  - **Loop/Cut-set descriptions:**
    - Generate human-readable text: "Loop 1: a → b → c (link: a)"
    - Include branch directions
    - Color indicators for visualization
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 16. Create Presentation Context layer
  - Create `src/contexts/PresentationContext/`
  - **Files:**
    - `PresentationContext.tsx` - Main context provider
    - `index.ts` - Public exports
    - `usePresentation.ts` - Hook for consuming context
    - `generateVisualizationData.ts` - Helper for graph visualization data
  - **Functionality:**
    - Accept CalculationResult from CalculationContext
    - Automatically generate presentation when result changes (useEffect)
    - Call generateMarkdownReport() to create formatted output
    - Generate visualization data for Cytoscape
  - **Visualization data generation:**
    - Extract loop/cut-set definitions from matrices
    - Assign colors to each loop/cut-set (use predefined palette)
    - Create branch result mappings: `Map<branchId, { current, voltage }>`
    - Prepare highlighting data for interactive graph
  - **Context state:**
    ```typescript
    interface PresentationContextState {
      markdownOutput: string;
      isGenerating: boolean;
      visualizationData: GraphVisualizationData;
    }
    ```
  - _Requirements: 10.3_

- [x] 17. Build Analysis Pane wrapper and main component
  - Create `src/components/AnalysisPane/AnalysisPaneWrapper.tsx`
  - Wrap with three nested contexts: ValidationProvider → CalculationProvider → PresentationProvider
  - Show empty state when no circuit is selected
  - Create `src/components/AnalysisPane/AnalysisPane.tsx`
  - **Layout structure:**
    - Vertical split using react-resizable-panels
    - Top section (40%): AnalysisControls + GraphVisualization
    - Bottom section (60%): ErrorDisplay / LoadingSpinner / ResultsDisplay
  - **Conditional rendering:**
    - Show ErrorDisplay if validation.isValid === false
    - Show LoadingSpinner if isCalculating === true
    - Show ResultsDisplay if result exists
  - **Context integration:**
    - Consume ValidationContext for errors
    - Consume CalculationContext for loading state and results
    - Consume PresentationContext for formatted output
  - _Requirements: 10.1, 10.2, 10.3, 10.6_

- [x] 18. Implement analysis controls toolbar
  - Create `src/components/AnalysisPane/AnalysisControls.tsx`
  - **MUI Components:**
    - Box for layout container
    - Button for "Run Analysis" (primary variant)
    - Select/MenuItem for method selector
    - Select/MenuItem for spanning tree selector
    - Tabs/Tab for visualization modes
    - Tooltip for helpful hints
  - **Controls:**
    - "Run Analysis" button → calls runAnalysis(selectedMethod)
    - Method selector: Nodal / Loop / Both
    - Tree selector: dropdown of all available trees
    - Visualization tabs: Graph / Tree / Loops / Cut-Sets / Results
  - **State management:**
    - Local state for selected method, tree, visualization mode
    - Call CalculationContext.runAnalysis() on button click
    - Update PresentationContext visualization mode on tab change
  - **Disabled states:**
    - Disable "Run Analysis" if validation failed
    - Disable during calculation (isCalculating)
    - Show loading indicator on button during calculation
  - _Requirements: 5.1, 6.1_

- [x] 19. Implement Cytoscape graph visualization
  - Create `src/components/AnalysisPane/GraphVisualization/`
  - **Files:**
    - `index.tsx` - Main component
    - `convertToCytoscapeElements.ts` - Data transformation
    - `cytoscapeStylesheet.ts` - Visual styling
    - `cytoscapeLayout.ts` - Layout configuration
  - **Data transformation:**
    - Convert AnalysisGraph to Cytoscape elements
    - Nodes: labeled as n0, n1, n2, ... (matching lecture notation)
    - Edges: labeled as a, b, c, ... with component info (e.g., "a\n10Ω")
    - Apply classes based on visualization mode (twig, link, loop-0, cutset-1, etc.)
  - **Cytoscape configuration:**
    - Use breadthfirst layout from reference node
    - Directed edges with arrows showing current direction
    - Reference node styled with ground symbol (triangle shape)
    - Color scheme matching lecture conventions
  - **Styling (refer to docs/lecturesImages/ for exact style):**
    - Nodes: circles with labels, reference node as triangle
    - Edges: directed with arrows, different colors for twigs/links
    - Tree branches (twigs): solid green lines
    - Links (co-tree): dashed red lines
    - Loop highlighting: different color per loop
    - Cut-set highlighting: different color per cut-set
  - **Interactive features:**
    - Zoom and pan enabled
    - Hover tooltips showing component details
    - Click handlers for selecting loops/cut-sets
  - _Requirements: 7.1_

- [x] 20. Implement graph visualization modes
  - **Mode 1: Circuit Graph (Default)**
    - Show all nodes and branches as directed graph
    - Nodes as circles with labels (n0, n1, ...)
    - Branches as directed edges with arrows
    - Reference node highlighted with ground symbol
  - **Mode 2: Spanning Tree**
    - Twigs (tree branches): bold solid green lines
    - Links (co-tree): dashed red lines
    - Display statistics: "Twigs: N-1, Links: B-N+1"
    - Tree selector allows switching between trees
  - **Mode 3: Loop Overlay**
    - Each fundamental loop in different color
    - Loop direction indicated with curved arrows
    - Loop selector to highlight individual loops
    - Display loop equation: "Loop 1: a + b - c = 0"
    - Show "Number of loops: L = B-N+1"
  - **Mode 4: Cut-Set Overlay**
    - Each fundamental cut-set in different color
    - Cut boundary shown as dashed line
    - Cut-set selector to highlight individual cut-sets
    - Display cut-set equation: "Cut-set 1: a - b + c = 0"
    - Show "Number of cut-sets: N-1"
  - **Mode 5: Results**
    - Overlay branch currents and voltages as labels
    - Color-code branches by current magnitude (gradient)
    - Show node voltages on hover
    - Legend for color scale
  - **Implementation:**
    - Use Cytoscape classes to apply different styles
    - Update classes based on selected mode
    - Synchronized highlighting between graph and equations list
  - _Requirements: 5.1, 5.2, 6.2, 6.3, 6.4, 6.5, 7.5_

-

- [x] 21. Implement interactive graph features
  - **Hover tooltips:**
    - Show component type, value, and ID on branch hover
    - Show node voltage on node hover (if results available)
    - Use Cytoscape's built-in tooltip or custom overlay
  - **Zoom and pan:**
    - Enable Cytoscape zoom (mouse wheel)
    - Enable pan (click and drag)
    - Add "Fit to View" button to reset zoom
  - **Click handlers:**
    - Click on loop in equation list → highlight in graph
    - Click on cut-set in equation list → highlight in graph
    - Click on branch in graph → show details in sidebar
  - **Synchronized highlighting:**
    - Maintain selected loop/cut-set state
    - Apply highlight classes to Cytoscape elements
    - Scroll equation list to selected item
  - **Export functionality:**
    - Add "Export as PNG" button
    - Use Cytoscape's png() method
    - Download file with circuit name
  - _Requirements: 7.1_

-

- [x] 22. Create results display component
  - Create `src/components/AnalysisPane/ResultsDisplay.tsx`
  - **react-markdown configuration:**
    - Install plugins: remark-math, rehype-katex
    - Configure ReactMarkdown component with plugins
    - Import KaTeX CSS for proper rendering
  - **KaTeX configuration:**
    - Enable display mode for block equations
    - Enable inline mode for inline math
    - Configure macros if needed
  - **Markdown styling:**
    - Use MUI Typography for headers
    - Style tables with MUI Table components
    - Add proper spacing between sections
    - Syntax highlighting for code blocks (if any)
  - **Interactive features:**
    - "Copy Equation" button for each equation
    - "Copy All" button for entire report
    - "Print" button for print-friendly view
    - Clickable loop/cut-set references that highlight in graph
  - **Layout:**
    - Scrollable container
    - Sticky header with action buttons
    - Collapsible sections for long reports
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 23. Implement error and loading states

- [ ] 23. Implement error and loading states
  - **ErrorDisplay component** (`src/components/AnalysisPane/ErrorDisplay.tsx`):
    - Use MUI Alert component
    - Validation errors: severity="error", red banner
    - Warnings: severity="warning", yellow banner
    - Display error list with bullet points
    - Include helpful suggestions for fixing errors
    - "Dismiss" button for warnings
  - **CalculationErrorDialog component**:
    - Use MUI Dialog for calculation errors
    - Show error message and technical details
    - Include stack trace in collapsible section
    - "Copy Error" button for bug reports
    - "Close" button to dismiss
  - **LoadingSpinner component** (`src/components/AnalysisPane/LoadingSpinner.tsx`):
    - Use MUI CircularProgress
    - Center in container
    - Show "Analyzing circuit..." message
    - Optional: progress percentage if available
  - **Empty state component**:
    - Show when no circuit is selected
    - Use MUI Box with centered content
    - Friendly message: "Select or create a circuit to begin"
    - Icon illustration
  - _Requirements: 4.2, 4.6, 5.7, 6.9, 10.4_

---

## Phase 3: Testing & Polish (Tasks 24-28)

- [ ] 24. Write unit tests for core utilities
  - **Test framework setup:**
    - Install vitest, @testing-library/react
    - Configure vitest.config.ts
    - Add test script to package.json
  - **Store tests** (`src/store/__tests__/circuitStore.test.ts`):
    - Test circuit CRUD operations
    - Test node/edge manipulation
    - Test active circuit selection
    - Test state immutability
  - **Graph transformer tests** (`src/analysis/utils/__tests__/graphTransformer.test.ts`):
    - Test with simple 2-node circuit
    - Test with multi-node circuit
    - Test spanning tree enumeration
    - Test tree selection
  - **Validation tests** (`src/analysis/utils/__tests__/validation.test.ts`):
    - Test disconnected circuit detection
    - Test missing source detection
    - Test voltage-source-only loop detection
    - Test current-source-only cut-set detection
  - **Matrix construction tests**:
    - Test incidence matrix with known circuit
    - Test tie-set matrix with known circuit
    - Test impedance/admittance matrices
  - **Analysis tests**:
    - Test nodal analysis with voltage divider
    - Test loop analysis with current divider
    - Test with circuits having known solutions
  - **Report generator tests**:
    - Test matrixToLatex() formatting
    - Test markdown generation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 25. Create reference test circuits
  - Create `src/analysis/__tests__/fixtures/`
  - **Test circuits with known solutions:**
    1. **Simple voltage divider:**
       - 2 resistors (R1=10Ω, R2=20Ω), 1 voltage source (V=30V)
       - Expected: V_R1=10V, V_R2=20V, I=1A
    2. **Current divider:**
       - 2 resistors (R1=10Ω, R2=20Ω), 1 current source (I=3A)
       - Expected: I_R1=2A, I_R2=1A
    3. **Wheatstone bridge:**
       - 4 resistors + 1 voltage source
       - Test balanced and unbalanced cases
    4. **Multi-loop circuit:**
       - 3+ loops with multiple sources
       - Verify loop analysis
    5. **Multi-node circuit:**
       - 4+ nodes with multiple sources
       - Verify nodal analysis
  - **Fixture format:**
    ```typescript
    interface TestCircuit {
      name: string;
      circuit: Circuit;
      expectedGraph: AnalysisGraph;
      expectedMatrices: {
        A?: Matrix;
        B?: Matrix;
        YB?: Matrix;
        ZB?: Matrix;
      };
      expectedSolution: {
        nodeVoltages?: number[];
        branchCurrents: number[];
        branchVoltages: number[];
      };
    }
    ```
  - _Requirements: 5.7, 6.9_

- [ ] 26. Add performance optimizations
  - **Memoization (already following steering rules):**
    - useMemo for graph transformations
    - useMemo for matrix calculations
    - useMemo for LaTeX string generation
    - useMemo for Cytoscape elements conversion
    - useCallback for all event handlers
  - **Debouncing:**
    - Debounce inline value edits (300ms) before updating store
    - Batch node position updates during drag
    - Only sync to store on drag end
  - **Context optimization:**
    - Use selective subscriptions in contexts
    - Prevent unnecessary re-renders with React.memo
    - Split large contexts if needed
  - **React Flow optimization:**
    - Use nodesDraggable but batch updates
    - Implement isValidConnection efficiently
    - Minimize edge re-renders
  - **Cytoscape optimization:**
    - Batch style updates
    - Use Cytoscape's batch() method for multiple changes
    - Debounce layout recalculation
  - _Requirements: 8.3, 9.5_

- [ ] 27. Polish UI and styling
  - **MUI theming:**
    - Refine light and dark theme colors
    - Ensure consistent spacing using theme.spacing()
    - Use theme.palette for all colors
  - **Component styling:**
    - CircuitManagerPane: proper padding, hover states
    - ComponentPalette: visual component icons, drag indicators
    - AnalysisControls: toolbar styling, button groups
    - ResultsDisplay: readable typography, proper table styling
  - **Responsive design:**
    - Test on different screen sizes
    - Adjust panel min/max sizes for mobile
    - Ensure touch-friendly controls
  - **Accessibility:**
    - Proper ARIA labels
    - Keyboard navigation support
    - Sufficient color contrast (WCAG AA)
    - Focus indicators
  - **Transitions and animations:**
    - Smooth panel resizing
    - Loading state transitions
    - Graph zoom/pan animations
    - Tab switching animations
  - **Visual polish:**
    - Consistent icon usage
    - Proper spacing and alignment
    - Visual hierarchy
    - Empty states with illustrations
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 28. Final integration and testing
  - **End-to-end workflow testing:**
    1. Create new circuit
    2. Add components from palette
    3. Connect components with wires
    4. Edit component values
    5. Run analysis (nodal and loop)
    6. View results in all visualization modes
    7. Export graph as PNG
    8. Switch to another circuit
    9. Delete circuit
  - **Multi-circuit testing:**
    - Create multiple circuits
    - Switch between them
    - Verify state isolation
    - Test localStorage persistence
  - **Visualization mode testing:**
    - Test all 5 modes (Graph, Tree, Loops, Cut-Sets, Results)
    - Verify highlighting works
    - Test tree selector
    - Test loop/cut-set selectors
  - **Error case testing:**
    - Disconnected circuit
    - No sources
    - Voltage-source-only loop
    - Current-source-only cut-set
    - Singular matrix (if possible to create)
  - **LaTeX rendering verification:**
    - Check all matrices render correctly
    - Check equations render correctly
    - Test with different matrix sizes
  - **Layout testing:**
    - Resize all panes
    - Test minimum sizes
    - Test on different screen sizes
  - **Code quality:**
    - Run `bun lint` - fix all errors
    - Run `bun tsgo` - fix all type errors
    - Run `bun format:check` - ensure formatting
    - Check CodeScene metrics (CC < 10, no bumpy roads)
  - **Documentation:**
    - Update README with usage instructions
    - Add screenshots
    - Document known limitations
  - _Requirements: All requirements_

---

## Summary

**Phase 1 (Tasks 1-9): ✅ COMPLETED**

- Foundation, UI components, circuit editor, graph transformation

**Phase 2 (Tasks 10-23): 🚧 IN PROGRESS**

- Validation, analysis algorithms, contexts, visualization

**Phase 3 (Tasks 24-28): ⏳ PENDING**

- Testing, optimization, polish, final integration

---

## Quick Reference: Analysis Phase Implementation Order

### Recommended Implementation Sequence

**Week 1: Validation & Core Analysis**

1. Task 10: Circuit validation logic
2. Task 11: Validation Context
3. Task 12: Nodal analysis implementation
4. Task 13: Loop analysis implementation

**Week 2: Calculation & Presentation** 5. Task 14: Calculation Context 6. Task 15: Report generator utilities 7. Task 16: Presentation Context 8. Task 17: Analysis Pane wrapper

**Week 3: Visualization** 9. Task 18: Analysis controls toolbar 10. Task 19: Cytoscape graph visualization 11. Task 20: Graph visualization modes 12. Task 21: Interactive graph features

**Week 4: Results & Error Handling** 13. Task 22: Results display component 14. Task 23: Error and loading states

**Week 5: Testing & Polish** 15. Task 24: Unit tests 16. Task 25: Reference test circuits 17. Task 26: Performance optimizations 18. Task 27: UI polish 19. Task 28: Final integration testing

### Critical Dependencies

- Tasks 10-11 must be completed before 12-13 (validation before analysis)
- Tasks 12-13 must be completed before 14 (analysis before calculation context)
- Task 14 must be completed before 15-16 (calculation before presentation)
- Tasks 10-17 must be completed before 18-23 (backend before UI)
- Task 19 should reference `docs/lecturesImages/` for visual style

### Testing Strategy

- Write tests alongside implementation (not at the end)
- Use reference circuits from Task 25 to validate Tasks 12-13
- Test each context independently before integration
- Verify LaTeX rendering early in Task 15

### Code Quality Checkpoints

After each task:

- Run `bun lint` and fix all errors
- Run `bun tsgo` and fix all type errors
- Check cyclomatic complexity (should be < 10)
- Verify no nested ternaries
- Ensure all functions use logger (not console)
- Verify useMemo/useCallback usage for performance

### Key Files to Create

**Analysis Utilities:**

- `src/analysis/utils/validation.ts`
- `src/analysis/utils/nodalAnalysis/` (directory)
- `src/analysis/utils/loopAnalysis/` (directory)
- `src/analysis/utils/reportGenerator/` (directory)

**Contexts:**

- `src/contexts/ValidationContext/` (directory)
- `src/contexts/CalculationContext/` (directory)
- `src/contexts/PresentationContext/` (directory)

**Components:**

- `src/components/AnalysisPane/AnalysisPane.tsx`
- `src/components/AnalysisPane/AnalysisControls.tsx`
- `src/components/AnalysisPane/GraphVisualization/` (directory)
- `src/components/AnalysisPane/ResultsDisplay.tsx`
- `src/components/AnalysisPane/ErrorDisplay.tsx`
- `src/components/AnalysisPane/LoadingSpinner.tsx`

**Tests:**

- `src/analysis/utils/__tests__/` (directory)
- `src/analysis/__tests__/fixtures/` (directory)
- `src/store/__tests__/` (directory)

### Mathematical Formulations Reference

**Nodal Analysis (Cut-Set Method):**

```
Y_node = A * YB * A^T
I_node = A * (IB - YB * EB)
EN = solve(Y_node, I_node)
VB = A^T * EN
JB = YB * VB + YB * EB - IB
```

**Loop Analysis (Tie-Set Method):**

```
Z_loop = B * ZB * B^T
E_loop = B * EB - B * ZB * IB
IL = solve(Z_loop, E_loop)
JB = B^T * IL
VB = ZB * (JB + IB) - EB
```

Where:

- A = Reduced incidence matrix (N-1 × B)
- B = Tie-set matrix (L × B, L = B-N+1)
- YB = Branch admittance matrix (diagonal)
- ZB = Branch impedance matrix (diagonal)
- EB = Branch voltage source vector
- IB = Branch current source vector
- EN = Node voltage vector
- IL = Loop current vector
- VB = Branch voltage vector
- JB = Branch current vector

### Visualization Modes Summary

1. **Circuit Graph** - Basic directed graph with all nodes and branches
2. **Spanning Tree** - Highlight twigs (green solid) vs links (red dashed)
3. **Loop Overlay** - Color-coded fundamental loops with equations
4. **Cut-Set Overlay** - Color-coded fundamental cut-sets with equations
5. **Results** - Branch currents/voltages overlaid on graph

### Common Pitfalls to Avoid

1. **Don't** make calculation automatic - it should be on-demand only
2. **Don't** use nested ternaries - extract into functions
3. **Don't** use console - always use logger utility
4. **Don't** forget to memoize computed values and callbacks
5. **Don't** create large monolithic files - use modular directory structure
6. **Don't** skip error handling - wrap matrix operations in try-catch
7. **Don't** forget to reference lecture images for visualization style
8. **Don't** mix up matrix dimensions - verify with known test circuits

### Success Criteria

The analysis phase is complete when:

- ✅ User can run nodal and loop analysis on any valid circuit
- ✅ Results are displayed with properly formatted LaTeX matrices
- ✅ Graph visualization shows all 5 modes correctly
- ✅ Validation errors are clear and actionable
- ✅ All tests pass with reference circuits
- ✅ Code quality metrics are met (CC < 10, no linting errors)
- ✅ Performance is acceptable (< 2s for circuits with 100 nodes)
- ✅ UI is polished and accessible
