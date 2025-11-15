/**
 * 🏗️ Build the tie-set matrix (B) for loop analysis.
 *
 * The tie-set matrix represents the fundamental loops of the circuit graph:
 * - Rows: Links (L = B - N + 1 rows, one per fundamental loop)
 * - Columns: Branches (B columns)
 * - B[i][j] = +1 for the link that defines loop i
 * - B[i][j] = +1 if tree branch j is in loop i with same direction as link
 * - B[i][j] = -1 if tree branch j is in loop i with opposite direction to link
 * - B[i][j] = 0 if branch j is not part of loop i
 *
 * Each row represents one fundamental loop defined by a link.
 */

import { matrix, type Matrix } from 'mathjs';
import type { AnalysisGraph } from '../../../types/analysis';
import { logger } from '../../../utils/logger';
import { traceAllFundamentalLoops } from './traceFundamentalLoop';

/**
 * 🌳 Get the selected spanning tree from the graph.
 *
 * @param graph - The analysis graph
 * @returns The selected spanning tree
 * @throws Error if selected tree is not found
 */
function getSelectedTree(graph: AnalysisGraph) {
  const tree = graph.allSpanningTrees.find(
    (t) => t.id === graph.selectedTreeId
  );

  if (!tree) {
    throw new Error(
      `Selected spanning tree not found: ${graph.selectedTreeId}`
    );
  }

  return tree;
}

/**
 * 🏗️ Builds the tie-set matrix for loop analysis.
 *
 * @param graph - The analysis graph containing nodes, branches, and spanning tree
 * @returns Tie-set matrix B of size L × B, where L = number of links
 */
export function buildTieSetMatrix(graph: AnalysisGraph): Matrix {
  const caller = 'buildTieSetMatrix';

  const tree = getSelectedTree(graph);
  const numLinks = tree.linkBranchIds.length; // L = B - N + 1
  const numBranches = graph.branches.length; // B

  logger.debug({ caller }, 'Building tie-set matrix', {
    numLinks,
    numBranches,
    treeId: tree.id,
  });

  // Initialize matrix with zeros
  const matrixData: number[][] = Array.from({ length: numLinks }, () =>
    Array.from({ length: numBranches }, () => 0)
  );

  // Trace all fundamental loops
  const fundamentalLoops = traceAllFundamentalLoops(graph, tree);

  // Fill the tie-set matrix
  fundamentalLoops.forEach((loop, loopIndex) => {
    loop.branches.forEach((branch) => {
      const branchIndex = graph.branches.findIndex((b) => b.id === branch.id);
      if (branchIndex === -1) return;

      const direction = loop.directions.get(branch.id);
      if (direction === undefined) return;

      const row = matrixData[loopIndex];
      if (row) {
        row[branchIndex] = direction;
      }
    });
  });

  const tieSetMatrix = matrix(matrixData);

  logger.debug({ caller }, 'Tie-set matrix built', {
    size: `${String(numLinks)}×${String(numBranches)}`,
  });

  return tieSetMatrix;
}
