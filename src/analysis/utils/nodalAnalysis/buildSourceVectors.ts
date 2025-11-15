/**
 * 🏗️ Build the branch source vectors (EB and IB) for nodal analysis.
 *
 * EB: Branch voltage source vector
 * - EB[i] = voltage value for voltage source branches
 * - EB[i] = 0 for resistor and current source branches
 *
 * IB: Branch current source vector
 * - IB[i] = current value for current source branches
 * - IB[i] = 0 for resistor and voltage source branches
 *
 * These vectors represent the independent sources in the circuit.
 */

import { matrix, type Matrix } from 'mathjs';
import type { AnalysisGraph } from '../../../types/analysis';
import { logger } from '../../../utils/logger';

/**
 * 🔋 Builds the branch voltage source vector.
 *
 * @param graph - The analysis graph containing branches
 * @returns Branch voltage source vector EB of size B × 1
 */
export function buildBranchVoltageSourceVector(graph: AnalysisGraph): Matrix {
  const caller = 'buildBranchVoltageSourceVector';

  const numBranches = graph.branches.length;

  logger.debug({ caller }, 'Building branch voltage source vector', {
    numBranches,
  });

  const voltages = graph.branches.map((branch) => {
    if (branch.type === 'voltageSource') {
      return branch.value;
    }
    return 0;
  });

  // Create column vector (B × 1)
  const voltageVector = matrix(voltages.map((v) => [v]));

  logger.debug({ caller }, 'Branch voltage source vector built', {
    size: `${String(numBranches)}×1`,
  });

  return voltageVector;
}

/**
 * ⚡ Builds the branch current source vector.
 *
 * @param graph - The analysis graph containing branches
 * @returns Branch current source vector IB of size B × 1
 */
export function buildBranchCurrentSourceVector(graph: AnalysisGraph): Matrix {
  const caller = 'buildBranchCurrentSourceVector';

  const numBranches = graph.branches.length;

  logger.debug({ caller }, 'Building branch current source vector', {
    numBranches,
  });

  const currents = graph.branches.map((branch) => {
    if (branch.type === 'currentSource') {
      return branch.value;
    }
    return 0;
  });

  // Create column vector (B × 1)
  const currentVector = matrix(currents.map((i) => [i]));

  logger.debug({ caller }, 'Branch current source vector built', {
    size: `${String(numBranches)}×1`,
  });

  return currentVector;
}
