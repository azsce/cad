/**
 * 🚀 Main solver for loop analysis using the tie-set method.
 *
 * Network Equilibrium Equations (Loop Analysis):
 *
 * Branch voltage-current relation:
 * V_B = (J_B + I_B)Z_B - E_B  ... (1)
 *
 * KVL for loops:
 * B * V_B = 0  ... (2)
 *
 * Loop transformation equation:
 * J_B = B^T * I_L  ... (3)
 *
 * Substituting (1) in (2):
 * B * Z_B * {J_B + I_B} - B * E_B = 0  ... (4)
 *
 * Substituting (3) in (4):
 * B * Z_B * B^T * I_L + B * Z_B * I_B - B * E_B = 0
 *
 * Final loop equation:
 * B * Z_B * B^T * I_L = B * E_B - B * Z_B * I_B
 *
 * Solution process:
 * 1. Build Z_loop = B * Z_B * B^T (loop impedance matrix)
 * 2. Build E_loop = B * E_B - B * Z_B * I_B (loop voltage vector)
 * 3. Solve Z_loop * I_L = E_loop for loop currents
 * 4. Calculate J_B = B^T * I_L (branch currents)
 * 5. Calculate V_B = Z_B * (J_B + I_B) - E_B (branch voltages)
 */

import { multiply, transpose, lusolve, subtract, add, type Matrix } from "mathjs";
import type { AnalysisGraph, AnalysisStep } from "../../../types/analysis";
import { logger } from "../../../utils/logger";
import { buildTieSetMatrix } from "./buildTieSetMatrix";
import { buildBranchImpedanceMatrix } from "./buildBranchImpedanceMatrix";
import { buildBranchVoltageSourceVector, buildBranchCurrentSourceVector } from "./buildSourceVectors";

/**
 * Result of loop analysis calculation.
 */
export interface LoopSolutionResult {
  /** Loop current vector I_L */
  loopCurrents: Matrix;
  /** Branch current vector J_B */
  branchCurrents: Matrix;
  /** Branch voltage vector V_B */
  branchVoltages: Matrix;
  /** Step-by-step analysis process */
  steps: AnalysisStep[];
}

/**
 * 🧮 Calculate the loop impedance matrix: Z_loop = B * Z_B * B^T
 */
function calculateLoopImpedanceMatrix(B: Matrix, ZB: Matrix): Matrix {
  const BT = transpose(B);
  const temp = multiply(B, ZB);
  return multiply(temp, BT);
}

/**
 * 🔋 Calculate the loop voltage vector: E_loop = B * E_B - B * Z_B * I_B
 */
function calculateLoopVoltageVector(B: Matrix, ZB: Matrix, EB: Matrix, IB: Matrix): Matrix {
  const term1 = multiply(B, EB);
  const temp = multiply(ZB, IB);
  const term2 = multiply(B, temp);
  return subtract(term1, term2);
}

/**
 * ⚡ Calculate branch currents from loop currents: J_B = B^T * I_L
 */
function calculateBranchCurrents(B: Matrix, IL: Matrix): Matrix {
  const BT = transpose(B);
  return multiply(BT, IL);
}

/**
 * 🔌 Calculate branch voltages: V_B = Z_B * (J_B + I_B) - E_B
 */
function calculateBranchVoltages(ZB: Matrix, JB: Matrix, IB: Matrix, EB: Matrix): Matrix {
  const sum = add(JB, IB);
  const product = multiply(ZB, sum);
  return subtract(product, EB);
}

/**
 * 🏗️ Build input matrices and add steps.
 */
function buildInputMatrices(
  graph: AnalysisGraph,
  steps: AnalysisStep[]
): { B: Matrix; ZB: Matrix; EB: Matrix; IB: Matrix } {
  const B = buildTieSetMatrix(graph);
  steps.push({
    title: "Tie-Set Matrix (B)",
    description:
      "Fundamental loop matrix. Each row represents one f-loop defined by a link. " +
      "B[i][j] = +1 if branch j is in loop i with same direction, " +
      "-1 if opposite direction, 0 otherwise.",
    matrix: B,
  });

  const ZB = buildBranchImpedanceMatrix(graph);
  steps.push({
    title: "Branch Impedance Matrix (Z_B)",
    description: "Diagonal matrix of branch impedances. Z_B[i][i] = R for resistors, 0 for ideal sources.",
    matrix: ZB,
  });

  const EB = buildBranchVoltageSourceVector(graph);
  const IB = buildBranchCurrentSourceVector(graph);
  steps.push(
    {
      title: "Branch Voltage Source Vector (E_B)",
      description: "Vector of branch voltage sources. E_B[i] = voltage for voltage sources, 0 otherwise.",
      matrix: EB,
    },
    {
      title: "Branch Current Source Vector (I_B)",
      description: "Vector of branch current sources. I_B[i] = current for current sources, 0 otherwise.",
      matrix: IB,
    }
  );

  return { B, ZB, EB, IB };
}

/**
 * 🔧 Build system matrices and add steps.
 */
function buildSystemMatrices(params: { B: Matrix; ZB: Matrix; EB: Matrix; IB: Matrix; steps: AnalysisStep[] }): {
  ZLoop: Matrix;
  ELoop: Matrix;
} {
  const { B, ZB, EB, IB, steps } = params;
  const ZLoop = calculateLoopImpedanceMatrix(B, ZB);
  steps.push({
    title: "Loop Impedance Matrix (Z_loop)",
    description: "System matrix: Z_loop = B * Z_B * B^T",
    matrix: ZLoop,
    equation: String.raw`Z_{loop} = B \cdot Z_B \cdot B^T`,
  });

  const ELoop = calculateLoopVoltageVector(B, ZB, EB, IB);
  steps.push({
    title: "Loop Voltage Vector (E_loop)",
    description: "System vector: E_loop = B * E_B - B * Z_B * I_B",
    matrix: ELoop,
    equation: String.raw`E_{loop} = B \cdot E_B - B \cdot Z_B \cdot I_B`,
  });

  return { ZLoop, ELoop };
}

/**
 * 🔧 Solve for loop currents and add step.
 */
function solveForLoopCurrents(ZLoop: Matrix, ELoop: Matrix, steps: AnalysisStep[], caller: string): Matrix {
  logger.debug({ caller }, "Solving system of equations");
  const IL = lusolve(ZLoop, ELoop);
  steps.push({
    title: "Loop Currents (I_L)",
    description: "Solution of Z_loop * I_L = E_loop. Each element is the current in one fundamental loop.",
    matrix: IL,
    equation: String.raw`Z_{loop} \cdot I_L = E_{loop}`,
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
    title: "Branch Currents (J_B)",
    description: "Branch currents calculated from loop currents: J_B = B^T * I_L",
    matrix: JB,
    equation: String.raw`J_B = B^T \cdot I_L`,
  });

  const VB = calculateBranchVoltages(ZB, JB, IB, EB);
  steps.push({
    title: "Branch Voltages (V_B)",
    description: "Branch voltages: V_B = Z_B * (J_B + I_B) - E_B",
    matrix: VB,
    equation: String.raw`V_B = Z_B \cdot (J_B + I_B) - E_B`,
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
  const caller = "solveLoopEquations";

  logger.info({ caller }, "Starting loop analysis");

  const steps: AnalysisStep[] = [];

  try {
    const { B, ZB, EB, IB } = buildInputMatrices(graph, steps);
    const { ZLoop, ELoop } = buildSystemMatrices({ B, ZB, EB, IB, steps });
    const IL = solveForLoopCurrents(ZLoop, ELoop, steps, caller);
    const { JB, VB } = calculateFinalResults({ B, ZB, IL, IB, EB, steps });

    logger.info({ caller }, "Loop analysis completed successfully");

    return {
      loopCurrents: IL,
      branchCurrents: JB,
      branchVoltages: VB,
      steps,
    };
  } catch (error) {
    logger.error({ caller }, "Loop analysis failed", error);

    if (error instanceof Error) {
      if (error.message.includes("singular")) {
        throw new Error(
          "System of equations is singular (cannot be solved). " +
            "This may indicate a problem with the circuit topology or component values."
        );
      }
      throw new Error(`Loop analysis failed: ${error.message}`);
    }

    throw new Error("Loop analysis failed with unknown error");
  }
}
