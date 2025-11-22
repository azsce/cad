# Circuit Analysis Implementation Documentation

This directory contains comprehensive documentation about how circuit analysis is implemented in the application.

## Overview

The application implements two fundamental circuit analysis methods:

1. **Nodal Analysis (Cut-Set Method)** - Solves for node voltages using the incidence matrix
2. **Loop Analysis (Tie-Set Method)** - Solves for loop currents using the tie-set matrix

## Documentation Structure

### Core Concepts
- [**overview.md**](./overview.md) - High-level architecture and data flow
- [**mathematical-foundation.md**](./mathematical-foundation.md) - Mathematical equations and theory

### Analysis Methods
- [**nodal-analysis.md**](./nodal-analysis.md) - Nodal analysis (cut-set method) implementation
- [**loop-analysis.md**](./loop-analysis.md) - Loop analysis (tie-set method) implementation

### Implementation Details
- [**graph-theory.md**](./graph-theory.md) - Graph representation and spanning trees
- [**matrix-construction.md**](./matrix-construction.md) - How matrices are built
- [**equation-solving.md**](./equation-solving.md) - System of equations solver

### Supporting Systems
- [**validation.md**](./validation.md) - Circuit validation before analysis
- [**visualization.md**](./visualization.md) - Results presentation and graph visualization
- [**report-generation.md**](./report-generation.md) - Markdown report generation with LaTeX

## Quick Start

1. Start with [overview.md](./overview.md) to understand the architecture
2. Read [mathematical-foundation.md](./mathematical-foundation.md) for the theory
3. Dive into specific analysis methods as needed
4. Refer to implementation details for code-level understanding

## Notation Conventions

### Matrices
- `A` - Reduced incidence matrix (N-1 × B)
- `B` - Tie-set matrix (L × B)
- `C` - Cut-set matrix (T × B)
- `Z_B` - Branch impedance matrix (B × B, diagonal)
- `Y_B` - Branch admittance matrix (B × B, diagonal)

### Vectors
- `V_B` - Branch voltage vector (B × 1)
- `J_B` - Branch current vector (B × 1)
- `E_B` - Branch voltage source vector (B × 1)
- `I_B` - Branch current source vector (B × 1)
- `I_L` - Loop current vector (L × 1)
- `E_N` - Node voltage vector (N-1 × 1)

### Subscripts
- `_B` - Branch
- `_L` - Loop
- `_N` - Node
- `_T` - Tree/Twig

### Terminology
- **f-loop** - Fundamental loop (contains only one link and tree branches)
- **f-cut set** - Fundamental cut-set (contains only one twig and links)
- **Twig** - Tree branch
- **Link** - Co-tree branch

## References

All implementations are based on:
- Graph Theory and Network Topology Matrices
- Relationships Between Matrices and KCL/KVL
- Network Equilibrium Equations (Loop and Cut-Set Analysis)
