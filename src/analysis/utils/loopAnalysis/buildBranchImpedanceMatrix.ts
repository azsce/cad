/**
 * 🏗️ Build the branch impedance matrix (Z_B) for loop analysis.
 *
 * General Branch Model:
 * A general network branch contains a voltage source (E_B) and impedance (Z_B) in series,
 * which are in parallel with a current source (I_B).
 *
 * The branch voltage-current relation is:
 * V_B = (J_B + I_B)Z_B - E_B
 *
 * In matrix form for the whole network:
 * V_B = Z_B(J_B + I_B) - E_B
 *
 * Where Z_B is the B × B diagonal branch impedance matrix.
 *
 * For loop analysis, this is used in: B * Z_B * B^T * I_L = B * E_B - B * Z_B * I_B
 *
 * Branch impedance values:
 * - Resistor branches: Z_B[i][i] = R (resistance value)
 * - Voltage source branches: Z_B[i][i] = 0 (ideal voltage source has zero internal impedance)
 * - Current source branches: Z_B[i][i] = 0 (handled via I_B vector in formulation)
 */

import { diag, type Matrix } from "mathjs";
import type { AnalysisGraph } from "../../../types/analysis";
import { logger } from "../../../utils/logger";

/**
 * 🏗️ Builds the branch impedance matrix Z_B (diagonal).
 *
 * @param graph - The analysis graph containing branches
 * @returns Branch impedance matrix Z_B of size B × B (diagonal)
 */
export function buildBranchImpedanceMatrix(graph: AnalysisGraph): Matrix {
  const caller = "buildBranchImpedanceMatrix";

  const numBranches = graph.branches.length;

  logger.debug({ caller }, "Building branch impedance matrix Z_B", {
    numBranches,
  });

  // Build diagonal impedance values according to branch type
  const impedances = graph.branches.map(branch => {
    if (branch.type === "resistor") {
      // For resistor: Z_B = R (resistance value)
      return branch.value;
    }

    // For voltage and current sources: Z_B = 0
    // (ideal sources have zero internal impedance in this formulation)
    return 0;
  });

  const impedanceMatrix = diag(impedances);

  logger.debug({ caller }, "Branch impedance matrix Z_B built", {
    size: `${String(numBranches)}×${String(numBranches)}`,
  });

  return impedanceMatrix;
}
