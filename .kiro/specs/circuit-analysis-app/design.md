# Design Document: Circuit Analysis Application

## Overview

This document describes the technical design for a web-based circuit analysis application built with React, TypeScript, and Vite. The application enables users to visually design DC electrical circuits and automatically perform nodal and loop analysis using graph theory and matrix methods.

The architecture follows a strict separation of concerns with three primary layers:
1. **Presentation Layer**: React components for UI rendering and user interaction
2. **State Management Layer**: Zustand store as the single source of truth for circuit data
3. **Analysis Pipeline**: Three-stage context-based pipeline (Validation → Calculation → Presentation)

### Key Architectural Principles

- **Single Source of Truth**: All circuit data lives in the Zustand store, not in React Flow's internal state
- **Unidirectional Data Flow**: Circuit Model → Validation → Calculation → Presentation → UI
- **Separation of Concerns**: Pure utility functions for math/graph operations, React contexts for orchestration
- **Type Safety**: Strict TypeScript with no `any` types or non-null assertions
- **Modularity**: Each component and utility is independently testable

### Important Note on Mathematical Accuracy

The implementation must account for potential corrections to the reference CAD lecture materials, particularly in the construction of topology matrices (Incidence, Tie-set, and Cut-set matrices). During implementation:

1. **Verification Required**: All matrix construction algorithms should be verified against standard circuit analysis textbooks and tested with known reference circuits
2. **Documentation**: Any discrepancies or corrections discovered in the lecture formulations must be documented in code comments with clear explanations
3. **Testing**: Each matrix construction method must be validated with circuits that have known analytical solutions

The mathematical formulations in the Appendix section of this document represent the standard approach from circuit analysis literature. If corrections to the lecture materials are needed, they will be applied during implementation with proper documentation and justification.

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Shell                         │
│                         (App.tsx)                                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
        ┌───────▼──────┐  ┌─────▼─────┐  ┌──────▼───────┐
        │   Circuit    │  │  Circuit  │  │   Analysis   │
        │   Manager    │  │  Editor   │  │     Pane     │
        │   (Pane 1)   │  │ (Pane 2)  │  │   (Pane 3)   │
        └──────────────┘  └───────────┘  └──────────────┘
                │                │                │
                └────────────────┼────────────────┘
                                 │
                        ┌────────▼────────┐
                        │  Zustand Store  │
                        │  (circuitStore) │
                        └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │ Analysis Pipeline│
                        │   (3 Contexts)   │
                        └─────────────────┘
```

### Technology Stack

Based on the existing `package.json` and steering documents:

- **Runtime**: Bun
- **Build Tool**: Vite (rolldown-vite@7.2.2)
- **Framework**: React 19.2.0
- **Language**: TypeScript 6.0.0-dev with strict type checking
- **Design System**: Material-UI (MUI) v6 (to be added)
- **State Management**: Zustand (to be added)
- **Visual Editor**: React Flow (to be added)
- **Math Library**: mathjs (to be added)
- **Layout**: react-resizable-panels (to be added)
- **Math Rendering**: KaTeX with react-markdown, remark-math, rehype-katex (to be added)
- **Graph Visualization**: Cytoscape.js with react-cytoscapejs (to be added)

### Dependencies to Add

```json
{
  "dependencies": {
    "@mui/material": "^6.1.0",
    "@mui/icons-material": "^6.1.0",
    "@emotion/react": "^11.13.3",
    "@emotion/styled": "^11.13.0",
    "zustand": "^5.0.2",
    "@xyflow/react": "^12.3.5",
    "mathjs": "^14.0.1",
    "react-resizable-panels": "^2.1.7",
    "react-markdown": "^9.0.1",
    "remark-math": "^6.0.0",
    "rehype-katex": "^7.0.1",
    "katex": "^0.16.11",
    "cytoscape": "^3.30.4",
    "react-cytoscapejs": "^2.0.0"
  },
  "devDependencies": {
    "@types/katex": "^0.16.7",
    "@types/cytoscape": "^3.21.8"
  }
}
```

## Components and Interfaces

### Data Model (Core Types)

Located in `src/types/circuit.ts`:

```typescript
// Component-specific data
export interface ComponentData {
  value: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  label?: string;
}

// A circuit component (maps to React Flow node)
export interface CircuitNode {
  id: string;
  type: 'resistor' | 'voltageSource' | 'currentSource' | 'ground';
  position: { x: number; y: number };
  data: ComponentData;
}

// A wire connection (maps to React Flow edge)
export interface CircuitEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

// A complete circuit
export interface Circuit {
  id: string;
  name: string;
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  createdAt: number;
  modifiedAt: number;
}
```

### Analysis Data Model

Located in `src/types/analysis.ts`:

```typescript
import { Matrix } from 'mathjs';

// Pure graph representation for analysis
export interface ElectricalNode {
  id: string;
  connectedBranchIds: string[];
}

export interface Branch {
  id: string;
  type: 'resistor' | 'voltageSource' | 'currentSource';
  value: number;
  fromNodeId: string;
  toNodeId: string;
}

export interface SpanningTree {
  id: string;
  twigBranchIds: string[];      // Tree branches
  linkBranchIds: string[];       // Co-tree branches (links)
  description?: string;          // Optional description of this tree
}

export interface AnalysisGraph {
  nodes: ElectricalNode[];
  branches: Branch[];
  referenceNodeId: string;
  allSpanningTrees: SpanningTree[];     // All possible spanning trees
  selectedTreeId: string;                // Currently selected tree for analysis
}

// Validation results
export interface ValidationResult {
  isValid: boolean;
  isSolvable: boolean;
  errors: string[];
  warnings: string[];
}

// Calculation results
export interface CalculationResult {
  method: 'nodal' | 'loop';
  
  // Input matrices and vectors
  incidenceMatrix?: Matrix;        // A (for nodal/cut-set)
  tieSetMatrix?: Matrix;            // B (for loop/tie-set)
  branchImpedanceMatrix?: Matrix;   // ZB (diagonal)
  branchAdmittanceMatrix?: Matrix;  // YB (diagonal)
  branchVoltageSources?: Matrix;    // EB (vector)
  branchCurrentSources?: Matrix;    // IB (vector)
  
  // Intermediate matrices
  systemMatrix?: Matrix;            // A*YB*A^T or B*ZB*B^T
  systemVector?: Matrix;            // RHS of system equation
  
  // Solution vectors
  nodeVoltages?: Matrix;            // EN (for nodal)
  loopCurrents?: Matrix;            // IL (for loop)
  
  // Final results
  branchVoltages: Matrix;           // VB
  branchCurrents: Matrix;           // JB
  
  // Metadata
  steps: AnalysisStep[];
}

export interface AnalysisStep {
  title: string;
  description: string;
  matrix?: Matrix;
  equation?: string;
}
```

### State Management (Zustand Store)

Located in `src/store/circuitStore.ts`:

```typescript
interface CircuitStore {
  // State
  circuits: Record<string, Circuit>;
  activeCircuitId: string | null;
  
  // Circuit management actions
  createCircuit: (name?: string) => string;
  deleteCircuit: (id: string) => void;
  setActiveCircuit: (id: string) => void;
  updateCircuitName: (id: string, name: string) => void;
  
  // Node/Edge manipulation actions
  addNode: (circuitId: string, node: CircuitNode) => void;
  updateNode: (circuitId: string, nodeId: string, updates: Partial<CircuitNode>) => void;
  deleteNode: (circuitId: string, nodeId: string) => void;
  
  addEdge: (circuitId: string, edge: CircuitEdge) => void;
  updateEdge: (circuitId: string, edgeId: string, updates: Partial<CircuitEdge>) => void;
  deleteEdge: (circuitId: string, edgeId: string) => void;
  
  // Batch updates (for React Flow integration)
  syncNodesFromFlow: (circuitId: string, nodes: CircuitNode[]) => void;
  syncEdgesFromFlow: (circuitId: string, edges: CircuitEdge[]) => void;
  
  // Selectors
  getActiveCircuit: () => Circuit | null;
  getCircuitById: (id: string) => Circuit | undefined;
}
```

**Design Rationale**: Zustand provides a lightweight, hook-based state management solution without Redux boilerplate. The store acts as the single source of truth, with React Flow configured as a controlled component.

### Component Architecture

#### 0. Theme Provider (`src/contexts/ThemeContext.tsx`)

**Purpose**: Provide Material-UI theme with light/dark mode support.

```typescript
interface ThemeContextValue {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
    },
  }), [mode]);
  
  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
```

**Features**:
- Wraps entire application with MUI ThemeProvider
- Provides light and dark theme variants
- Persists theme preference to localStorage
- Includes CssBaseline for consistent styling
- Exposes toggleTheme function for theme switcher

#### 1. Application Shell (`src/App.tsx`)

```typescript
export function App() {
  return (
    <ThemeProvider>
      <PanelGroup direction="horizontal">
        <Panel defaultSize={20} minSize={15} maxSize={30}>
          <CircuitManagerPane />
        </Panel>
        
        <PanelResizeHandle />
        
        <Panel defaultSize={50} minSize={30}>
          <CircuitEditorPane />
        </Panel>
        
        <PanelResizeHandle />
        
        <Panel defaultSize={30} minSize={20}>
          <AnalysisPaneWrapper />
        </Panel>
      </PanelGroup>
    </ThemeProvider>
  );
}
```

#### 2. Circuit Manager Pane (`src/components/CircuitManager/CircuitManagerPane.tsx`)

**Responsibilities**:
- Display list of all circuits
- Create new circuits
- Delete circuits
- Select active circuit
- Rename circuits
- Toggle theme (light/dark mode)

**Key Features**:
- Subscribes to `circuits` and `activeCircuitId` from Zustand store
- Calls store actions for circuit management
- Highlights the active circuit
- Shows circuit metadata (creation date, last modified)

**MUI Components Used**:
- `Box` for layout container
- `List`, `ListItem`, `ListItemButton`, `ListItemText` for circuit list
- `Button` for "New Circuit" action
- `IconButton` for delete and theme toggle
- `TextField` for inline circuit name editing
- `Tooltip` for helpful hints
- `Divider` for visual separation
- `Typography` for headers and labels
- `DeleteIcon`, `Brightness4Icon`, `Brightness7Icon` from @mui/icons-material

#### 3. Circuit Editor Pane (`src/components/CircuitEditor/CircuitEditorPane.tsx`)

**Structure**:
```
CircuitEditorPane
├── ComponentPalette (sidebar)
│   ├── ResistorPaletteItem
│   ├── VoltageSourcePaletteItem
│   └── CurrentSourcePaletteItem
└── ReactFlowCanvas
    ├── Custom Nodes
    │   ├── ResistorNode
    │   ├── VoltageSourceNode
    │   └── CurrentSourceNode
    └── Custom Edges
        └── WireEdge
```

**Responsibilities**:
- Render the active circuit using React Flow
- Handle drag-and-drop from component palette
- Manage node/edge interactions (move, connect, delete)
- Sync all changes back to Zustand store

**React Flow Integration**:
```typescript
const CircuitEditorPane = () => {
  const activeCircuit = useCircuitStore(state => state.getActiveCircuit());
  const syncNodes = useCircuitStore(state => state.syncNodesFromFlow);
  const syncEdges = useCircuitStore(state => state.syncEdgesFromFlow);
  
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Apply changes to local state
    const updatedNodes = applyNodeChanges(changes, activeCircuit.nodes);
    // Sync back to store
    syncNodes(activeCircuit.id, updatedNodes);
  }, [activeCircuit, syncNodes]);
  
  // Similar for edges...
  
  return (
    <ReactFlow
      nodes={activeCircuit?.nodes ?? []}
      edges={activeCircuit?.edges ?? []}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={customNodeTypes}
      // ... other props
    />
  );
};
```

#### 4. Custom Nodes

**ResistorNode** (`src/components/CircuitEditor/nodes/ResistorNode.tsx`):
- SVG representation of resistor symbol
- Two handles (left and right terminals)
- Inline editable resistance value using MUI `TextField`
- Updates store on value change
- MUI `Tooltip` for component information

**VoltageSourceNode** (`src/components/CircuitEditor/nodes/VoltageSourceNode.tsx`):
- SVG representation with polarity indicators
- Two handles (top and bottom terminals)
- Direction toggle using MUI `IconButton` (rotates polarity)
- Inline editable voltage value using MUI `TextField`
- MUI `Tooltip` for component information

**CurrentSourceNode** (`src/components/CircuitEditor/nodes/CurrentSourceNode.tsx`):
- SVG representation with arrow indicator
- Two handles
- Direction toggle using MUI `IconButton`
- Inline editable current value using MUI `TextField`
- MUI `Tooltip` for component information

#### 5. Analysis Pane Wrapper (`src/components/AnalysisPane/AnalysisPaneWrapper.tsx`)

**Structure**:
```typescript
const AnalysisPaneWrapper = () => {
  const activeCircuit = useCircuitStore(state => state.getActiveCircuit());
  
  if (!activeCircuit) {
    return <EmptyState message="No circuit selected" />;
  }
  
  return (
    <AnalysisProvider circuit={activeCircuit}>
      <MatrixCalculationProvider>
        <PresentationProvider>
          <AnalysisPane />
        </PresentationProvider>
      </MatrixCalculationProvider>
    </AnalysisProvider>
  );
};
```

**AnalysisPane** (`src/components/AnalysisPane/AnalysisPane.tsx`):

**Complete Layout Structure**:
```
AnalysisPane (Vertical Split)
├── Top Section (40% height)
│   ├── AnalysisControls (Toolbar)
│   │   ├── Run Analysis button
│   │   ├── Method selector (Nodal / Loop / Both)
│   │   ├── Spanning tree selector dropdown
│   │   └── Visualization mode tabs (Graph / Tree / Loops / Cut-Sets / Results)
│   └── GraphVisualization (Cytoscape Canvas)
│       ├── Circuit graph view
│       ├── Spanning tree highlight (twigs in green, links in blue)
│       ├── Loop overlay (each loop in different color)
│       ├── Cut-set overlay (each cut-set in different color)
│       ├── Results overlay (branch currents/voltages as labels)
│       └── Interactive legend
└── Bottom Section (60% height - Scrollable)
    ├── ErrorDisplay (if validation fails)
    ├── LoadingSpinner (during calculation)
    └── ResultsDisplay (Markdown + KaTeX)
        ├── Analysis method header
        ├── Selected spanning tree info
        ├── Step-by-step matrices and equations
        ├── Loop/Cut-set definitions with color indicators
        ├── Final results table
        └── Summary section
```

**Interaction Flow**:
1. User selects analysis method and spanning tree
2. User clicks "Run Analysis"
3. Top section shows graph with selected tree highlighted
4. Bottom section shows step-by-step mathematical solution
5. User can switch visualization modes to see loops/cut-sets
6. Clicking on a loop/cut-set in the bottom section highlights it in the top graph
7. Final results mode shows branch currents/voltages overlaid on graph

**Features**:
- Synchronized highlighting between graph and equations
- Color-coded loops and cut-sets for easy identification
- Resizable split between graph and results
- Export graph as PNG
- Copy equations to clipboard
- Print-friendly results view

## Analysis Pipeline

### Three-Layer Context Architecture

The analysis pipeline is implemented as three nested React Context providers, each responsible for one stage of the analysis process.

#### Layer 1: Validation Context (`src/contexts/ValidationContext.tsx`)

**Purpose**: Transform the UI circuit model into a pure graph representation and validate it for solvability.

**Input**: `Circuit` from Zustand store  
**Output**: `AnalysisGraph` + `ValidationResult`

**Trigger Behavior**: The validation layer automatically re-runs whenever the active circuit changes (per Requirement 10). This provides immediate feedback on circuit validity without requiring user action.

**Process**:
1. Convert `CircuitNode[]` and `CircuitEdge[]` to `ElectricalNode[]` and `Branch[]`
2. Identify unique electrical connection points
3. Select reference (ground) node
4. Run validation checks:
   - Graph connectivity (BFS traversal)
   - Presence of at least one source
   - No voltage-source-only loops
   - No current-source-only cut-sets
5. Find all possible spanning trees (for comprehensive analysis)
6. Select default spanning tree (typically using BFS/DFS from reference node)

**Context State**:
```typescript
interface ValidationContextState {
  analysisGraph: AnalysisGraph | null;
  validation: ValidationResult;
  isValidating: boolean;
}
```

#### Layer 2: Calculation Context (`src/contexts/CalculationContext.tsx`)

**Purpose**: Perform the mathematical analysis using matrix methods.

**Input**: `AnalysisGraph` from Layer 1  
**Output**: `CalculationResult`

**Trigger Behavior**: Unlike validation, calculation is **manually triggered** by the user clicking "Run Analysis" button. This design decision balances Requirement 10 (automatic pipeline) with performance considerations:
- **Validation runs automatically**: Provides immediate feedback on circuit validity
- **Calculation runs on-demand**: Prevents expensive matrix operations on every edit
- **Rationale**: Matrix solving is O(n³) and should only run when the user wants to see results

**Process**:
1. Check if graph is solvable (from Layer 1)
2. Based on selected method:
   - **Nodal Analysis (Cut-Set Method)**:
     - Build reduced incidence matrix (A) - reference node row omitted
     - Build branch admittance matrix (YB) - diagonal matrix
     - Build branch voltage source vector (EB)
     - Build branch current source vector (IB)
     - Solve (A * YB * A^T) * EN = A * (IB - YB * EB) for node voltages
     - Calculate branch voltages: VB = A^T * EN
     - Calculate branch currents: JB = YB * VB + YB * EB - IB
   - **Loop Analysis (Tie-Set Method)**:
     - Build tie-set matrix (B) - one row per fundamental loop
     - Build branch impedance matrix (ZB) - diagonal matrix
     - Build branch voltage source vector (EB)
     - Build branch current source vector (IB)
     - Solve (B * ZB * B^T) * IL = B * EB - B * ZB * IB for loop currents
     - Calculate branch currents: JB = B^T * IL
     - Calculate branch voltages: VB = ZB * (JB + IB) - EB
3. Record each step for presentation

**Context State**:
```typescript
interface CalculationContextState {
  result: CalculationResult | null;
  isCalculating: boolean;
  error: string | null;
}
```

#### Layer 3: Presentation Context (`src/contexts/PresentationContext.tsx`)

**Purpose**: Format the calculation results into human-readable Markdown with LaTeX equations.

**Input**: `CalculationResult` from Layer 2  
**Output**: Markdown string with embedded LaTeX

**Trigger Behavior**: Automatically runs whenever calculation results are available. This is lightweight (string formatting) and provides immediate presentation updates.

**Process**:
1. Generate report header with circuit name and method
2. For each analysis step:
   - Add step title and description
   - Convert matrices to LaTeX using `matrixToLatex()` helper
   - Format equations with proper notation
3. Create results table with branch currents and voltages
4. Add summary section
5. Generate visualization data:
   - Extract loop/cut-set definitions from matrices
   - Assign colors to each loop/cut-set
   - Create branch result mappings for final visualization
   - Prepare highlighting data for interactive graph

**Context State**:
```typescript
interface PresentationContextState {
  markdownOutput: string;
  isGenerating: boolean;
  visualizationData: GraphVisualizationData;
}

interface GraphVisualizationData {
  mode: 'graph' | 'tree' | 'loops' | 'cutsets' | 'results';
  highlightedElements: string[];  // IDs of nodes/edges to highlight
  loopDefinitions?: LoopDefinition[];
  cutSetDefinitions?: CutSetDefinition[];
  branchResults?: Map<string, { current: number; voltage: number }>;
}

interface LoopDefinition {
  id: string;
  branchIds: string[];
  direction: Map<string, 'forward' | 'reverse'>;
  color: string;
  equation: string;
}

interface CutSetDefinition {
  id: string;
  branchIds: string[];
  direction: Map<string, 'forward' | 'reverse'>;
  color: string;
  equation: string;
}
```

### Graph Visualization Component

#### GraphVisualization (`src/components/AnalysisPane/GraphVisualization.tsx`)

**Purpose**: Render the circuit graph with visual overlays for spanning trees, loops, and cut-sets using Cytoscape.js.

**Design Philosophy**: The visualization follows academic conventions from the CAD lecture materials (see `docs/lecturesImages/`):
- Uses directed graphs (oriented graphs) with arrows on all branches
- Follows standard notation: nodes (n0, n1, ...), branches (a, b, c, ...)
- Clearly distinguishes between tree branches (twigs) and links (co-tree)
- Shows fundamental loops and cut-sets as defined in graph theory
- Maintains consistency with textbook and lecture diagram styles

**Visual Style Reference**:
The implementation should reference the actual graph diagrams in:
- `docs/lecturesImages/CAD_Lec_01/` - Graph theory concepts, trees, co-trees
- `docs/lecturesImages/CAD_Lec_02/` - Incidence matrices, tie-set matrices, cut-set matrices
- `docs/lecturesImages/CAD_Lec_03/` - Loop and nodal analysis examples

Key visual elements to match:
- Node representation (circles with labels)
- Branch representation (directed edges with arrows)
- Tree vs. link distinction (solid vs. dashed, or different colors)
- Loop direction indicators
- Cut-set boundary representation
- Label placement and formatting

**Why Cytoscape.js?**
- Specialized for graph/network visualization
- Automatic graph layout algorithms (breadthfirst, circle, grid, cose)
- Easy styling and highlighting of nodes/edges
- Interactive features (zoom, pan, select)
- Lightweight compared to D3.js for graph-specific tasks
- Better suited than React Flow for abstract graph representation (vs. circuit schematic)
- Supports directed graphs with arrows (matching lecture conventions)

**Visualization Modes**:

1. **Circuit Graph Mode** (Default - Directed Graph):
   - Shows all nodes and branches as a directed graph
   - Nodes styled as circles with labels (n0, n1, n2, etc.)
   - Branches styled as directed edges with arrows showing current direction
   - Branch labels show: branch ID (a, b, c, etc.) and component type/value
   - Reference node (typically n0) highlighted with ground symbol or different color
   - Follows lecture convention: directed (oriented) graph representation

2. **Spanning Tree Mode**:
   - Twigs (tree branches) highlighted in bold solid lines
   - Links (co-tree branches) shown in dashed lines
   - Tree selector allows switching between different spanning trees
   - Shows tree statistics: number of twigs = N-1, number of links = B-N+1
   - Maintains arrow directions on all branches
   - Visual distinction between tree and co-tree as shown in lectures

3. **Loop Overlay Mode** (for Loop Analysis - Tie-Set Method):
   - Each fundamental loop (f-loop) highlighted in different color
   - Loop direction indicated with curved arrows following the link direction
   - Each f-loop contains exactly one link and one or more tree branches
   - Loop selector to highlight individual loops
   - Shows loop equation below graph with proper sign conventions
   - Number of loops = number of links = B-N+1

4. **Cut-Set Overlay Mode** (for Nodal Analysis - Cut-Set Method):
   - Each fundamental cut-set (f-cut-set) highlighted in different color
   - Cut boundary shown as dashed line separating nodes
   - Each f-cut-set contains exactly one tree branch (twig) and one or more links
   - Cut-set selector to highlight individual cut-sets
   - Shows cut-set equation below graph
   - Number of cut-sets = number of twigs = N-1

**Cytoscape Configuration** (Aligned with Lecture Conventions):

```typescript
const cytoscapeStylesheet: cytoscape.Stylesheet[] = [
  // Node styles - circles with labels (n0, n1, n2, ...)
  {
    selector: 'node',
    style: {
      'background-color': '#4A90E2',
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '14px',
      'font-weight': 'bold',
      'color': '#000',
      'width': '40px',
      'height': '40px',
      'border-width': '2px',
      'border-color': '#2E5C8A'
    }
  },
  {
    selector: 'node.reference',
    style: {
      'background-color': '#000',
      'border-color': '#000',
      'color': '#fff',
      'shape': 'triangle',  // Ground symbol
      'label': 'data(label) + " (ref)"'
    }
  },
  // Edge styles - directed with arrows
  {
    selector: 'edge',
    style: {
      'width': 3,
      'line-color': '#333',
      'target-arrow-color': '#333',
      'target-arrow-shape': 'triangle',
      'target-arrow-size': '10px',
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': '11px',
      'text-rotation': 'autorotate',
      'text-margin-y': -10
    }
  },
  // Spanning tree visualization
  {
    selector: 'edge.twig',
    style: {
      'line-color': '#27AE60',  // Green for tree branches
      'target-arrow-color': '#27AE60',
      'width': 5,
      'line-style': 'solid'
    }
  },
  {
    selector: 'edge.link',
    style: {
      'line-color': '#E74C3C',  // Red for links (co-tree)
      'target-arrow-color': '#E74C3C',
      'width': 4,
      'line-style': 'dashed'
    }
  },
  // Fundamental loop highlighting (one color per loop)
  {
    selector: 'edge.loop-0',
    style: {
      'line-color': '#E74C3C',
      'target-arrow-color': '#E74C3C',
      'width': 6
    }
  },
  {
    selector: 'edge.loop-1',
    style: {
      'line-color': '#9B59B6',
      'target-arrow-color': '#9B59B6',
      'width': 6
    }
  },
  {
    selector: 'edge.loop-2',
    style: {
      'line-color': '#F39C12',
      'target-arrow-color': '#F39C12',
      'width': 6
    }
  },
  {
    selector: 'edge.loop-3',
    style: {
      'line-color': '#1ABC9C',
      'target-arrow-color': '#1ABC9C',
      'width': 6
    }
  },
  // Cut-set highlighting
  {
    selector: 'edge.cutset-0',
    style: {
      'line-color': '#3498DB',
      'target-arrow-color': '#3498DB',
      'width': 6
    }
  },
  {
    selector: 'edge.cutset-1',
    style: {
      'line-color': '#E67E22',
      'target-arrow-color': '#E67E22',
      'width': 6
    }
  },
  // ... more cut-set colors
];

const cytoscapeLayout = {
  name: 'breadthfirst',  // Hierarchical layout from reference node
  directed: true,
  roots: '#n0',  // Start from reference node
  spacingFactor: 1.75,
  animate: true,
  animationDuration: 500,
  padding: 30
};
```

**Data Transformation** (Following Lecture Conventions):

```typescript
function convertToCytoscapeElements(
  graph: AnalysisGraph,
  mode: 'graph' | 'tree' | 'loops' | 'cutsets'
): cytoscape.ElementDefinition[] {
  // Nodes: labeled as n0, n1, n2, ... (matching lecture notation)
  const nodes = graph.nodes.map((node, index) => ({
    data: {
      id: node.id,
      label: `n${index}`  // Standard notation from lectures
    },
    classes: node.id === graph.referenceNodeId ? 'reference' : ''
  }));
  
  // Edges: labeled as a, b, c, ... with component info (matching lecture notation)
  const edges = graph.branches.map((branch, index) => {
    const branchLabel = String.fromCharCode(97 + index);  // a, b, c, ...
    const componentInfo = formatComponentInfo(branch);
    
    // Determine edge classes based on visualization mode
    let classes = '';
    if (mode === 'tree') {
      const selectedTree = graph.allSpanningTrees.find(
        t => t.id === graph.selectedTreeId
      );
      if (selectedTree) {
        classes = selectedTree.twigBranchIds.includes(branch.id) 
          ? 'twig' 
          : 'link';
      }
    }
    
    return {
      data: {
        id: branch.id,
        source: branch.fromNodeId,
        target: branch.toNodeId,
        label: `${branchLabel}\n${componentInfo}`
      },
      classes
    };
  });
  
  return [...nodes, ...edges];
}

function formatComponentInfo(branch: Branch): string {
  switch (branch.type) {
    case 'resistor':
      return `${branch.value}Ω`;
    case 'voltageSource':
      return `${branch.value}V`;
    case 'currentSource':
      return `${branch.value}A`;
    default:
      return '';
  }
}
```

**Key Conventions from Lectures**:
- Nodes labeled as n0, n1, n2, ... (not arbitrary IDs)
- Branches labeled as a, b, c, ... (alphabetical)
- Reference node (typically n0) marked with ground symbol
- Directed graph with arrows showing branch current direction
- Tree branches (twigs) vs. links clearly distinguished
- Branch labels include component type and value

**Important**: The exact colors, line styles, and visual appearance should be finalized during implementation by referencing the actual lecture images in `docs/lecturesImages/`. The configuration above provides a starting point that follows general academic conventions, but should be adjusted to match the specific style used in the course materials.

**Loop Visualization** (Fundamental Loops / Tie-Sets):
- Each fundamental loop is defined by exactly one link
- Loop direction follows the link's direction
- All branches in the loop are highlighted in the same color
- Loop path is traced through the spanning tree
- Visual indicator shows loop direction with curved overlay arrow
- Loop equation displayed: sum of voltages around loop = 0

**Cut-Set Visualization** (Fundamental Cut-Sets):
- Each fundamental cut-set is defined by exactly one twig (tree branch)
- Cut-set separates the graph into two parts
- All branches crossing the cut are highlighted in the same color
- Dashed line shows the cut boundary
- Cut-set equation displayed: sum of currents through cut = 0

**Interactive Features**:
- Click on a loop/cut-set in the list to highlight it in the graph
- Hover over branches to see component details and current/voltage values
- Hover over nodes to see node voltage (for nodal analysis)
- Zoom and pan to explore complex circuits
- Toggle between different visualization modes
- Export graph as PNG image
- Synchronized highlighting between graph and equations

### Utility Functions

All pure mathematical and graph operations are implemented as utility functions in `src/analysis/utils/`.

#### `graphTransformer.ts`

```typescript
export function createAnalysisGraph(circuit: Circuit): AnalysisGraph
export function findAllSpanningTrees(graph: AnalysisGraph): SpanningTree[]
export function selectSpanningTree(graph: AnalysisGraph, treeId: string): AnalysisGraph
```

**Circuit to Graph Conversion** (Following Lecture Algorithm):

The conversion follows the algorithm from Lecture 1:
1. Identify all principal nodes in the circuit (connection points)
2. Replace passive elements (resistors) and voltage sources with short circuits (lines)
3. Replace current sources with open circuits (remove them temporarily)
4. The resulting structure is the graph topology
5. Restore all components as directed branches with proper orientation

**Implementation Details**:
- Converts UI circuit model to pure graph representation
- Identifies electrical nodes from edge connections
- Maps components to branches with direction (arrows)
- Assigns standard labels: nodes as n0, n1, n2, ...; branches as a, b, c, ...
- Selects reference node (typically n0, the ground node)
- Finds all possible spanning trees using recursive enumeration
- For each tree: identifies twigs (N-1 branches) and links (B-N+1 branches)
- Allows selection of specific spanning tree for analysis
- Maintains directed graph representation throughout

#### `validation.ts`

```typescript
export function validateGraph(graph: AnalysisGraph): ValidationResult
```
- Checks graph connectivity using BFS
- Validates presence of sources
- Detects voltage-source-only loops
- Detects current-source-only cut-sets
- Returns detailed error messages

#### `nodalAnalysis.ts`

```typescript
export function buildIncidenceMatrix(graph: AnalysisGraph): Matrix
export function buildBranchAdmittanceMatrix(graph: AnalysisGraph): Matrix
export function solveNodalEquations(
  A: Matrix,
  YB: Matrix,
  EB: Matrix,
  IB: Matrix
): { EN: Matrix; JB: Matrix; VB: Matrix }
```

**Incidence Matrix Construction** (Reduced Incidence Matrix):
- Rows: Non-reference nodes (N-1)
- Columns: Branches (B)
- A[i][j] = +1 if branch j current is leaving node i
- A[i][j] = -1 if branch j current is entering node i
- A[i][j] = 0 otherwise
- Reference node row is omitted (typically node 0)

**Solution Process** (Using Cut-Set Matrix C = A):
1. Build branch admittance matrix YB (diagonal matrix)
2. Build node admittance matrix: Y_node = C * YB * C^T (which equals A * YB * A^T)
3. Build current source vector: I_node = C * (IB - YB * EB) (which equals A * (IB - YB * EB))
4. Solve for node voltages: EN = solve(Y_node, I_node) using `math.lusolve()`
5. Calculate branch voltages: VB = C^T * EN (which equals A^T * EN)
6. Calculate branch currents: JB = YB * VB + YB * EB - IB

#### `loopAnalysis.ts`

```typescript
export function buildTieSetMatrix(graph: AnalysisGraph): Matrix
export function buildBranchImpedanceMatrix(graph: AnalysisGraph): Matrix
export function solveLoopEquations(
  B: Matrix,
  ZB: Matrix,
  EB: Matrix,
  IB: Matrix
): { IL: Matrix; JB: Matrix; VB: Matrix }
```

**Tie-Set Matrix Construction** (Fundamental Loop Matrix):
- Rows: Links (L = B - N + 1), one row per fundamental loop
- Columns: Branches (B)
- For each link, trace the fundamental loop through the spanning tree
- B[i][j] = +1 for the link that defines loop i
- B[i][j] = +1 if tree branch j is in loop i with same direction as the link
- B[i][j] = -1 if tree branch j is in loop i with opposite direction to the link
- B[i][j] = 0 if branch j is not part of loop i

**Solution Process**:
1. Build branch impedance matrix ZB (diagonal matrix)
2. Build loop impedance matrix: Z_loop = B * ZB * B^T
3. Build voltage source vector: E_loop = B * EB - B * ZB * IB
4. Solve for loop currents: IL = solve(Z_loop, E_loop) using `math.lusolve()`
5. Calculate branch currents: JB = B^T * IL
6. Calculate branch voltages: VB = ZB * (JB + IB) - EB

#### `reportGenerator.ts`

```typescript
export function matrixToLatex(matrix: Matrix): string
export function generateMarkdownReport(
  result: CalculationResult,
  graph: AnalysisGraph
): string
export function generateLoopDescription(
  loopIndex: number,
  graph: AnalysisGraph
): string
export function generateCutSetDescription(
  cutSetIndex: number,
  graph: AnalysisGraph
): string
```

**LaTeX Matrix Formatting**:
```typescript
function matrixToLatex(matrix: Matrix): string {
  const data = matrix.toArray();
  const rows = data.map(row => 
    row.map(val => val.toFixed(3)).join(' & ')
  ).join(' \\\\ ');
  return `\\begin{pmatrix} ${rows} \\end{pmatrix}`;
}
```

**Loop/Cut-Set Descriptions**:
- Generate human-readable descriptions of each fundamental loop
- Generate descriptions of each fundamental cut-set
- Used in both the markdown report and graph visualization tooltips

## Visualization Architecture

### Two Separate Graph Representations

The application uses two different graph visualization libraries for different purposes:

**1. React Flow (Circuit Editor Pane)**:
- **Purpose**: Interactive circuit schematic editor
- **Use Case**: Drag-and-drop component placement, wire connections
- **Representation**: Visual circuit diagram with component symbols
- **Features**: Node positioning, edge routing, component palette
- **Data**: Synchronized with Zustand store (Circuit model)

**2. Cytoscape.js (Analysis Pane)**:
- **Purpose**: Abstract graph visualization for analysis
- **Use Case**: Display topology, spanning trees, loops, cut-sets
- **Representation**: Graph theory representation (nodes and edges)
- **Features**: Automatic layout, highlighting, overlays
- **Data**: Derived from AnalysisGraph (transformed from Circuit model)

### Visualization Data Flow

```
Circuit Model (Zustand)
    ↓
React Flow Canvas
    └─ Visual circuit schematic
    
Circuit Model (Zustand)
    ↓
ValidationContext
    ↓
AnalysisGraph
    ↓
Cytoscape Elements
    ↓
Cytoscape Canvas
    ├─ Graph topology view
    ├─ Spanning tree view
    ├─ Loop overlay
    └─ Cut-set overlay
```

### Graph Visualization States

The Cytoscape visualization in the Analysis Pane has multiple states:

1. **Initial State**: Empty or "No circuit selected" message
2. **Graph View**: Shows circuit topology after validation
3. **Tree Selection**: Highlights selected spanning tree (twigs vs links)
4. **Loop Analysis View**: Overlays fundamental loops with colors
5. **Cut-Set Analysis View**: Overlays fundamental cut-sets with colors
6. **Results View**: Shows final branch currents/voltages on graph

## Data Models

### Circuit Data Flow

```
User Interaction (React Flow)
    ↓
Store Action (Zustand)
    ↓
Circuit Model Update
    ↓
React Flow Re-render (controlled)
```

### Analysis Data Flow

```
Circuit Model (Zustand)
    ↓
ValidationContext
    ├─ Transform to AnalysisGraph
    ├─ Validate connectivity
    └─ Find spanning tree
    ↓
CalculationContext
    ├─ Build matrices (A, B, ZB, YB)
    ├─ Solve linear systems
    └─ Calculate branch values
    ↓
PresentationContext
    ├─ Format matrices as LaTeX
    ├─ Generate step-by-step report
    └─ Create Markdown output
    ↓
AnalysisPane (React Component)
    └─ Render with react-markdown + KaTeX
```

## Error Handling

### Validation Errors

**Disconnected Circuit**:
```
Error: Circuit contains isolated components
Details: Nodes [n3, n4] are not connected to the main circuit
```

**Missing Sources**:
```
Error: Circuit must contain at least one voltage or current source
```

**Voltage Source Loop**:
```
Error: Loop detected containing only voltage sources
Loop: V1 → V2 → V3 → V1
This creates a contradiction in KVL
```

**Current Source Cut-Set**:
```
Error: Cut-set detected containing only current sources
Cut-set: {I1, I2}
This creates a contradiction in KCL
```

### Calculation Errors

**Singular Matrix**:
```
Error: System of equations is singular (cannot be solved)
Possible causes:
- Redundant constraints
- Floating nodes (not connected to ground)
- Dependent sources creating circular dependencies
```

**Numerical Instability**:
```
Warning: Solution may be numerically unstable
Condition number: 1.2e15
Consider checking component values for extreme ratios
```

### UI Error Display

- Validation errors: Red banner in AnalysisPane with detailed message
- Calculation errors: Error modal with technical details and suggestions
- Warnings: Yellow banner that doesn't block analysis

## Testing Strategy

### Unit Tests

**Store Tests** (`src/store/__tests__/circuitStore.test.ts`):
- Circuit CRUD operations
- Node/Edge manipulation
- Active circuit selection
- State immutability

**Utility Function Tests** (`src/analysis/utils/__tests__/`):
- Graph transformation correctness
- Matrix construction accuracy
- Validation logic coverage
- Calculation correctness with known circuits

**Component Tests** (`src/components/__tests__/`):
- Custom node rendering
- User interactions (drag, connect, edit)
- Store integration

### Integration Tests

**Analysis Pipeline Tests**:
- End-to-end flow from Circuit to Markdown output
- Error propagation through contexts
- Context re-computation on circuit changes

**React Flow Integration Tests**:
- Drag-and-drop functionality
- Node connection creation
- Store synchronization

### Test Data

Create a library of reference circuits with known solutions:
- Simple voltage divider (2 resistors, 1 voltage source)
- Current divider (2 resistors, 1 current source)
- Bridge circuit (Wheatstone bridge)
- Multi-loop circuit (3+ loops)
- Multi-node circuit (4+ nodes)

Each test circuit includes:
- Circuit definition (nodes, edges)
- Expected AnalysisGraph
- Expected matrices (A, B, ZB, YB)
- Expected solution (node voltages, branch currents)

### Visual Style Verification

Before finalizing the graph visualization implementation, verify against lecture images:

1. **Graph Structure** (CAD_Lec_01 images):
   - Compare node styling (size, shape, color, labels)
   - Compare edge styling (thickness, arrows, labels)
   - Verify directed graph representation matches lecture style

2. **Spanning Tree Representation** (CAD_Lec_01 images):
   - Verify twig (tree branch) visual style
   - Verify link (co-tree branch) visual style
   - Check if solid/dashed or color coding is used

3. **Loop Visualization** (CAD_Lec_02/03 images):
   - Verify how fundamental loops are indicated
   - Check loop direction representation
   - Verify loop labeling convention

4. **Cut-Set Visualization** (CAD_Lec_02/03 images):
   - Verify how cut boundaries are shown
   - Check cut-set branch highlighting
   - Verify cut-set labeling convention

5. **Overall Layout**:
   - Compare graph layout algorithm results with lecture diagrams
   - Adjust spacing and positioning to match academic style
   - Ensure readability matches lecture materials

**Implementation Note**: During the implementation phase, the developer should:
- Open the lecture images in `docs/lecturesImages/`
- Match colors, line styles, and visual conventions exactly
- Ensure the Cytoscape.js configuration produces similar-looking graphs

### Manual Testing Checklist

**Circuit Editor Tests**:
- [ ] Create multiple circuits and switch between them
- [ ] Drag components from palette to canvas
- [ ] Connect components with wires
- [ ] Edit component values inline
- [ ] Delete components and connections
- [ ] Resize panes and verify layout

**Analysis Tests**:
- [ ] Run analysis on valid circuit
- [ ] Verify step-by-step output formatting
- [ ] Test error cases (disconnected, no sources, etc.)
- [ ] Verify LaTeX rendering in output

**Visualization Tests**:
- [ ] Verify circuit graph appears in Cytoscape view
- [ ] Switch between different spanning trees
- [ ] Verify twigs and links are highlighted correctly
- [ ] Click on individual loops to highlight them
- [ ] Click on individual cut-sets to highlight them
- [ ] Verify loop/cut-set colors match between graph and equations
- [ ] Hover over branches to see component details
- [ ] Zoom and pan in graph view
- [ ] Verify final results are displayed on graph branches
- [ ] Test graph layout with different circuit topologies

## Performance Considerations

### Optimization Strategies

1. **Memoization**:
   - Use `useMemo` for expensive graph transformations
   - Memoize matrix calculations
   - Cache LaTeX string generation

2. **Debouncing**:
   - Debounce inline value edits (300ms)
   - Debounce node position updates during drag

3. **Selective Pipeline Execution**:
   - Validation runs automatically on circuit changes (lightweight, provides immediate feedback)
   - Calculation runs only when explicitly requested via "Run Analysis" button (expensive matrix operations)
   - Presentation runs automatically when calculation completes (lightweight string formatting)

4. **React Flow Optimization**:
   - Use `nodesDraggable={true}` but sync to store on drag end, not during
   - Implement `isValidConnection` to prevent invalid edges

5. **Context Optimization**:
   - Each context only re-renders when its specific data changes
   - Use context selectors to prevent unnecessary re-renders

### Scalability Limits

Expected performance for circuits with:
- Up to 50 nodes: Instant analysis (<100ms)
- 50-100 nodes: Fast analysis (<500ms)
- 100-200 nodes: Acceptable analysis (<2s)
- 200+ nodes: May require optimization or progress indicator

Matrix operations scale as O(n³) for solving, so very large circuits may need:
- Sparse matrix implementations
- Iterative solvers instead of direct methods
- Web Worker for background calculation

**Spanning Tree Enumeration**:
- Number of spanning trees grows exponentially with circuit complexity
- For circuits with many loops (>5), enumerate only a subset of trees
- Provide option to use default tree (BFS-based) for quick analysis
- Show warning when tree count exceeds reasonable limit (e.g., >100 trees)
- Consider implementing Kirchhoff's matrix tree theorem for counting trees efficiently

## Future Enhancements

### Phase 2 Features (Not in Current Scope)

1. **Advanced Tree Analysis**:
   - Compare results across different spanning trees
   - Visualize differences in loop/cut-set selections
   - Optimal tree selection based on analysis complexity

2. **AC Analysis**:
   - Complex impedances
   - Phasor representation
   - Frequency response

3. **Transient Analysis**:
   - Capacitors and inductors
   - Time-domain simulation
   - Plotting capabilities

4. **Export/Import**:
   - Save circuits to JSON files
   - Export analysis reports to PDF
   - Import from SPICE netlists

5. **Collaboration**:
   - Share circuits via URL
   - Real-time collaborative editing
   - Cloud storage integration

6. **Advanced Components**:
   - Dependent sources (VCVS, CCCS, etc.)
   - Operational amplifiers
   - Transformers

7. **Optimization**:
   - Component value optimization
   - Sensitivity analysis
   - Monte Carlo simulation

## Appendix: Mathematical Formulations from Lectures

### Key Equations and Relationships

Based on the CAD lecture materials, the following formulations are used:

**Network Topology Matrix Relationships**:
- CL = -BT^t (relationship between cut-set and tie-set matrices)
- CL = AT^-1 * AL (relationship using incidence matrix partitions)
- C = AT^-1 * A (full relationship)

**KCL and KVL Using Matrices**:
- KCL: A * JB = 0 (using reduced incidence matrix)
- KVL: B * VB = 0 (using tie-set matrix)

**Branch-Loop Current Relationship**:
- JB = B^T * IL (branch currents from loop currents)

**Branch-Node Voltage Relationship**:
- VB = C^T * EN (branch voltages from node voltages)
- For nodal analysis using incidence matrix: VB = A^T * EN

**Branch Equilibrium Equations**:
1. Impedance Form: VB = ZB(JB + IB) - EB
2. Admittance Form: JB = YB*VB + YB*EB - IB

**Loop (Tie-Set) Analysis Final Equation**:
- B * ZB * B^T * IL = B * EB - B * ZB * IB
- Where IL is the vector of unknown loop currents

**Nodal (Cut-Set) Analysis Final Equation**:
- C * YB * C^T * EN = C * (IB - YB * EB)
- For implementation using incidence matrix: A * YB * A^T * EN = A * (IB - YB * EB)
- Where EN is the vector of unknown node voltages

**Important Notes**:
- The reduced incidence matrix A has the reference node row removed
- ZB and YB are diagonal matrices containing branch impedances and admittances
- EB is the vector of branch voltage sources
- IB is the vector of branch current sources
- Number of fundamental loops: L = B - N + 1 (where B = branches, N = nodes)

## Requirements Traceability

This section maps each requirement from the requirements document to the corresponding design components:

| Requirement | Design Components | Notes |
|-------------|------------------|-------|
| **Req 1: Circuit Visual Editor** | `CircuitEditorPane`, React Flow integration, custom nodes, `circuitStore` actions | Drag-and-drop, wire connections, component movement |
| **Req 2: Component Library** | `ComponentPalette`, `ResistorNode`, `VoltageSourceNode`, `CurrentSourceNode` | Three component types with inline editing using MUI TextField |
| **Req 3: Multi-Circuit Management** | `CircuitManagerPane`, `circuitStore` (circuits record, activeCircuitId) | CRUD operations for circuits using MUI List and Button components |
| **Req 4: Circuit Validation** | `ValidationContext`, `validation.ts` utilities | Connectivity, source presence, loop/cut-set checks |
| **Req 5: Nodal Analysis** | `CalculationContext`, `nodalAnalysis.ts`, incidence matrix construction | Cut-set method with A*YB*A^T formulation |
| **Req 6: Loop Analysis** | `CalculationContext`, `loopAnalysis.ts`, tie-set matrix construction | Fundamental loops with B*ZB*B^T formulation |
| **Req 7: Step-by-Step Presentation** | `PresentationContext`, `reportGenerator.ts`, react-markdown + KaTeX | LaTeX matrices, formatted equations, Markdown structure |
| **Req 8: Centralized State** | Zustand `circuitStore`, controlled React Flow | Single source of truth, no local React Flow state |
| **Req 9: Three-Pane Layout** | `App.tsx`, react-resizable-panels, `PanelGroup` | Resizable panes with min/max constraints |
| **Req 10: Pipeline Architecture** | Three nested contexts: `ValidationContext` → `CalculationContext` → `PresentationContext` | Validation auto-runs, calculation on-demand, presentation auto-runs |
| **Req 11: Theme System** | `ThemeContext`, MUI ThemeProvider, theme toggle in `CircuitManagerPane` | Light/dark mode with localStorage persistence |

## Conclusion

This design provides a solid foundation for building a professional-grade circuit analysis application. The architecture emphasizes:

- **Modularity**: Clear separation between UI, state, and analysis logic
- **Testability**: Pure functions and isolated contexts
- **Maintainability**: Strong typing and clear data flow
- **Extensibility**: Easy to add new component types or analysis methods
- **Requirements Coverage**: All 10 requirements are explicitly addressed with specific design components

The three-layer analysis pipeline ensures that each stage (validation, calculation, presentation) can be developed, tested, and debugged independently while maintaining a clean unidirectional data flow. The selective pipeline execution strategy (automatic validation, on-demand calculation) balances user experience with performance.
