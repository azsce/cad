# Circuit Analysis Implementation Overview

## Architecture

The circuit analysis system follows a three-layer pipeline architecture:

```
User Input → Validation → Calculation → Presentation
```

### 1. Validation Layer
**Context:** `ValidationContext`

- Converts React Flow nodes/edges to analysis graph
- Validates circuit topology (connectivity, sources, etc.)
- Builds spanning trees
- Checks if circuit is solvable

**Output:** `AnalysisGraph` with validation status

### 2. Calculation Layer
**Context:** `CalculationContext`

- Accepts validated `AnalysisGraph`
- Performs mathematical analysis (nodal or loop)
- Builds matrices and solves equations
- Generates step-by-step solution

**Output:** `CalculationResult` with matrices, vectors, and solutions

### 3. Presentation Layer
**Context:** `PresentationContext`

- Formats calculation results for display
- Generates visualization data (f-loops, f-cut sets)
- Creates markdown reports with LaTeX
- Provides branch results for graph highlighting

**Output:** `PresentationState` with formatted data

## Data Flow

```
CircuitEditor (React Flow)
    ↓
ValidationContext
    ├─ Graph Transformer
    ├─ Topology Validator
    └─ Spanning Tree Generator
    ↓
CalculationContext
    ├─ Matrix Builders
    ├─ Equation Solvers
    └─ Step Tracker
    ↓
PresentationContext
    ├─ Visualization Generator
    ├─ Report Generator
    └─ Result Formatter
    ↓
AnalysisPane (Display)
```

## Key Components

### Graph Representation

**Type:** `AnalysisGraph`

```typescript
{
  nodes: Node[]           // Circuit nodes
  branches: Branch[]      // Circuit branches (resistors, sources)
  referenceNodeId: string // Ground node
  allSpanningTrees: SpanningTree[]
  selectedTreeId: string
}
```

### Branch Types

1. **Resistor** - Has resistance value (R)
2. **Voltage Source** - Has voltage value (E)
3. **Current Source** - Has current value (I)

### Spanning Tree

**Type:** `SpanningTree`

```typescript
{
  id: string
  twigBranchIds: string[]  // Tree branches (N-1)
  linkBranchIds: string[]  // Co-tree branches (B-N+1)
}
```

## Analysis Methods

### Nodal Analysis (Cut-Set Method)

**When to use:** Circuits with many loops, few nodes

**Process:**
1. Build reduced incidence matrix `A`
2. Build branch admittance matrix `Y_B`
3. Build source vectors `E_B` and `I_B`
4. Solve: `A * Y_B * A^T * E_N = A * (I_B - Y_B * E_B)`
5. Calculate branch voltages: `V_B = A^T * E_N`
6. Calculate branch currents: `J_B = Y_B * V_B + Y_B * E_B - I_B`

**Output:** Node voltages `E_N`, branch voltages `V_B`, branch currents `J_B`

### Loop Analysis (Tie-Set Method)

**When to use:** Circuits with many nodes, few loops

**Process:**
1. Build tie-set matrix `B`
2. Build branch impedance matrix `Z_B`
3. Build source vectors `E_B` and `I_B`
4. Solve: `B * Z_B * B^T * I_L = B * E_B - B * Z_B * I_B`
5. Calculate branch currents: `J_B = B^T * I_L`
6. Calculate branch voltages: `V_B = Z_B * (J_B + I_B) - E_B`

**Output:** Loop currents `I_L`, branch voltages `V_B`, branch currents `J_B`

## File Organization

```
src/
├── analysis/
│   └── utils/
│       ├── nodalAnalysis/          # Nodal analysis implementation
│       │   ├── buildIncidenceMatrix.ts
│       │   ├── buildBranchAdmittanceMatrix.ts
│       │   ├── buildSourceVectors.ts
│       │   └── solveNodalEquations.ts
│       ├── loopAnalysis/           # Loop analysis implementation
│       │   ├── buildTieSetMatrix.ts
│       │   ├── buildBranchImpedanceMatrix.ts
│       │   ├── buildSourceVectors.ts
│       │   ├── traceFundamentalLoop.ts
│       │   └── solveLoopEquations.ts
│       └── reportGenerator/        # Report generation
│           ├── generateMarkdownReport.ts
│           ├── formatEquation.ts
│           └── matrixToLatex.ts
├── contexts/
│   ├── ValidationContext/          # Validation layer
│   ├── CalculationContext/         # Calculation layer
│   └── PresentationContext/        # Presentation layer
└── types/
    └── analysis.ts                 # Type definitions
```

## Error Handling

### Validation Errors
- Disconnected circuits
- Missing reference node
- Invalid component values
- Unsupported topologies

### Calculation Errors
- Singular system matrix (no unique solution)
- Numerical instability
- Invalid spanning tree

### Recovery Strategy
- Clear error messages with guidance
- Graceful degradation
- Preserve user's circuit state

## Performance Considerations

### Matrix Operations
- Use sparse matrix representations where possible
- Leverage diagonal structure of `Z_B` and `Y_B`
- Cache matrix computations

### Spanning Trees
- Generate all spanning trees once during validation
- Allow user to select different trees
- Reuse tree for multiple analyses

### Visualization
- Lazy generation of visualization data
- Memoize expensive computations
- Batch updates to React Flow

## Testing Strategy

### Unit Tests
- Matrix builders (incidence, tie-set, impedance, admittance)
- Equation solvers
- Graph transformers

### Integration Tests
- Full analysis pipeline
- Validation → Calculation → Presentation

### Example Circuits
- Simple resistor networks
- Circuits with voltage sources
- Circuits with current sources
- Mixed source circuits

## Next Steps

- Read [mathematical-foundation.md](./mathematical-foundation.md) for the theory
- Explore [nodal-analysis.md](./nodal-analysis.md) or [loop-analysis.md](./loop-analysis.md)
- Check [matrix-construction.md](./matrix-construction.md) for implementation details
