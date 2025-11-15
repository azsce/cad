/**
 * 🏗️ Build the reduced incidence matrix (A) for nodal analysis.
 *
 * The incidence matrix represents the topology of the circuit graph:
 * - Rows: Non-reference nodes (N-1 rows, reference node omitted)
 * - Columns: Branches (B columns)
 * - A[i][j] = +1 if branch j current is leaving node i
 * - A[i][j] = -1 if branch j current is entering node i
 * - A[i][j] = 0 otherwise
 *
 * This is the "reduced" incidence matrix because the reference node row is omitted.
 */

import { matrix, type Matrix } from 'mathjs';
import type { AnalysisGraph } from '../../../types/analysis';
import { logger } from '../../../utils/logger';

/**
 * 🔧 Helper function to set a value in the matrix if the index is valid.
 */
function setMatrixValue(
  matrixData: number[][],
  rowIndex: number,
  colIndex: number,
  value: number
): void {
  if (rowIndex === -1) {
    return;
  }

  const row = matrixData[rowIndex];
  if (row) {
    row[colIndex] = value;
  }
}

/**
 * 🏗️ Builds the reduced incidence matrix for nodal analysis.
 *
 * @param graph - The analysis graph containing nodes and branches
 * @returns Reduced incidence matrix A of size (N-1) × B
 */
export function buildIncidenceMatrix(graph: AnalysisGraph): Matrix {
  const caller = 'buildIncidenceMatrix';

  // Get non-reference nodes (exclude reference node)
  const nonRefNodes = graph.nodes.filter(
    (node) => node.id !== graph.referenceNodeId
  );
  const numNodes = nonRefNodes.length; // N-1
  const numBranches = graph.branches.length; // B

  logger.debug({ caller }, 'Building incidence matrix', {
    numNodes,
    numBranches,
    referenceNodeId: graph.referenceNodeId,
  });

  // Initialize matrix with zeros
  const matrixData: number[][] = Array.from({ length: numNodes }, () =>
    Array.from({ length: numBranches }, () => 0)
  );

  // Fill the incidence matrix
  graph.branches.forEach((branch, branchIndex) => {
    const fromNodeIndex = nonRefNodes.findIndex(
      (node) => node.id === branch.fromNodeId
    );
    const toNodeIndex = nonRefNodes.findIndex(
      (node) => node.id === branch.toNodeId
    );

    // Set +1 if branch leaves a non-reference node
    setMatrixValue(matrixData, fromNodeIndex, branchIndex, 1);

    // Set -1 if branch enters a non-reference node
    setMatrixValue(matrixData, toNodeIndex, branchIndex, -1);
  });

  const incidenceMatrix = matrix(matrixData);

  logger.debug({ caller }, 'Incidence matrix built', {
    size: `${String(numNodes)}×${String(numBranches)}`,
  });

  return incidenceMatrix;
}
