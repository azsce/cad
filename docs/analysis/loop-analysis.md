# Loop Analysis Implementation

This document describes the implementation of loop analysis (tie-set method) in the application.

## Overview

**Loop analysis** solves for loop currents (`I_L`) using the tie-set matrix (`B`) and branch impedance matrix (`Z_B`).

**Best for:** Circuits with many nodes but few loops

**Tie-Set Analysis Method:**

## Mathematical Formulation

### System Equation

```
B * Z_B * B^T * I_L = B * E_B - B * Z_B * I_B
```

Or in compact form:
```
Z_loop * I_L = E_loop
```

Where:
- `Z_loop = B * Z_B * B^T` - Loop impedance matrix (L × L)
- `E_loop = B * E_B - B * Z_B * I_B` - Loop voltage vector (L × 1)
- `I_L` - Loop current vector (L × 1)
- `L` = Number of links = B - N + 1

### Solution Process

1. Build tie-set matrix `B`
2. Build branch impedance matrix `Z_B`
3. Build source vectors `E_B` and `I_B`
4. Compute `Z_loop = B * Z_B * B^T`
5. Compute `E_loop = B * E_B - B * Z_B * I_B`
6. Solve `Z_loop * I_L = E_loop` for `I_L`
7. Calculate `J_B = B^T * I_L`
8. Calculate `V_B = Z_B * (J_B + I_B) - E_B`

## Implementation

### File Structure

```
src/analysis/utils/loopAnalysis/
├── buildTieSetMatrix.ts             # Builds B matrix
├── buildBranchImpedanceMatrix.ts    # Builds Z_B matrix
├── buildSourceVectors.ts            # Builds E_B and I_B vectors
├── traceFundamentalLoop.ts          # Traces f-loops through tree
└── solveLoopEquations.ts            # Main solver
```

### 1. Build Tie-Set Matrix (B)

**File:** `buildTieSetMatrix.ts`

**Function:** `buildTieSetMatrix(graph: AnalysisGraph): Matrix`

The tie-set matrix represents fundamental loops (f-loops), where each f-loop contains only one link and one or more tree branches (twigs).

**Construction:**

```typescript
// For each link (defines one f-loop)
for (const [loopIndex, linkId] of linkBranchIds.entries()) {
  // Trace the f-loop through the spanning tree
  const loop = traceFundamentalLoop(graph, tree, linkBranch);
  
  // Fill matrix row based on branch directions
  for (const branch of loop.branches) {
    const branchIndex = graph.branches.findIndex(b => b.id === branch.id);
    const direction = loop.directions.get(branch.id);
    
    // B[i][j] = +1 for link or same-direction twig
    // B[i][j] = -1 for opposite-direction twig
    B[loopIndex][branchIndex] = direction;
  }
}
```

**Matrix size:** L × B

**Example:**

For a circuit with 4 nodes, 6 branches, spanning tree with twigs [d, e, f] and links [a, b, c]:

```
B = [
  [-1,  0, -1,  1,  0,  0],  // f-loop a: branches d, f, a
  [ 1,  1,  0,  0,  1,  0],  // f-loop b: branches d, e, b
  [ 0, -1,  1,  0,  0,  1]   // f-loop c: branches e, f, c
]
```

### 2. Trace Fundamental Loops

**File:** `traceFundamentalLoop.ts`

**Function:** `traceFundamentalLoop(graph, tree, linkBranch): FundamentalLoop`

Each f-loop is defined by one link. To find the complete loop:
1. Start at the link's `toNode`
2. Find path through spanning tree back to link's `fromNode`
3. Combine link + tree path = closed loop

**Algorithm:**

```typescript
function traceFundamentalLoop(graph, tree, linkBranch) {
  // Build adjacency list for spanning tree (twigs only)
  const adjacencyList = buildTreeAdjacencyList(graph, tree);
  
  // BFS to find path through tree
  const treePath = findPathThroughTree(
    linkBranch.toNodeId,
    linkBranch.fromNodeId,
    adjacencyList
  );
  
  // Build complete loop
  const branches = [linkBranch];  // Start with link
  const directions = new Map([[linkBranch.id, 1]]);  // Link direction = +1
  
  // Add tree branches with their directions
  for (const segment of treePath) {
    const branch = graph.branches.find(b => b.id === segment.branchId);
    branches.push(branch);
    
    // +1 if traversed forward, -1 if reversed
    const direction = segment.direction === "forward" ? 1 : -1;
    directions.set(branch.id, direction);
  }
  
  return { linkBranch, branches, directions };
}
```

**Result:** `FundamentalLoop` with all branches and their directions

### 3. Build Branch Impedance Matrix (Z_B)

**File:** `buildBranchImpedanceMatrix.ts`

**Function:*ldBranchIeMatrix(graph: AnalysisGraph): Matrix`

The branch impedance matrix is diagonal with `Z_B[i][i] = R` for resistors.

**Construction:**

```typescript
const impedances = graph.branches.map(branch => {
  if (branch.type === "resistor") {
    return branch.value;  // Z = R
  }
  return 0;  // Ideal sources have zero impedance
});

const Z_B = diag(impedances);
```

**Matrix size:** B × B (diagonal)

**Example:**

For branches with resistances [5Ω, 5Ω, 10Ω, 5Ω] and 2 sources:

```
Z_B = diag([0, 0, 5, 5, 10, 5])
```

### 4. Build Source Vectors

**File:** `buildSourceVectors.ts**Functions:**
- `buildBranchVoltageSourceVector(graph: AnalysisGraph): Matrix`
- ilhCurrentSourceVector(graph: Analysrix`

Source vectors represent independent voltage and current sources.

**Construction:**

```typescript
// E_B: Voltage sources
const voltages = graph.branches.map(branch => {
  if (branch.type === "voltageSource") {
    return branch.value;
  }
  return 0;
});

// I_B: Current sources
const currents = graph.branches.map(branch => {
  if (branch.type === "currentSource") {
    return branch.value;
  }
  return 0;
});
```

**Vector size:** B × 1

### 5. Solve Loop Equations

**File:** `solveLoopEquations.ts`

**Function:** `solveLoopEquations(graph: AnalysisGraph): LoopSolutionResult`

**Process:**

#### Step 1: Compute Loop Impedance Matrix

```typescript
function calculateLoopImpedanceMatrix(B: Matrix, Z_B: Matrix): Matrix {
  const B_T = transpose(B);
  const temp = multiply(B, Z_B);
  const Z_loop = multiply(temp, B_T);
  return Z_loop;
}
```

**Result:** `Z_loop` is L × L symmetric matrix

#### Step 2: Compute Loop Voltage Vector

```typescript
function calculateLoopVoltageVector(B, Z_B, E_B, I_B): Matrix {
  const term1 = multiply(B, E_B);
  const temp = multiply(Z_B, I_B);
  const term2 = multiply(B, temp);
  const E_loop = subtract(term1, term2);
  return E_loop;
}
```

**Result:** `E_loop` is L × 1 vector

#### Step 3: Solve for Loop Currents

```typescript
function solveForLoopCurrents(Z_loop: Matrix, E_loop: Matrix): Matrix {
  const I_L = lusolve(Z_loop, E_loop);
  return I_L;
}
```

**Method:** LU decomposition with partial pivoting

**Result:** `I_L` is L × 1 vector of loop currents

#### Step 4: Calculate Branch Currents

```typescript
function calculateBranchCurrents(B: Matrix, I_L: Matrix): Matrix {
  const B_T = transpose(B);
  const J_B = multiply(B_T, I_L);
  return J_B;
}
```

`J_B = B^T * I_L` (Loop transformation equation)

**Result:** `J_B` is B × 1 vector

#### Step 5: Calculate Branch Voltages

```typescript
function calculateBranchVoltages(Z_B, J_B, I_B, E_B): Matrix {
  const sum = add(J_B, I_B);
  const product = multiply(Z_B, sum);
  const V_B = subtract(product, E_B);
  return V_B;
}
```

`V_B = Z_B * (J_B + I_B) - E_B`

**Result:** `V_B` is B × 1 vector

## Result Structure

```typescript
interface LoopSolutionResult {
  loopCurrents: Matrix;      // I_L (L × 1)
  branchCurrents: Matrix;    // J_B (B × 1)
  branchVoltages: Matrix;    // V_B (B × 1)
  steps: AnalysisStep[];     // Step-by-step solution
}
```

## Fundamental Loop Properties

### Definition

A fundamental loop (f-loop) is a loop containing:
- **Exactly one link** (defines the loop)
- **One or more tree branches (twigs)**

### Count

Number of f-loops = Number of links = L = B - N + 1

### Independence

All f-loops are linearly independent, forming a basis for all possible loops in the circuit.

### Direction Convention

- Link direction defines the f-loop direction (+1)
- Twig in same direction as link: +1
- Twig in opposite direction to link: -1

## Example: Simple Circuit

### Circuit

```
    10V
     +
     |
    [a]
     |
  1--●--2
     |
    [b] 5Ω
     |
  3--●--4 (ref)
     |
    [c] 5Ω
     |
     ●
     4
```

### Spanning Tree

**Twigs:** [b, c]  
**Links:** [a]

### Matrices

**Tie-Set Matrix B:**
```
B = [
  [1, -1, -1]  // f-loop a: link a, twigs b and c (both opposite)
]
```

**Impedance Matrix Z_B:**
```
Z_B = diag([0, 5, 5])  // [source, 5Ω, 5Ω]
```

**Source Vectors:**
```
E_B = [10, 0, 0]^T
I_B = [0, 0, 0]^T
```

### Solution

**Loop Impedance Matrix:**
```
Z_loop = B * Z_B * B^T = [10]  // Single loop
```

**Loop Voltage Vector:**
```
E_loop = B * E_B - B * Z_B * I_B = [10]
```

**Loop Currents:**
```
I_L = [1]  // 1A in the loop
```

**Branch Currents:**
```
J_B = B^T * I_L = [1, -1, -1]^T
```

(Negative signs indicate current flows opposite to branch direction)

**Branch Voltages:**
```
V_B = Z_B * (J_B + I_B) - E_B = [10, 5, 5]^T
```

## Error Handling

### Singular Matrix

If `Z_loop` is singular, the system has no unique solution.

**Causes:**
- All-voltage-source loop (KVL violation)
- Dependent loops (shouldn't happen with proper tree)

**Handling:**
```typescript
try {
  const I_L = lusolve(Z_loop, E_loop);
} catch (error) {
  if (error.message.includes("singular")) {
    throw new Error(
      "System matrix is singular. " +
      "Check for voltage source loops or circuit topology."
    );
  }
}
```

### Invalid Spanning Tree

If the spanning tree is invalid (contains loops or doesn't connect all nodes):

**Prevention:**
- Validate spanning tree during generation
- Use proper tree generation algorithm (DFS/BFS)

## Performance Considerations

### Matrix Sparsity

- `B` is typically sparse
- `Z_B` is diagonal (very sparse)
- `Z_loop` is usually dense but small (L × L)

### Computational Complexity

- Building `Z_loop`: O(L² × B)
- LU decomposition: O(L³)
- Back substitution: O(L²)

**Total:** O(L³) dominated by solving the linear system

**Note:** L is usually much smaller than N for planar circuits, making loop analysis efficient for circuits with many nodes.

### Memory Usage

- `B`: L × B
- `Z_B`: B × B (but diagonal, so B elements)
- `Z_loop`: L × L

**Total:** O(L² + LB)

## Comparison with Nodal Analysis

| Aspect | Loop Analysis | Nodal Analysis |
|--------|---------------|----------------|
| Unknowns | Loop currents (L) | Node voltages (N-1) |
| System size | L × L | (N-1) × (N-1) |
| Best for | Many nodes, few loops | Many loops, few nodes |
| Matrix | Tie-set (B) | Incidence (A) |
| Complexity | O(L³) | O(N³) |

**Rule of thumb:** Use loop analysis when L < N-1

## Testing

### Unit Tests

Test tie-set matrix builder:
```typescript
describe('buildTieSetMatrix', () => {
  it('should build correct tie-set matrix', () => {
    const graph = createTestGraph();
    const B = buildTieSetMatrix(graph);
    expect(B.size()).toEqual([3, 6]);  // 3 links, 6 branches
    // Verify link columns have +1
  });
});
```

Test f-loop tracer:
```typescript
describe('traceFundamentalLoop', () => {
  it('should trace complete loop through tree', () => {
    const loop = traceFundamentalLoop(graph, tree, linkBranch);
    expect(loop.branches).toContain(linkBranch);
    // Verify loop is closed
  });
});
```

### Integration Tests

Test complete loop analysis:
```typescript
describe('solveLoopEquations', () => {
  it('should solve simple resistor network', () => {
    const result = solveLoopEquations(graph);
    // Verify KVL: B * V_B ≈ 0
  });
});
```

## See Also

- [mathematical-foundation.md](./mathematical-foundation.md) - Theory and equations
- [matrix-construction.md](./matrix-construction.md) - Matrix building details
- [graph-theory.md](./graph-theory.md) - Spanning trees and f-loops
- [nodal-analysis.md](./nodal-analysis.md) - Alternative method
