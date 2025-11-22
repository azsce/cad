/**
 * 🚀 Main solver for nodal analysis using the cut-set method.
 *
 * Network Equilibrium Equations (Cut-Set Analysis):
 *
 * Current-voltage relation for a branch:
 * J_B = Y_B(V_B + E_B) - I_B
 * J_B = Y_B * V_B + Y_B * E_B - I_B  ... (7)
 *
 * KCL at nodes (using cut-set matrix C or incidence matrix A):
 * C * J_B = 0  ... (5)
 *
 * Branch voltage relation:
 * V_B = C^T * E_N  ... (6)
 * (or V_B = C^T * V_T where V_T are twig voltages)
 *
 * Substituting (7) in (5):
 * C * Y_B * V_B + C * Y_B * E_B - C * I_B = 0  ... (8)
 *
 * Substituting (6) in (8):
 * C * Y_B * C^T * E_N = C * (I_B - Y_B * E_B)
 *
 * Or equivalently:
 * C * Y_B * C^T * V_T = C * I_S - C * Y_B * V_S
 * Where I_S = I_B and V_S = E_B
 *
 * Solution process:
 * 1. Build Y_node = A * Y_B * A^T (node admittance matrix)
 * 2. Build I_node = A * (I_B - Y_B * E_B) (node current vector)
 * 3. Solve Y_node * E_N = I_node for node voltages
 * 4. Calculate V_B = A^T * E_N (branch voltages)
 * 5. Calculate J_B = Y_B * V_B + Y_B * E_B - I_B (branch currents)
 */

import { multiply, transpose, subtract, add, lusolve, matrix, type Matrix } from "mathjs";
import type { AnalysisStep } from "../../../types/analysis";
import { logger } from "../../../utils/logger";

/**
 * 🔧 Computes the node admittance matrix Y_node = A * Y_B * A^T.
 */
function computeNodeAdmittanceMatrix(A: Matrix, YB: Matrix, steps: AnalysisStep[]): Matrix {
  const caller = "computeNodeAdmittanceMatrix";
  logger.debug({ caller }, "Computing Y_node = A * Y_B * A^T");

  const AT = transpose(A);
  const YB_AT = multiply(YB, AT);
  const Y_node = multiply(A, YB_AT);

  steps.push({
    title: "Node Admittance Matrix (Y_node)",
    description: "Compute the node admittance matrix: Y_node = A × Y_B × A^T",
    matrix: Y_node,
    equation: String.raw`Y_{node} = A \cdot Y_B \cdot A^T`,
  });

  return Y_node;
}

/**
 * Parameters for computing node current vector.
 */
interface NodeCurrentVectorParams {
  A: Matrix;
  YB: Matrix;
  EB: Matrix;
  IB: Matrix;
  steps: AnalysisStep[];
}

/**
 * 🔧 Computes the node current vector I_node = A * (I_B - Y_B * E_B).
 */
function computeNodeCurrentVector(params: NodeCurrentVectorParams): Matrix {
  const { A, YB, EB, IB, steps } = params;
  const caller = "computeNodeCurrentVector";
  logger.debug({ caller }, "Computing I_node = A * (I_B - Y_B * E_B)");

  const YB_EB = multiply(YB, EB);
  const IB_minus_YB_EB = subtract(IB, YB_EB);
  const I_node = multiply(A, IB_minus_YB_EB);

  steps.push({
    title: "Node Current Vector (I_node)",
    description: "Compute the node current vector: I_node = A × (I_B - Y_B × E_B)",
    matrix: I_node,
    equation: String.raw`I_{node} = A \cdot (I_B - Y_B \cdot E_B)`,
  });

  return I_node;
}

/**
 * 🔧 Solves for node voltages E_N using LU decomposition.
 */
function solveForNodeVoltages(Y_node: Matrix, I_node: Matrix, steps: AnalysisStep[]): Matrix {
  const caller = "solveForNodeVoltages";
  logger.debug({ caller }, "Solving Y_node * E_N = I_node");

  const EN = lusolve(Y_node, I_node);

  steps.push({
    title: "Node Voltages (E_N)",
    description: "Solve the system of equations Y_node × E_N = I_node for node voltages",
    matrix: EN,
    equation: String.raw`E_N = (Y_{node})^{-1} \cdot I_{node}`,
  });

  logger.info({ caller }, "Node voltages computed successfully");

  return EN;
}

/**
 * 🔧 Computes branch voltages V_B = A^T * E_N.
 */
function computeBranchVoltages(A: Matrix, EN: Matrix, steps: AnalysisStep[]): Matrix {
  const caller = "computeBranchVoltages";
  logger.debug({ caller }, "Computing V_B = A^T * E_N");

  const AT = transpose(A);
  const VB = multiply(AT, EN);

  steps.push({
    title: "Branch Voltages (V_B)",
    description: "Compute branch voltages from node voltages: V_B = A^T × E_N",
    matrix: VB,
    equation: String.raw`V_B = A^T \cdot E_N`,
  });

  return VB;
}

/**
 * Parameters for computing branch currents.
 */
interface BranchCurrentsParams {
  YB: Matrix;
  VB: Matrix;
  EB: Matrix;
  IB: Matrix;
  steps: AnalysisStep[];
}

/**
 * 🔧 Computes branch currents J_B = Y_B * V_B + Y_B * E_B - I_B.
 */
function computeBranchCurrents(params: BranchCurrentsParams): Matrix {
  const { YB, VB, EB, IB, steps } = params;
  const caller = "computeBranchCurrents";
  logger.debug({ caller }, "Computing J_B = Y_B * V_B + Y_B * E_B - I_B");

  const YB_EB = multiply(YB, EB);
  const YB_VB = multiply(YB, VB);
  const YB_VB_plus_YB_EB = add(YB_VB, YB_EB);
  const JB = subtract(YB_VB_plus_YB_EB, IB);

  steps.push({
    title: "Branch Currents (J_B)",
    description: "Compute branch currents: J_B = Y_B × V_B + Y_B × E_B - I_B",
    matrix: JB,
    equation: String.raw`J_B = Y_B \cdot V_B + Y_B \cdot E_B - I_B`,
  });

  return JB;
}

/**
 * 🔧 Creates zero matrices for error cases.
 */
function createZeroMatrices(
  A: Matrix,
  EB: Matrix,
  IB: Matrix
): {
  zeroNodeVoltages: Matrix;
  zeroBranchVoltages: Matrix;
  zeroBranchCurrents: Matrix;
  zeroSystemMatrix: Matrix;
  zeroSystemVector: Matrix;
} {
  const aSize = A.size();
  const ebSize = EB.size();
  const ibSize = IB.size();

  const numNodes = aSize[0] ?? 0;
  const numBranches = ebSize[0] ?? 0;
  const numBranchesIB = ibSize[0] ?? 0;

  return {
    zeroNodeVoltages: matrix(Array.from({ length: numNodes }, () => [0])),
    zeroBranchVoltages: matrix(Array.from({ length: numBranches }, () => [0])),
    zeroBranchCurrents: matrix(Array.from({ length: numBranchesIB }, () => [0])),
    zeroSystemMatrix: matrix(Array.from({ length: numNodes }, () => Array.from({ length: numNodes }, () => 0))),
    zeroSystemVector: matrix(Array.from({ length: numNodes }, () => [0])),
  };
}

/**
 * Result of solving nodal equations.
 */
export interface NodalSolutionResult {
  /** Node voltages E_N (N-1 × 1) */
  nodeVoltages: Matrix;
  /** Branch voltages V_B (B × 1) */
  branchVoltages: Matrix;
  /** Branch currents J_B (B × 1) */
  branchCurrents: Matrix;
  /** System matrix Y_node = A * Y_B * A^T */
  systemMatrix: Matrix;
  /** System vector I_node = A * (I_B - Y_B * E_B) */
  systemVector: Matrix;
  /** Step-by-step analysis process */
  steps: AnalysisStep[];
  /** Error message if solving failed */
  error?: string;
}

/**
 * 🚀 Solves the nodal equations using the cut-set method.
 *
 * @param A - Reduced incidence matrix (N-1 × B)
 * @param YB - Branch admittance matrix Y_B (B × B, diagonal)
 * @param EB - Branch voltage source vector E_B (B × 1)
 * @param IB - Branch current source vector I_B (B × 1)
 * @returns Solution containing node voltages, branch voltages, and branch currents
 */
export function solveNodalEquations(A: Matrix, YB: Matrix, EB: Matrix, IB: Matrix): NodalSolutionResult {
  const caller = "solveNodalEquations";
  const steps: AnalysisStep[] = [];

  logger.info({ caller }, "Starting nodal analysis solution");

  try {
    // Step 1: Build node admittance matrix
    const Y_node = computeNodeAdmittanceMatrix(A, YB, steps);

    // Step 2: Build node current vector
    const I_node = computeNodeCurrentVector({ A, YB, EB, IB, steps });

    // Step 3: Solve for node voltages
    const EN = solveForNodeVoltages(Y_node, I_node, steps);

    // Step 4: Calculate branch voltages
    const VB = computeBranchVoltages(A, EN, steps);

    // Step 5: Calculate branch currents
    const JB = computeBranchCurrents({ YB, VB, EB, IB, steps });

    logger.info({ caller }, "Nodal analysis completed successfully");

    return {
      nodeVoltages: EN,
      branchVoltages: VB,
      branchCurrents: JB,
      systemMatrix: Y_node,
      systemVector: I_node,
      steps,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error({ caller }, "Failed to solve nodal equations", error);

    steps.push({
      title: "Error",
      description: `Failed to solve the system of equations: ${errorMessage}`,
      equation: "",
    });

    const zeroMatrices = createZeroMatrices(A, EB, IB);

    return {
      nodeVoltages: zeroMatrices.zeroNodeVoltages,
      branchVoltages: zeroMatrices.zeroBranchVoltages,
      branchCurrents: zeroMatrices.zeroBranchCurrents,
      systemMatrix: zeroMatrices.zeroSystemMatrix,
      systemVector: zeroMatrices.zeroSystemVector,
      steps,
      error: errorMessage,
    };
  }
}

/**
 * 🔍 Extracts error message from unknown error type.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
