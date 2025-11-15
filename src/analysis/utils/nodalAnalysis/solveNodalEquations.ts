/**
 * 🚀 Main solver for nodal analysis using the cut-set method.
 *
 * Solution process:
 * 1. Build Y_node = A * YB * A^T (node admittance matrix)
 * 2. Build I_node = A * (IB - YB * EB) (node current vector)
 * 3. Solve EN = lusolve(Y_node, I_node) for node voltages
 * 4. Calculate VB = A^T * EN (branch voltages)
 * 5. Calculate JB = YB * VB + YB * EB - IB (branch currents)
 *
 * This implements the nodal analysis formulation from circuit theory.
 */

import {
  multiply,
  transpose,
  subtract,
  add,
  lusolve,
  matrix,
  type Matrix,
} from 'mathjs';
import type { AnalysisStep } from '../../../types/analysis';
import { logger } from '../../../utils/logger';

/**
 * 🔧 Computes the node admittance matrix Y_node = A * YB * A^T.
 */
function computeNodeAdmittanceMatrix(
  A: Matrix,
  YB: Matrix,
  steps: AnalysisStep[]
): Matrix {
  const caller = 'computeNodeAdmittanceMatrix';
  logger.debug({ caller }, 'Computing Y_node = A * YB * A^T');

  const AT = transpose(A);
  const YB_AT = multiply(YB, AT);
  const Y_node = multiply(A, YB_AT);

  steps.push({
    title: 'Node Admittance Matrix',
    description: 'Compute the node admittance matrix: Y_node = A × YB × A^T',
    matrix: Y_node,
    equation: 'Y_{node} = A \\cdot Y_B \\cdot A^T',
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
 * 🔧 Computes the node current vector I_node = A * (IB - YB * EB).
 */
function computeNodeCurrentVector(params: NodeCurrentVectorParams): Matrix {
  const { A, YB, EB, IB, steps } = params;
  const caller = 'computeNodeCurrentVector';
  logger.debug({ caller }, 'Computing I_node = A * (IB - YB * EB)');

  const YB_EB = multiply(YB, EB);
  const IB_minus_YB_EB = subtract(IB, YB_EB);
  const I_node = multiply(A, IB_minus_YB_EB);

  steps.push({
    title: 'Node Current Vector',
    description:
      'Compute the node current vector: I_node = A × (IB - YB × EB)',
    matrix: I_node,
    equation: 'I_{node} = A \\cdot (I_B - Y_B \\cdot E_B)',
  });

  return I_node;
}

/**
 * 🔧 Solves for node voltages EN using resolve.
 */
function solveForNodeVoltages(
  Y_node: Matrix,
  I_node: Matrix,
  steps: AnalysisStep[]
): Matrix {
  const caller = 'solveForNodeVoltages';
  logger.debug({ caller }, 'Solving Y_node * EN = I_node');

  const EN = lusolve(Y_node, I_node);

  steps.push({
    title: 'Node Voltages',
    description:
      'Solve the system of equations Y_node × EN = I_node for node voltages',
    matrix: EN,
    equation: 'E_N = (Y_{node})^{-1} \\cdot I_{node}',
  });

  logger.info({ caller }, 'Node voltages computed successfully');

  return EN;
}

/**
 * 🔧 Computes branch voltages VB = A^T * EN.
 */
function computeBranchVoltages(
  A: Matrix,
  EN: Matrix,
  steps: AnalysisStep[]
): Matrix {
  const caller = 'computeBranchVoltages';
  logger.debug({ caller }, 'Computing VB = A^T * EN');

  const AT = transpose(A);
  const VB = multiply(AT, EN);

  steps.push({
    title: 'Branch Voltages',
    description: 'Compute branch voltages from node voltages: VB = A^T × EN',
    matrix: VB,
    equation: 'V_B = A^T \\cdot E_N',
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
 * 🔧 Computes branch currents JB = YB * VB + YB * EB - IB.
 */
function computeBranchCurrents(params: BranchCurrentsParams): Matrix {
  const { YB, VB, EB, IB, steps } = params;
  const caller = 'computeBranchCurrents';
  logger.debug({ caller }, 'Computing JB = YB * VB + YB * EB - IB');

  const YB_EB = multiply(YB, EB);
  const YB_VB = multiply(YB, VB);
  const YB_VB_plus_YB_EB = add(YB_VB, YB_EB);
  const JB = subtract(YB_VB_plus_YB_EB, IB);

  steps.push({
    title: 'Branch Currents',
    description: 'Compute branch currents: JB = YB × VB + YB × EB - IB',
    matrix: JB,
    equation: 'J_B = Y_B \\cdot V_B + Y_B \\cdot E_B - I_B',
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
    zeroBranchCurrents: matrix(
      Array.from({ length: numBranchesIB }, () => [0])
    ),
    zeroSystemMatrix: matrix(
      Array.from({ length: numNodes }, () =>
        Array.from({ length: numNodes }, () => 0)
      )
    ),
    zeroSystemVector: matrix(Array.from({ length: numNodes }, () => [0])),
  };
}

/**
 * Result of solving nodal equations.
 */
export interface NodalSolutionResult {
  /** Node voltages EN (N-1 × 1) */
  nodeVoltages: Matrix;
  /** Branch voltages VB (B × 1) */
  branchVoltages: Matrix;
  /** Branch currents JB (B × 1) */
  branchCurrents: Matrix;
  /** System matrix Y_node = A * YB * A^T */
  systemMatrix: Matrix;
  /** System vector I_node = A * (IB - YB * EB) */
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
 * @param YB - Branch admittance matrix (B × B, diagonal)
 * @param EB - Branch voltage source vector (B × 1)
 * @param IB - Branch current source vector (B × 1)
 * @returns Solution containing node voltages, branch voltages, and branch currents
 */
export function solveNodalEquations(
  A: Matrix,
  YB: Matrix,
  EB: Matrix,
  IB: Matrix
): NodalSolutionResult {
  const caller = 'solveNodalEquations';
  const steps: AnalysisStep[] = [];

  logger.info({ caller }, 'Starting nodal analysis solution');

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

    logger.info({ caller }, 'Nodal analysis completed successfully');

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
    logger.error({ caller }, 'Failed to solve nodal equations', error);

    steps.push({
      title: 'Error',
      description: `Failed to solve the system of equations: ${errorMessage}`,
      equation: '',
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
