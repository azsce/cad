/**
 * 🏗️ Build the branch source vectors (E_B and I_B) for loop analysis.
 *
 * General Branch Model:
 * A general network branch contains a voltage source (E_B) and impedance (Z_B) in series,
 * which are in parallel with a current source (I_B).
 *
 * The branch voltage-current relation is:
 * V_B = (J_B + I_B)Z_B - E_B
 *
 * In matrix form:
 * V_B = Z_B(J_B + I_B) - E_B
 *
 * Where:
 * - E_B is the B × 1 branch voltage source vector
 * - I_B is the B × 1 branch current source vector
 * - V_B, J_B are B × 1 vectors (B = number of branches)
 * - Z_B is the B × B diagonal branch impedance matrix
 *
 * For loop analysis, the final equation is:
 * B * Z_B * B^T * I_L = B * E_B - B * Z_B * I_B
 *
 * E_B: Branch voltage source vector
 * - E_B[i] = voltage value for voltage source branches
 * - E_B[i] = 0 for resistor and current source branches
 *
 * I_B: Branch current source vector
 * - I_B[i] = current value for current source branches
 * - I_B[i] = 0 for resistor and voltage source branches
 */

import { matrix, type Matrix } from "mathjs";
import type { AnalysisGraph } from "../../../types/analysis";
import { logger } from "../../../utils/logger";

/**
 * 🔋 Builds the branch voltage source vector E_B.
 *
 * @param graph - The analysis graph containing branches
 * @returns Branch voltage source vector E_B of size B × 1
 */
export function buildBranchVoltageSourceVector(graph: AnalysisGraph): Matrix {
  const caller = "buildBranchVoltageSourceVector";

  const numBranches = graph.branches.length;

  logger.debug({ caller }, "Building branch voltage source vector E_B", {
    numBranches,
  });

  const voltages = graph.branches.map(branch => {
    if (branch.type === "voltageSource") {
      return branch.value;
    }
    return 0;
  });

  // Create column vector (B × 1)
  const voltageVector = matrix(voltages.map(v => [v]));

  logger.debug({ caller }, "Branch voltage source vector E_B built", {
    size: `${String(numBranches)}×1`,
  });

  return voltageVector;
}

/**
 * ⚡ Builds the branch current source vector I_B.
 *
 * @param graph - The analysis graph containing branches
 * @returns Branch current source vector I_B of size B × 1
 */
export function buildBranchCurrentSourceVector(graph: AnalysisGraph): Matrix {
  const caller = "buildBranchCurrentSourceVector";

  const numBranches = graph.branches.length;

  logger.debug({ caller }, "Building branch current source vector I_B", {
    numBranches,
  });

  const currents = graph.branches.map(branch => {
    if (branch.type === "currentSource") {
      return branch.value;
    }
    return 0;
  });

  // Create column vector (B × 1)
  const currentVector = matrix(currents.map(i => [i]));

  logger.debug({ caller }, "Branch current source vector I_B built", {
    size: `${String(numBranches)}×1`,
  });

  return currentVector;
}
