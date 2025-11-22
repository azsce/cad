# Mathematical Foundation

This document describes the mathematical theory behind the circuit analysis implementation.
## Graph Theory Fundamentals

### Graph Representation

A circuit is represented as a **directed graph**:
- **Nodes** - Connection points in the circuit
- **Branches** - Components (resistors, sources) connecting nodes
- **Direction** - Current flow direction (arbitrary but consistent)

### Key Formulas

**Number of nodes:** N  
**Number of branches:** B  
**Number of tree branches (twigs):** T = N - 1  
**Number of links:** L = B - N + 1

### Spanning Tree

A **spanning tree** is a connected subgraph that:
1. Contains all nodes
2. Forms a connected graph
3. Contains no loops

**Tree branches (twigs):** Branches in the spanning tree  
**Co-tree branches (links):** Branches not in the spanning tree

## Network Topology Matrices

### 1. Incidence Matrix (A)


The incidence matrix shows the connection of branches to nodes.

**Full incidence matrix:** N × B  
**Reduced incidence matrix:** (N-1) × B (reference node row removed)

**Construction rules:**
- `A[i][j] = +1` if branch j current is **leaving** node i
- `A[i][j] = -1` if branch j current is **entering** node i
- `A[i][j] = 0` if branch j is not connected to node i

**Application:**
```
A * J_B = 0    (Kirchhoff's Current Law)
```

### 2. Tie-Set Matrix (B)

The tie-set matrix represents fundamental loops (f-loops).

**Size:** L × B (one row per link)

**Construction rules:**
- `B[i][j] = +1` for the **link** that defines f-loop i
- `B[i][j] = +1` if tree branch j has **same direction** as the link
- `B[i][j] = -1` if tree branch j has **opposite direction** to the link
- `B[i][j] = 0` if branch j is not part of f-loop i

**Properties:**
- Each f-loop contains **only one link** and one or more tree branches
- Number of f-loops = Number of links = L

**Application:**
```
B * V_B = 0           (Kirchhoff's Voltage Law)
J_B = B^T * I_L       (Loop transformation equation)
```

### 3. Cut-Set Matrix (C)

The cut-set matrix represents fundamental cut-sets (f-cut sets).

**Size:** T × B (one row per twig)

**Construction rules:**
- `C[i][j] = +1` for the **twig** that defines f-cut set i
- `C[i][j] = +1` if link j has **same direction** as the twig current
- `C[i][j] = -1` if link j has **opposite direction** to the twig current
- `C[i][j] = 0` if branch j is not part of f-cut set i

**Properties:**
- Each f-cut set contains **only one twig** and one or more links
- Number of f-cut sets = Number of twigs = T = N - 1

**Relationship:**
```
C_L = -B_T^T    (Cut-set links = negative transpose of tie-set twigs)
```

## Branch Constitutive Relations

### General Branch Model

A general network branch contains:
- Voltage source `E_B` in series with impedance `Z_B`
- This combination in parallel with current source `I_B`

### Impedance Form (Voltage-Current Relation)

```
V_B = (J_B + I_B) * Z_B - E_B
```

**Matrix form:**
```
V_B = Z_B * (J_B + I_B) - E_B
```

Where:
- `V_B` - Branch voltage vector (B × 1)
- `J_B` - Branch current vector (B × 1)
- `I_B` - Branch current source vector (B × 1)
- `E_B` - Branch voltage source vector (B × 1)
- `Z_B` - Branch impedance matrix (B × B, diagonal)

**Branch impedance values:**
- Resistor: `Z_B[i][i] = R` (resistance)
- Voltage source: `Z_B[i][i] = 0` (ideal)
- Current source: `Z_B[i][i] = 0` (handled via `I_B`)

### Admittance Form (Current-Voltage Relation)

```
J_B = Y_B * (V_B + E_B) - I_B
```

**Matrix form:**
```
J_B = Y_B * V_B + Y_B * E_B - I_B
```

Where:
- `Y_B` - Branch admittance matrix (B × B, diagonal)

**Branch admittance values:**
- Resistor: `Y_B[i][i] = 1/R` (conductance)
- Voltage source: `Y_B[i][i] = 0` (handled via `E_B`)
- Current source: `Y_B[i][i] = 0` (handled via `I_B`)

## Loop Analysis (Tie-Set Method)

### Derivation

Starting with branch voltage-current relation:
```
V_B = Z_B * (J_B + I_B) - E_B    ... (1)
```

Apply KVL using tie-set matrix:
```
B * V_B = 0    ... (2)
```

Loop transformation equation:
```
J_B = B^T * I_L    ... (3)
```

Substitute (1) into (2):
```
B * Z_B * (J_B + I_B) - B * E_B = 0    ... (4)
```

Substitute (3) into (4):
```
B * Z_B * B^T * I_L + B * Z_B * I_B - B * E_B = 0
```

### Final Loop Equation

```
B * Z_B * B^T * I_L = B * E_B - B * Z_B * I_B
```

Or in compact form:
```
Z_loop * I_L = E_loop
```

Where:
- `Z_loop = B * Z_B * B^T` (Loop impedance matrix, L × L)
- `E_loop = B * E_B - B * Z_B * I_B` (Loop voltage vector, L × 1)
- `I_L` (Loop current vector, L × 1)

### Solution Steps

1. Build `Z_loop = B * Z_B * B^T`
2. Build `E_loop = B * E_B - B * Z_B * I_B`
3. Solve `Z_loop * I_L = E_loop` for `I_L`
4. Calculate `J_B = B^T * I_L`
5. Calculate `V_B = Z_B * (J_B + I_B) - E_B`

## Nodal Analysis (Cut-Set Method)

### Derivation

Starting with branch current-voltage relation:
```
J_B = Y_B * V_B + Y_B * E_B - I_B    ... (7)
```

Apply KCL using cut-set matrix (or incidence matrix):
```
C * J_B = 0    ... (5)
```

Branch voltage relation:
```
V_B = C^T * E_N    ... (6)
```

(Or using incidence matrix: `V_B = A^T * E_N`)

Substitute (7) into (5):
```
C * Y_B * V_B + C * Y_B * E_B - C * I_B = 0    ... (8)
```

Substitute (6) into (8):
```
C * Y_B * C^T * E_N = C * (I_B - Y_B * E_B)
```

### Final Nodal Equation

```
C * Y_B * C^T * E_N = C * (I_B - Y_B * E_B)
```

Or using incidence matrix:
```
A * Y_B * A^T * E_N = A * (I_B - Y_B * E_B)
```

In compact form:
```
Y_node * E_N = I_node
```

Where:
- `Y_node = A * Y_B * A^T` (Node admittance matrix, (N-1) × (N-1))
- `I_node = A * (I_B - Y_B * E_B)` (Node current vector, (N-1) × 1)
- `E_N` (Node voltage vector, (N-1) × 1)

### Solution Steps

1. Build `Y_node = A * Y_B * A^T`
2. Build `I_node = A * (I_B - Y_B * E_B)`
3. Solve `Y_node * E_N = I_node` for `E_N`
4. Calculate `V_B = A^T * E_N`
5. Calculate `J_B = Y_B * V_B + Y_B * E_B - I_B`

## Matrix Relationships

### Between Topology Matrices

```
C_L = -B_T^T
```

Where:
- `C_L` - Link columns of cut-set matrix
- `B_T` - Twig columns of tie-set matrix

### Using Incidence Matrix

```
C = A_T^(-1) * A
```

Where:
- `A_T` - Twig columns of incidence matrix
- `A` - Full incidence matrix

## Kirchhoff's Laws

### KCL (Kirchhoff's Current Law)

```
A * J_B = 0
```

The algebraic sum of currents at each node is zero.

### KVL (Kirchhoff's Voltage Law)

```
B * V_B = 0
```

The algebraic sum of voltages around each loop is zero.

## Summary

The circuit analysis methods are based on:

1. **Graph theory** - Representing circuits as directed graphs
2. **Topology matrices** - Encoding circuit structure (A, B, C)
3. **Branch relations** - Ohm's law and source models
4. **Kirchhoff's laws** - KCL and KVL constraints
5. **Matrix formulation** - Converting to linear systems
6. **Linear algebra** - Solving for unknowns

Both methods produce the same final results (branch voltages and currents) but use different intermediate variables:
- **Loop analysis** solves for loop currents `I_L`
- **Nodal analysis** solves for node voltages `E_N`
