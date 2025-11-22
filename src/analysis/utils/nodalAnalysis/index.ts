/**
 * Nodal Analysis (Cut-Set Method) utilities.
 *
 * This module provides functions for performing nodal analysis on electrical circuits
 * using the cut-set method with the reduced incidence matrix formulation.
 *
 * Main exports:
 * - buildIncidenceMatrix: Constructs the reduced incidence matrix A
 * - buildBranchAdmittanceMatrix: Constructs the diagonal admittance matrix YB
 * - buildBranchVoltageSourceVector: Constructs the voltage source vector EB
 * - buildBranchCurrentSourceVector: Constructs the current source vector IB
 * - solveNodalEquations: Main solver that computes node voltages and branch values
 */

export { buildIncidenceMatrix } from "./buildIncidenceMatrix";
export { buildBranchAdmittanceMatrix } from "./buildBranchAdmittanceMatrix";
export { buildBranchVoltageSourceVector, buildBranchCurrentSourceVector } from "./buildSourceVectors";
export { solveNodalEquations } from "./solveNodalEquations";
export type { NodalSolutionResult } from "./solveNodalEquations";
