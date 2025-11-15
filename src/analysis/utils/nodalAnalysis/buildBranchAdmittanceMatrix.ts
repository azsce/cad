/**
 * 🏗️ Build the branch admittance matrix (YB) for nodal analysis.
 *
 * The branch admittance matrix is a diagonal matrix where:
 * - YB[i][i] = 1/R for resistor branches (admittance = 1/resistance)
 * - YB[i][i] = 0 for voltage source branches (infinite impedance in admittance form)
 * - YB[i][i] = 0 for current source branches (infinite impedance in admittance form)
 *
 * This is used in the nodal analysis formulation: Y_node = A * YB * A^T
 */

import { diag, type Matrix } from 'mathjs';
import type { AnalysisGraph } from '../../../types/analysis';
import { logger } from '../../../utils/logger';

/**
 * 🏗️ Builds the branch admittance matrix (diagonal).
 *
 * @param graph - The analysis graph containing branches
 * @returns Branch admittance matrix YB of size B × B (diagonal)
 */
export function buildBranchAdmittanceMatrix(graph: AnalysisGraph): Matrix {
  const caller = 'buildBranchAdmittanceMatrix';

  const numBranches = graph.branches.length;

  logger.debug({ caller }, 'Building branch admittance matrix', {
    numBranches,
  });

  // Build diagonal values
  const admittances = graph.branches.map((branch) => {
    if (branch.type === 'resistor') {
      // Admittance = 1/Resistance
      if (branch.value === 0) {
        logger.warn({ caller }, 'Zero resistance detected', {
          branchId: branch.id,
        });
        return 0;
      }
      return 1 / branch.value;
    }

    // Voltage and current sources have zero admittance in this formulation
    return 0;
  });

  const admittanceMatrix = diag(admittances);

  logger.debug({ caller }, 'Branch admittance matrix built', {
    size: `${String(numBranches)}×${String(numBranches)}`,
  });

  return admittanceMatrix;
}
