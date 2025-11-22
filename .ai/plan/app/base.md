### **Phase 1: Core Architecture & Data Model**

This is the most important part to get right, as it underpins everything else. Your concept of an "absorbed" node that reflects an abstract data model is the correct professional approach. We will use a dedicated state management library for this.

#### 1.1. The Abstract Data Model

We'll define the "source of truth" for our entire application. This state will live outside of React Flow.

```typescript
// --- Data Model Interfaces ---

interface ComponentData {
  value: number; // e.g., 10 (for 10Ω or 10V)
  direction?: "up" | "down" | "left" | "right"; // For sources
  // ... any other specific properties
}

// Represents a component on the canvas (a "branch" in graph theory)
interface CircuitNode {
  id: string; // Unique ID (e.g., 'R1', 'V_source_1')
  type: "resistor" | "voltageSource" | "currentSource" | "node"; // Custom node type
  position: { x: number; y: number }; // For React Flow rendering
  data: ComponentData;
}

// Represents a wire between two nodes (a connection)
interface CircuitEdge {
  id: string; // e.g., 'e1-2'
  source: string; // Source CircuitNode ID
  sourceHandle: string; // ID of the specific terminal/handle
  target: string; // Target CircuitNode ID
  targetHandle: string; // ID of the specific terminal/handle
}

// Represents a single, complete circuit
interface Circuit {
  id: string; // Unique ID for the circuit (e.g., 'circuit-1')
  name: string; // User-friendly name (e.g., "RC Filter")
  nodes: CircuitNode[];
  edges: CircuitEdge[];
}

// --- The Global Application State ---
interface AppState {
  circuits: Record<string, Circuit>; // An object of all circuits, keyed by ID
  activeCircuitId: string | null;
}
```

#### 1.2. State Management

To manage this data model, we'll use **Zustand**. It's a lightweight, modern state management library that is perfect for this use case. It avoids the boilerplate of Redux while providing the centralized control we need.

- React Flow will be a "dumb" renderer. It will receive nodes and edges from our Zustand store.
- Any user interaction in React Flow (moving a node, connecting an edge) will call a function that updates the Zustand store.
- The store update will trigger a re-render of React Flow with the new state.

**This architecture perfectly implements your "absorbed node" requirement.**

### **Phase 2: Project Setup & Layout**

#### 2.1. Technology Stack

- **Framework:** React (Vite for fast setup)
- **Diagramming:** React Flow
- **State Management:** Zustand
- **Math Engine:** `math.js`
- **UI Layout:** `react-resizable-panels` (for the draggable panes)
- **UI Components:** A library like **MUI** or **Chakra UI** (for dialogs, buttons, side panels).
- **Markdown/LaTeX:** `react-markdown`, `remark-math`, `rehype-katex`

#### 2.2. Three-Pane Layout Implementation

Using `react-resizable-panels`, we'll structure `App.js` like this:

```jsx
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

function App() {
  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={20} minSize={15}>
        <CircuitManagerPane /> {/* Pane 1 */}
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={50} minSize={30}>
        <EditorPane /> {/* Pane 2 */}
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={30} minSize={20}>
        <AnalysisPane /> {/* Pane 3 */}
      </Panel>
    </PanelGroup>
  );
}
```

### **Phase 3: The Editor Pane (Pane 2)**

This pane will itself be split into the component palette and the canvas.

#### 3.1. Component Palette (Side Panel)

- A simple React component that lists available circuit elements (Resistor, Voltage Source, etc.).
- Each item will have the `draggable="true"` attribute and an `onDragStart` event handler.
- `onDragStart` will store the component type (e.g., `'resistor'`) in the `dataTransfer` object.

#### 3.2. React Flow Canvas & Drag-and-Drop

- The React Flow component will be wrapped in a `<div>`.
- This wrapper will have `onDragOver` (to prevent the default browser behavior) and `onDrop` handlers.
- The `onDrop` handler will:
  1.  Read the component type from the `dataTransfer` object.
  2.  Get the drop position on the canvas relative to the React Flow pane.
  3.  **Open a dialog** to get the component's properties (ID, value).
  4.  On dialog submission, call a Zustand action (e.g., `addNode(newCircuitNode)`) to update the central state.

#### 3.3. Custom Nodes

We will create a custom node component for each circuit element.

- **`ResistorNode.js`**: Will display an SVG of a resistor. It will have two handles (terminals) on the left and right. It will include an inline `<input>` to change the resistance value, which calls the `updateNodeData` action in the store.
- **`VoltageSourceNode.js`**: Will display a circle with '+' and '-' symbols.
  - **Handles**: It will have two handles, `top` and `bottom`.
  - **Direction**: An icon (e.g., a refresh/rotate icon) with an `onClick` that calls a store action `updateNodeData(id, { ...data, direction: newDirection })`. The SVG's appearance will change based on the `data.direction` prop.
  - **Value**: An inline input for the voltage.

### **Phase 4: Circuit Management (Pane 1)**

- This component will subscribe to the `circuits` and `activeCircuitId` parts of the Zustand store.
- It will render a list of `circuit.name` for each circuit in the store.
- A "New Circuit" button will call a `createCircuit()` action in the store.
- Each list item will have a "Delete" button and an `onClick` handler.
- `onClick` will call the `setActiveCircuit(circuitId)` action. This action will be responsible for telling the Editor and Analysis panes which circuit's data to work with.

### **Phase 5: The Analysis Pane (Pane 3)**

This is the calculation and output engine.

#### 5.1. Analysis Trigger & Validation

- A "Run Analysis" button.
- When clicked, it gets the data for the `activeCircuit` from the Zustand store.
- **Validation Step:** Before any math, it runs checks:
  1.  **Is the graph connected?** Use a simple graph traversal algorithm (like Breadth-First Search) starting from an arbitrary node. If the number of visited nodes is less than the total number of nodes, the circuit has isolated parts and cannot be solved as a single system.
  2.  **Are there sufficient components?** Must have at least one source and one passive element.

#### 5.2. Matrix Generation

- This is where the logic from your PDFs is implemented in code.
- **Node Analysis (Cut-Set Method):**
  1.  Identify all unique connection points (nodes). Select one as the reference (ground).
  2.  Create the **Incidence Matrix (A)** based on which branches enter/leave each non-reference node.
  3.  Create the **Branch Admittance Matrix (YB)**, a diagonal matrix where `Y_ii = 1/Z_i`.
  4.  Solve `(A * YB * A^T) * V = I_sources`.
- **Loop Analysis (Tie-Set Method):**
  1.  Create a graph from nodes/edges.
  2.  Find a **spanning tree** of the graph.
  3.  Identify the **links** (edges not in the tree).
  4.  Each link defines a fundamental loop. Create the **Tie-Set Matrix (B)** from these loops.
  5.  Create the **Branch Impedance Matrix (ZB)**.
  6.  Solve `(B * ZB * B^T) * I_loop = V_sources_in_loop`.

#### 5.3. Solving with `math.js`

- Use `math.matrix()` to create matrices.
- Use `math.multiply()`, `math.transpose()`, and `math.lusolve()` (more stable than `inv`) to solve the system of linear equations.

#### 5.4. Programmatic Output with Markdown & KaTeX

- The analysis function will build a large string containing the step-by-step solution.
- It will format matrices and equations using LaTeX syntax inside the string.

```javascript
// Inside your analysis function
let solutionSteps = `# Nodal Analysis for ${activeCircuit.name}\n\n`;
solutionSteps += `## Step 1: Form the Incidence Matrix (A)\n\n`;
solutionSteps += `Based on the connections, the matrix is:\n\n`;
solutionSteps += `$$ A = ${matrixToLatex(A)} $$ \n\n`;
// ... more steps ...
setMarkdownOutput(solutionSteps);

// In your AnalysisPane component
<ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
  {markdownOutput}
</ReactMarkdown>;
```

---

### **Development Roadmap**

1.  **Setup:** Initialize React project with Vite, install all dependencies.
2.  **State & Layout:**
    - Define TypeScript interfaces for the data model.
    - Set up the Zustand store with placeholder actions (`addNode`, etc.).
    - Implement the 3-pane layout using `react-resizable-panels`.
3.  **Basic Editor (Pane 2):**
    - Create a simple custom `ResistorNode`.
    - Get React Flow to render nodes and edges from the Zustand store.
    - Implement `onNodesChange`, `onEdgesChange` to update the store (basic interactivity).
4.  **Component Palette & D&D:**
    - Build the side panel with draggable items.
    - Implement the `onDrop` logic on the React Flow wrapper.
    - Create the "Add Component" dialog.
5.  **Advanced Custom Nodes:**
    - Build the `VoltageSourceNode` with direction and value controls.
    - Refine handles/terminals on all nodes.
6.  **Circuit Management (Pane 1):**
    - Implement the UI to list, add, delete, and select circuits.
    - Wire it up to the Zustand actions (`createCircuit`, `setActiveCircuit`).
7.  **Analysis Engine Core (Pane 3):**
    - Implement the graph validation logic (BFS).
    - Write the functions to generate the Incidence Matrix and Branch Admittance/Impedance matrices from the circuit state.
    - Integrate `math.js` to solve a sample matrix equation.
8.  **Output Formatting:**
    - Create the `matrixToLatex` helper function.
    - Integrate `react-markdown` and its plugins.
    - Start building the `solutionSteps` string and render it.
9.  **Integration & Refinement:**
    - Connect all the pieces.
    - Add error handling (e.g., for unsolvable circuits).
    - Polish the UI/UX.
