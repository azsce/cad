/**
 * 🏗️ Build the branch impedance matrix (ZB) for loop analysis.
 *
 * The branch impedance matrix is a diagonal matrix where:
 * - ZB[i][i] = R for resistor branches (impedance = resistance)
 * - ZB[i][i] = 0 for voltage source branches (zero impedance)
 * - ZB[i][i] = 0 for current source branches (infinite impedance, treated as 0 in this formulation)
 *
 * This is used in the loop analysis formulation: Z_loop = B * ZB * B^T
 */

import { diag, type Matrix } from 'mathjs';
import type { AnalysisGraph } from '../../../types/analysis';
import { logger } from '../../../utils/logger';

/**
 * 🏗️ Builds the branch impedance matrix (diagonal).
 *
 * @param graph - The analysis graph containing branches
 * @returns Branch impedance matrix ZB of size B × B (diagonal)
 */
export function buildBranchImpedanceMatrix(graph: AnalysisGraph): Matrix {
  const caller = 'buildBranchImpedanceMatrix';

  const numBranches = graph.branches.length;

  logger.debug({ caller }, 'Building branch impedance matrix', {
    numBranches,
  });

  // Build diagonal values
  const impedances = graph.branches.map((branch) => {
    if (branch.type === 'resistor') {
      // Impedance = Resistance
      return branch.value;
    }

    // Voltage and current sources have zero impedance in this formulation
    return 0;
  });

  const impedanceMatrix = diag(impedances);

  logger.debug({ caller }, 'Branch impedance matrix built', {
    size: `${String(numBranches)}×${String(numBranches)}`,
  });

  return impedanceMatrix;
}
