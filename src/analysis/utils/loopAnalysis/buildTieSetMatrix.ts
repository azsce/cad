/**
 * 🏗️ Build the tie-set matrix (B) for loop analysis.
 *
 * Fundamental Loop (Tie-set) Matrix:
 * A fundamental loop (f-loop) contains only one link and one or more tree branches.
 * The number of f-loops equals the number of links (L = B - N + 1).
 *
 * Matrix structure:
 * - Rows: f-loops (one for each link, L rows)
 * - Columns: All branches (B columns)
 *
 * Construction rules for each row (f-loop):
 * - B[i][j] = +1 for the link that defines f-loop i
 * - B[i][j] = +1 if tree branch j is in f-loop i with same direction as the link
 * - B[i][j] = -1 if tree branch j is in f-loop i with opposite direction to the link
 * - B[i][j] = 0 if branch j is not part of f-loop i
 *
 * - KVL: B * V_B = 0
 * - Loop transformation: J_B = B^T * I_L (relates branch currents to loop currents)
 */

import { matrix, type Matrix } from "mathjs";
import type { AnalysisGraph } from "../../../types/analysis";
import { logger } from "../../../utils/logger";
import { traceAllFundamentalLoops } from "./traceFundamentalLoop";

/**
 * 🌳 Get the selected spanning tree from the graph.
 *
 * @param graph - The analysis graph
 * @returns The selected spanning tree
 * @throws Error if selected tree is not found
 */
function getSelectedTree(graph: AnalysisGraph) {
  const tree = graph.allSpanningTrees.find(t => t.id === graph.selectedTreeId);

  if (!tree) {
    throw new Error(`Selected spanning tree not found: ${graph.selectedTreeId}`);
  }

  return tree;
}

/**
 * 🏗️ Builds the tie-set matrix B for loop analysis.
 *
 * @param graph - The analysis graph containing nodes, branches, and spanning tree
 * @returns Tie-set matrix B of size L × B, where L = number of links (B - N + 1)
 */
export function buildTieSetMatrix(graph: AnalysisGraph): Matrix {
  const caller = "buildTieSetMatrix";

  const tree = getSelectedTree(graph);
  const numLinks = tree.linkBranchIds.length; // L = B - N + 1
  const numBranches = graph.branches.length; // B

  logger.debug({ caller }, "Building tie-set matrix", {
    numLinks,
    numBranches,
    treeId: tree.id,
  });

  // Initialize matrix with zeros
  const matrixData: number[][] = Array.from({ length: numLinks }, () => Array.from({ length: numBranches }, () => 0));

  // Trace all fundamental loops
  const fundamentalLoops = traceAllFundamentalLoops(graph, tree);

  // Fill the tie-set matrix
  for (const [loopIndex, loop] of fundamentalLoops.entries()) {
    for (const branch of loop.branches) {
      const branchIndex = graph.branches.findIndex(b => b.id === branch.id);
      if (branchIndex === -1) continue;

      const direction = loop.directions.get(branch.id);
      if (direction === undefined) continue;

      const row = matrixData[loopIndex];
      if (row) {
        row[branchIndex] = direction;
      }
    }
  }

  const tieSetMatrix = matrix(matrixData);

  logger.debug({ caller }, "Tie-set matrix built", {
    size: `${String(numLinks)}×${String(numBranches)}`,
  });

  return tieSetMatrix;
}
