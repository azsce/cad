/**
 * 🏗️ Build the branch source vectors (E_B and I_B) for nodal analysis.
 *
 * General Branch Model (Admittance Form):
 * A general network branch has the current-voltage relation:
 * J_B = Y_B(V_B + E_B) - I_B
 *
 * In matrix form:
 * J_B = Y_B * V_B + Y_B * E_B - I_B
 *
 * Where:
 * - E_B is the B × 1 branch voltage source vector
 * - I_B is the B × 1 branch current source vector
 * - J_B, V_B are B × 1 vectors (B = number of branches)
 * - Y_B is the B × B diagonal branch admittance matrix
 *
 * For nodal analysis (cut-set method), the final equation is:
 * C * Y_B * C^T * V_T = C * I_S - C * Y_B * V_S
 * Where I_S = I_B - Y_B * E_B and V_S = E_B
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
