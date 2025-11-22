/**
 * Loop Analysis (Tie-Set Method) utilities.
 *
 * This module provides functions for performing loop analysis on electrical circuits
 * using the tie-set method with the fundamental loop matrix formulation.
 *
 * Main exports:
 * - buildTieSetMatrix: Constructs the tie-set matrix B
 * - buildBranchImpedanceMatrix: Constructs the diagonal impedance matrix ZB
 * - buildBranchVoltageSourceVector: Constructs the voltage source vector EB
 * - buildBranchCurrentSourceVector: Constructs the current source vector IB
 * - solveLoopEquations: Main solver that computes loop currents and branch values
 * - traceFundamentalLoop: Helper to trace a loop through the spanning tree
 */

export { buildTieSetMatrix } from "./buildTieSetMatrix";
export { buildBranchImpedanceMatrix } from "./buildBranchImpedanceMatrix";
export { buildBranchVoltageSourceVector, buildBranchCurrentSourceVector } from "./buildSourceVectors";
export { solveLoopEquations } from "./solveLoopEquations";
export { traceFundamentalLoop } from "./traceFundamentalLoop";
export type { LoopSolutionResult } from "./solveLoopEquations";
export type { FundamentalLoop } from "./traceFundamentalLoop";
