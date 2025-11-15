/**
 * 🚀 Main solver for loop analysis using the tie-set method.
 *
 * Solution process:
 * 1. Build Z_loop = B * ZB * B^T (loop impedance matrix)
 * 2. Build E_loop = B * EB - B * ZB * IB (loop voltage vector)
 * 3. Solve IL = lusolve(Z_loop, E_loop) for loop currents
 * 4. Calculate JB = B^T * IL (branch currents)
 * 5. Calculate VB = ZB * (JB + IB) - EB (branch voltages)
 */

import { multiply, transpose, lusolve, subtract, add, type Matrix } from 'mathjs';
import type { AnalysisGraph, AnalysisStep } from '../../../types/analysis';
import { logger } from '../../../utils/logger';
import { buildTieSetMatrix } from './buildTieSetMatrix';
import { buildBranchImpedanceMatrix } from './buildBranchImpedanceMatrix';
import {
  buildBranchVoltageSourceVector,
  buildBranchCurrentSourceVector,
} from './buildSourceVectors';

/**
 * Result of loop analysis calculation.
 */
export interface LoopSolutionResult {
  /** Loop current vector IL */
  loopCurrents: Matrix;
  /** Branch current vector JB */
  branchCurrents: Matrix;
  /** Branch voltage vector VB */
  branchVoltages: Matrix;
  /** Step-by-step analysis process */
  steps: AnalysisStep[];
}

/**
 * 🧮 Calculate the loop impedance matrix: Z_loop = B * ZB * B^T
 */
function calculateLoopImpedanceMatrix(B: Matrix, ZB: Matrix): Matrix {
  const BT = transpose(B);
  const temp = multiply(B, ZB);
  return multiply(temp, BT);
}

/**
 * 🔋 Calculate the loop voltage vector: E_loop = B * EB - B * ZB * IB
 */
function calculateLoopVoltageVector(
  B: Matrix,
  ZB: Matrix,
  EB: Matrix,
  IB: Matrix
): Matrix {
  const term1 = multiply(B, EB);
  const temp = multiply(ZB, IB);
  const term2 = multiply(B, temp);
  return subtract(term1, term2);
}

/**
 * ⚡ Calculate branch currents from loop currents: JB = B^T * IL
 */
function calculateBranchCurrents(B: Matrix, IL: Matrix): Matrix {
  const BT = transpose(B);
  return multiply(BT, IL);
}

/**
 * 🔌 Calculate branch voltages: VB = ZB * (JB + IB) - EB
 */
function calculateBranchVoltages(
  ZB: Matrix,
  JB: Matrix,
  IB: Matrix,
  EB: Matrix
): Matrix {
  const sum = add(JB, IB);
  const product = multiply(ZB, sum);
  return subtract(product, EB);
}

/**
 * � Build input matrices and add steps.
 */
function buildInputMatrices(
  graph: AnalysisGraph,
  steps: AnalysisStep[]
): { B: Matrix; ZB: Matrix; EB: Matrix; IB: Matrix } {
  const B = buildTieSetMatrix(graph);
  steps.push({
    title: 'Tie-Set Matrix (B)',
    description:
      'Fundamental loop matrix. Each row represents one loop defined by a link. ' +
      'B[i][j] = +1 if branch j is in loop i with same direction, ' +
      '-1 if opposite direction, 0 otherwise.',
    matrix: B,
  });

  const ZB = buildBranchImpedanceMatrix(graph);
  steps.push({
    title: 'Branch Impedance Matrix (ZB)',
    description:
      'Diagonal matrix of branch impedances. ZB[i][i] = R for resistors, 0 for sources.',
    matrix: ZB,
  });

  const EB = buildBranchVoltageSourceVector(graph);
  const IB = buildBranchCurrentSourceVector(graph);
  steps.push({
    title: 'Branch Voltage Source Vector (EB)',
    description:
      'Vector of branch voltage sources. EB[i] = voltage for voltage sources, 0 otherwise.',
    matrix: EB,
  });
  steps.push({
    title: 'Branch Current Source Vector (IB)',
    description:
      'Vector of branch current sources. IB[i] = current for current sources, 0 otherwise.',
    matrix: IB,
  });

  return { B, ZB, EB, IB };
}

/**
 * 🔧 Build system matrices and add steps.
 */
function buildSystemMatrices(params: {
  B: Matrix;
  ZB: Matrix;
  EB: Matrix;
  IB: Matrix;
  steps: AnalysisStep[];
}): { ZLoop: Matrix; ELoop: Matrix } {
  const { B, ZB, EB, IB, steps } = params;
  const ZLoop = calculateLoopImpedanceMatrix(B, ZB);
  steps.push({
    title: 'Loop Impedance Matrix (Z_loop)',
    description: 'System matrix: Z_loop = B * ZB * B^T',
    matrix: ZLoop,
    equation: 'Z_{loop} = B \\cdot Z_B \\cdot B^T',
  });

  const ELoop = calculateLoopVoltageVector(B, ZB, EB, IB);
  steps.push({
    title: 'Loop Voltage Vector (E_loop)',
    description: 'System vector: E_loop = B * EB - B * ZB * IB',
    matrix: ELoop,
    equation: 'E_{loop} = B \\cdot E_B - B \\cdot Z_B \\cdot I_B',
  });

  return { ZLoop, ELoop };
}

/**
 * 🔧 Solve for loop currents and add step.
 */
function solveForLoopCurrents(
  ZLoop: Matrix,
  ELoop: Matrix,
  steps: AnalysisStep[],
  caller: string
): Matrix {
  logger.debug({ caller }, 'Solving system of equations');
  const IL = lusolve(ZLoop, ELoop);
  steps.push({
    title: 'Loop Currents (IL)',
    description:
      'Solution of Z_loop * IL = E_loop. Each element is the current in one fundamental loop.',
    matrix: IL,
    equation: 'Z_{loop} \\cdot I_L = E_{loop}',
  });
  return IL;
}

/**
 * 🔧 Calculate final results and add steps.
 */
function calculateFinalResults(params: {
  B: Matrix;
  ZB: Matrix;
  IL: Matrix;
  IB: Matrix;
  EB: Matrix;
  steps: AnalysisStep[];
}): { JB: Matrix; VB: Matrix } {
  const { B, ZB, IL, IB, EB, steps } = params;
  const JB = calculateBranchCurrents(B, IL);
  steps.push({
    title: 'Branch Currents (JB)',
    description: 'Branch currents calculated from loop currents: JB = B^T * IL',
    matrix: JB,
    equation: 'J_B = B^T \\cdot I_L',
  });

  const VB = calculateBranchVoltages(ZB, JB, IB, EB);
  steps.push({
    title: 'Branch Voltages (VB)',
    description: 'Branch voltages: VB = ZB * (JB + IB) - EB',
    matrix: VB,
    equation: 'V_B = Z_B \\cdot (J_B + I_B) - E_B',
  });

  return { JB, VB };
}

/**
 * 🚀 Solves the loop equations using the tie-set method.
 *
 * @param graph - The analysis graph with branches and spanning tree
 * @returns Solution containing loop currents, branch currents, and branch voltages
 * @throws Error if the system matrix is singular or if calculation fails
 */
export function solveLoopEquations(graph: AnalysisGraph): LoopSolutionResult {
  const caller = 'solveLoopEquations';

  logger.info({ caller }, 'Starting loop analysis');

  const steps: AnalysisStep[] = [];

  try {
    const { B, ZB, EB, IB } = buildInputMatrices(graph, steps);
    const { ZLoop, ELoop } = buildSystemMatrices({ B, ZB, EB, IB, steps });
    const IL = solveForLoopCurrents(ZLoop, ELoop, steps, caller);
    const { JB, VB } = calculateFinalResults({ B, ZB, IL, IB, EB, steps });

    logger.info({ caller }, 'Loop analysis completed successfully');

    return {
      loopCurrents: IL,
      branchCurrents: JB,
      branchVoltages: VB,
      steps,
    };
  } catch (error) {
    logger.error({ caller }, 'Loop analysis failed', error);

    if (error instanceof Error) {
      if (error.message.includes('singular')) {
        throw new Error(
          'System of equations is singular (cannot be solved). ' +
            'This may indicate a problem with the circuit topology or component values.'
        );
      }
      throw new Error(`Loop analysis failed: ${error.message}`);
    }

    throw new Error('Loop analysis failed with unknown error');
  }
}
