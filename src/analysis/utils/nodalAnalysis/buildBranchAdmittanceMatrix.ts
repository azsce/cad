/**
 * 🏗️ Build the branch admittance matrix (Y_B) for nodal analysis.
 *
 * General Branch Model (Admittance Form):
 * A general network branch has the current-voltage relation:
 * J_B = Y_B(V_B + E_B) - I_B
 *
 * In matrix form for the whole network:
 * J_B = Y_B * V_B + Y_B * E_B - I_B
 *
 * Where Y_B is the B × B diagonal branch admittance matrix.
 *
 * For nodal analysis (cut-set method), this is used in:
 * C * Y_B * C^T * V_T = C * I_S - C * Y_B * V_S
 *
 * Branch admittance values:
 * - Resistor branches: Y_B[i][i] = 1/R (admittance = 1/resistance)
 * - Voltage source branches: Y_B[i][i] = 0 (handled via E_B vector in formulation)
 * - Current source branches: Y_B[i][i] = 0 (handled via I_B vector in formulation)
 */

import { diag, type Matrix } from "mathjs";
import type { AnalysisGraph } from "../../../types/analysis";
import { logger } from "../../../utils/logger";

/**
 * 🏗️ Builds the branch admittance matrix Y_B (diagonal).
 *
 * @param graph - The analysis graph containing branches
 * @returns Branch admittance matrix Y_B of size B × B (diagonal)
 */
export function buildBranchAdmittanceMatrix(graph: AnalysisGraph): Matrix {
  const caller = "buildBranchAdmittanceMatrix";

  const numBranches = graph.branches.length;

  logger.debug({ caller }, "Building branch admittance matrix Y_B", {
    numBranches,
  });

  // Build diagonal admittance values according to branch type
  const admittances = graph.branches.map(branch => {
    if (branch.type === "resistor") {
      // For resistor: Y_B = 1/R (admittance = 1/resistance)
      if (branch.value === 0) {
        logger.warn({ caller }, "Zero resistance detected", {
          branchId: branch.id,
        });
        return 0;
      }
      return 1 / branch.value;
    }

    // For voltage and current sources: Y_B = 0
    // (sources are handled via E_B and I_B vectors in the formulation)
    return 0;
  });

  const admittanceMatrix = diag(admittances);

  logger.debug({ caller }, "Branch admittance matrix Y_B built", {
    size: `${String(numBranches)}×${String(numBranches)}`,
  });

  return admittanceMatrix;
}
