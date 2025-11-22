# Nodal Analysis Implementation

This document describes the implementation of nodal analysis (cut-set method) in the application.

## Overview

**Nodal analysis** solves for node voltages (`E_N`) using the reduced incidence matrix (`A`) and branch admittance matrix (`Y_B`).

**Best for:** Circuits with many loops but few nodes

**Cut-Set Analysis Method:**

## Mathematical Formulation

### System Equation

```
A * Y_B * A^T * E_N = A * (I_B - Y_B * E_B)
```

Or in compact form:
```
Y_node * E_N = I_node
```

Where:
- `Y_node = A * Y_B * A^T` - Node admittance matrix ((N-1) × (N-1))
- `I_node = A * (I_B - Y_B * E_B)` - Node current vector ((N-1) × 1)
- `E_N` - Node voltage vector ((N-1) × 1)

### Solution Process

1. Build reduced incidence matrix `A`
2. Build branch admittance matrix `Y_B`
3. Build source vectors `E_B` and `I_B`
4. Compute `Y_node = A * Y_B * A^T`
5. Compute `I_node = A * (I_B - Y_B * E_B)`
6. Solve `Y_node * E_N = I_node` for `E_N`
7. Calculate `V_B = A^T * E_N`
8. Calculate `J_B = Y_B * V_B + Y_B * E_B - I_B`

## Implementation

### File Structure

```
src/analysis/utils/nodalAnalysis/
├── buildIncidenceMatrix.ts          # Builds A matrix
├── buildBranchAdmittanceMatrix.ts   # Builds Y_B matrix
├── buildSourceVectors.ts            # Builds E_B and I_B vectors
└── solveNodalEquations.ts           # Main solver
```

### 1. Build Incidence Matrix (A)

**File:** `buildIncidenceMatrix.ts`

**Function:** `buildIncidenceMatrix(graph: AnalysisGraph): Matrix`

The reduced incidence matrix represents branch-to-node connectivity with the reference node row removed.

**Construction:**
```typescript
// For each branch
for (const branch of graph.branches) {
  const fromNodeIndex = nonRefNodes.findIndex(n => n.id === branch.fromNodeId);
  const toNodeIndex = nonRefNodes.findIndex(n => n.id === branch.toNodeId);
  
  // A[i][j] = +1 if branch j leaves node i
  if (fromNodeIndex !== -1) {
    A[fromNodeIndex][branchIndex] = 1;
  }
  
  // A[i][j] = -1 if branch j enters node i
  if (toNodeIndex !== -1) {
    A[toNodeIndex][branchIndex] = -1;
  }
}
```

**Matrix size:** (N-1) × B

**Example:**

For a circuit with 4 nodes (node 4 is reference) and 6 branches:

```
A = [
  [-1,  1,  0, -1,  0,  0],  // Node 1
  [ 0, -1,  1,  0,  1,  0],  // Node 2
  [ 1,  0, -1,  0,  0,  1]   // Node 3
]
```

### 2. Build Branch Admittance Matrix (Y_B)

**File:** `buildBranchAdmittanceMatrix.ts`

**Function:** `buildBranchAdmittanceMatrix(graph: AnalysisGraph): Matrix`

The branch admittance matrix is diagonal with `Y_B[i][i] = 1/R` for resistors.

**Construction:**
```typescript
const admittances = graph.branches.map(branch => {
  if (branch.type === "resistor") {
    return 1 / branch.value;  // Y = 1/R
  }
  return 0;  // Sources handled via E_B and I_B
});

const Y_B = diag(admittances);
```

**Matrix size:** B × B (diagonal)

**Example:**

For branches with resistances [5Ω, 5Ω, 10Ω, 5Ω] and 2 sources:

```
Y_B = diag([0.2, 0.2, 0.1, 0.2, 0, 0])
```

### 3. Build Source Vectors

**File:** `buildSourceVectors.ts`

**Functions:**
- `buildBranchVoltageSourceVector(graph: AnalysisGraph): Matrix`
- `buildBranchCurrentSourceVector(graph: AnalysisGraph): Matrix`

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

**Example:**

For a circuit with one 10V voltage source at branch 0:

```
E_B = [10, 0, 0, 0, 0, 0]^T
I_B = [0, 0, 0, 0, 0, 0]^T
```

### 4. Solve Nodal Equations

**File:** `solveNodalEquations.ts`

**Function:** `solveNodalEquations(A, Y_B, E_B, I_B): NodalSolutionResult`

**Process:**

#### Step 1: Compute Node Admittance Matrix

```typescript
function computeNodeAdmittanceMatrix(A: Matrix, Y_B: Matrix): Matrix {
  const A_T = transpose(A);
  const Y_B_AT = multiply(Y_B, A_T);
  const Y_node = multiply(A, Y_B_AT);
  return Y_node;
}
```

**Result:** `Y_node` is (N-1) × (N-1) symmetric matrix

#### Step 2: Compute Node Current Vector

```typescript
function computeNodeCurrentVector(A, Y_B, E_B, I_B): Matrix {
  const Y_B_EB = multiply(Y_B, E_B);
  const I_B_minus_Y_B_EB = subtract(I_B, Y_B_EB);
  const I_node = multiply(A, I_B_minus_Y_B_EB);
  return I_node;
}
```

**Result:** `I_node` is (N-1) × 1 vector

#### Step 3: Solve for Node Voltages

```typescript
function solveForNodeVoltages(Y_node: Matrix, I_node: Matrix): Matrix {
  const E_N = lusolve(Y_node, I_node);
  return E_N;
}
```

**Method:** LU decomposition with partial pivoting

**Result:** `E_N` is (N-1) × 1 vector of node voltages

#### Step 4: Calculate Branch Voltages

```typescript
function computeBranchVoltages(A: Matrix, E_N: Matrix): Matrix {
  const A_T = transpose(A);
  const V_B = multiply(A_T, E_N);
  return V_B;
}
```

`V_B = A^T * E_N`

**Result:** `V_B` is B × 1 vector

#### Step 5: Calculate Branch Currents

```typescript
function computeBranchCurrents(Y_B, V_B, E_B, I_B): Matrix {
  const Y_B_EB = multiply(Y_B, E_B);
  const Y_B_VB = multiply(Y_B, V_B);
  const Y_B_VB_plus_Y_B_EB = add(Y_B_VB, Y_B_EB);
  const J_B = subtract(Y_B_VB_plus_Y_B_EB, I_B);
  return J_B;
}
```

`J_B = Y_B * V_B + Y_B * E_B - I_B`

**Result:** `J_B` is B × 1 vector

## Result Structure

```typescript
interface NodalSolutionResult {
  nodeVoltages: Matrix;      // E_N (N-1 × 1)
  branchVoltages: Matrix;    // V_B (B × 1)
  branchCurrents: Matrix;    // J_B (B × 1)
  systemMatrix: Matrix;      // Y_node (N-1 × N-1)
  systemVector: Matrix;      // I_node (N-1 × 1)
  steps: AnalysisStep[];     // Step-by-step solution
  error?: string;            // Error message if failed
}
```

## Error Handling

### Singular Matrix

If `Y_node` is singular (determinant = 0), the system has no unique solution.

**Causes:**
- Disconnected circuit
- Floating nodes
- All-capacitor loops (DC analysis)

**Handling:**
```typescript
try {
  const E_N = lusolve(Y_node, I_node);
} catch (error) {
  if (error.message.includes("singular")) {
    throw new Error(
      "System matrix is singular. " +
      "Check circuit connectivity and component values."
    );
  }
}
```

### Numerical Issues

**Prevention:**
- Use stable LU decomposition
- Check for zero resistances
- Validate matrix dimensions

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

### Matrices

**Incidence Matrix A:**
```
A = [
  [ 1,  0,  0],  // Node 1
  [-1,  1,  0],  // Node 2
  [ 0, -1,  1]   // Node 3
]
```

**Admittance Matrix Y_B:**
```
Y_B = diag([0, 0.2, 0.2])  // [source, 5Ω, 5Ω]
```

**Source Vectors:**
```
E_B = [10, 0, 0]^T
I_B = [0, 0, 0]^T
```

### Solution

**Node Admittance Matrix:**
```
Y_node = A * Y_B * A^T = [
  [0.2, -0.2,  0  ],
  [-0.2, 0.4, -0.2],
  [0,   -0.2,  0.2]
]
```

**Node Current Vector:**
```
I_node = A * (I_B - Y_B * E_B) = [0, 0, 0]^T
```

**Node Voltages:**
```
E_N = [10, 5, 0]^T  // Voltages at nodes 1, 2, 3
```

**Branch Voltages:**
```
V_B = A^T * E_N = [10, 5, 5]^T
```

**Branch Currents:**
```
J_B = Y_B * V_B + Y_B * E_B - I_B = [0, 1, 1]^T
```

## Performance Considerations

### Matrix Sparsity

- `A` is typically sparse (many zeros)
- `Y_B` is diagonal (very sparse)
- `Y_node` is usually sparse for large circuits

**Optimization:** Use sparse matrix libraries for large circuits

### Computational Complexity

- Building `Y_node`: O(N² × B)
- LU decomposition: O(N³)
- Back substitution: O(N²)

**Total:** O(N³) dominated by solving the linear system

### Memory Usage

- `A`: (N-1) × B
- `Y_B`: B × B (but diagonal, so B elements)
- `Y_node`: (N-1) × (N-1)

**Total:** O(N² + NB)

## Testing

### Unit Tests

Test individual matrix builders:
```typescript
describe('buildIncidenceMatrix', () => {
  it('should build correct incidence matrix', () => {
    const graph = createTestGraph();
    const A = buildIncidenceMatrix(graph);
    expect(A.size()).toEqual([3, 6]);
    // Verify specific entries
  });
});
```

### Integration Tests

Test complete nodal analysis:
```typescript
describe('solveNodalEquations', () => {
  it('should solve simple resistor network', () => {
    const result = solveNodalEquations(A, Y_B, E_B, I_B);
    expect(result.error).toBeUndefined();
    // Verify KCL: A * J_B ≈ 0
  });
});
```

## See Also

- [mathematical-foundation.md](./mathematical-foundation.md) - Theory and equations
- [matrix-construction.md](./matrix-construction.md) - Matrix building details
- [equation-solving.md](./equation-solving.md) - Linear system solver
- [loop-analysis.md](./loop-analysis.md) - Alternative method
