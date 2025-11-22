/**
 * 🏗️ Build the reduced incidence matrix (A) for nodal analysis.
 *
 * Incidence Matrix Construction:
 * The Incidence Matrix shows the connection of branches to nodes.
 * For each element A[node, branch]:
 * - A[i][j] = +1 if the branch current is leaving the selected node
 * - A[i][j] = -1 if the branch current is entering the selected node
 * - A[i][j] = 0 if the branch is not connected to the node
 *
 * Reduced Incidence Matrix:
 * Any node in a connected graph can be chosen as a reference node.
 * The voltages of all other nodes (referred to as buses) are measured with respect to this reference.
 * The row corresponding to this reference node is removed to create the reduced incidence matrix (A).
 *
 * KCL Application:
 * The incidence matrix is used to apply Kirchhoff's Current Law:
 * A * J_B = 0
 *
 * Matrix structure:
 * - Rows: Non-reference nodes (N-1 rows, reference node omitted)
 * - Columns: Branches (B columns)
 */

import { matrix, type Matrix } from "mathjs";
import type { AnalysisGraph } from "../../../types/analysis";
import { logger } from "../../../utils/logger";

/**
 * 🔧 Helper function to set a value in the matrix if the index is valid.
 */
function setMatrixValue(matrixData: number[][], rowIndex: number, colIndex: number, value: number): void {
  if (rowIndex === -1) {
    return;
  }

  const row = matrixData[rowIndex];
  if (row) {
    row[colIndex] = value;
  }
}

/**
 * 🏗️ Builds the reduced incidence matrix A for nodal analysis.
 *
 * @param graph - The analysis graph containing nodes and branches
 * @returns Reduced incidence matrix A of size (N-1) × B
 */
export function buildIncidenceMatrix(graph: AnalysisGraph): Matrix {
  const caller = "buildIncidenceMatrix";

  // Get non-reference nodes (exclude reference node)
  const nonRefNodes = graph.nodes.filter(node => node.id !== graph.referenceNodeId);
  const numNodes = nonRefNodes.length; // N-1
  const numBranches = graph.branches.length; // B

  logger.debug({ caller }, "Building reduced incidence matrix A", {
    numNodes,
    numBranches,
    referenceNodeId: graph.referenceNodeId,
  });

  // Initialize matrix with zeros
  const matrixData: number[][] = Array.from({ length: numNodes }, () => Array.from({ length: numBranches }, () => 0));

  // Fill the incidence matrix
  for (const [branchIndex, branch] of graph.branches.entries()) {
    const fromNodeIndex = nonRefNodes.findIndex(node => node.id === branch.fromNodeId);
    const toNodeIndex = nonRefNodes.findIndex(node => node.id === branch.toNodeId);

    // A[i][j] = +1 if branch current is leaving node i (fromNode)
    setMatrixValue(matrixData, fromNodeIndex, branchIndex, 1);

    // A[i][j] = -1 if branch current is entering node i (toNode)
    setMatrixValue(matrixData, toNodeIndex, branchIndex, -1);
  }

  const incidenceMatrix = matrix(matrixData);

  logger.debug({ caller }, "Reduced incidence matrix A built", {
    size: `${String(numNodes)}×${String(numBranches)}`,
  });

  return incidenceMatrix;
}
