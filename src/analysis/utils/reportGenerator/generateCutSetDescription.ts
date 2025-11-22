/**
 * ✂️ Cut-set description generator.
 *
 * Fundamental Cut-set Matrix:
 * A fundamental cut-set (f-cut set) is the minimum number of branches removed from a graph
 * to create two isolated subgraphs. The f-cut set contains only one twig (tree branch)
 * and one or more links.
 *
 * The cut-set matrix (C) gives the relation between branch voltages and twig voltages.
 * Each row represents one f-cut set defined by a twig.
 *
 * Creates human-readable descriptions of fundamental cut-sets for visualization.
 */

import type { AnalysisGraph, SpanningTree } from "../../../types/analysis";

/**
 * Generates a human-readable description of a fundamental cut-set (f-cut set).
 *
 * A fundamental cut-set is defined by a single twig (tree branch) and consists of
 * that twig plus all links that are cut when the twig is removed, separating the
 * graph into two isolated subgraphs.
 *
 * @param cutSetIndex - Index of the f-cut set (0-based)
 * @param graph - The analysis graph
 * @returns Human-readable f-cut set description
 *
 * @example
 * ```typescript
 * const description = generateCutSetDescription(0, graph);
 * // Returns: "f-cut set 1: Defined by twig a"
 * ```
 */
export function generateCutSetDescription(cutSetIndex: number, graph: AnalysisGraph): string {
  const selectedTree = getSelectedTree(graph);
  const cutSetNumber = cutSetIndex + 1;

  if (!selectedTree) {
    return `f-cut set ${String(cutSetNumber)}: No spanning tree selected`;
  }

  // Each fundamental cut-set (f-cut set) is defined by one twig
  if (cutSetIndex >= selectedTree.twigBranchIds.length) {
    return `f-cut set ${String(cutSetNumber)}: Invalid cut-set index`;
  }

  const twigId = selectedTree.twigBranchIds[cutSetIndex];

  if (!twigId) {
    return `f-cut set ${String(cutSetNumber)}: Twig ID not found`;
  }

  const twigBranch = graph.branches.find(b => b.id === twigId);

  if (!twigBranch) {
    return `f-cut set ${String(cutSetNumber)}: Twig branch not found`;
  }

  // Get branch label (a, b, c, ...)
  const twigLabel = getBranchLabel(graph, twigId) ?? "?";

  return `f-cut set ${String(cutSetNumber)}: Defined by twig ${twigLabel}`;
}

/**
 * Generates a detailed f-cut set description with branch directions.
 *
 * Cut-set Matrix Construction:
 * For each f-cut set:
 * - Assign +1 for the twig that defines the f-cut set
 * - If a link's current has the same direction as the twig current, assign +1
 * - If a link's current has the opposite direction to the twig current, assign -1
 *
 * @param cutSetIndex - Index of the f-cut set (0-based)
 * @param graph - The analysis graph
 * @param branchDirections - Map of branch IDs to their direction in the f-cut set ('forward' | 'reverse')
 * @returns Detailed f-cut set description
 *
 * @example
 * ```typescript
 * const directions = new Map([['a', 'forward'], ['b', 'reverse']]);
 * const description = generateDetailedCutSetDescription(0, graph, directions);
 * // Returns: "f-cut set 1: a, b̄ (twig: a)"
 * ```
 */
export function generateDetailedCutSetDescription(
  cutSetIndex: number,
  graph: AnalysisGraph,
  branchDirections: Map<string, "forward" | "reverse">
): string {
  const selectedTree = getSelectedTree(graph);
  const cutSetNumber = cutSetIndex + 1;

  if (!selectedTree) {
    return `f-cut set ${String(cutSetNumber)}: No spanning tree selected`;
  }

  if (cutSetIndex >= selectedTree.twigBranchIds.length) {
    return `f-cut set ${String(cutSetNumber)}: Invalid cut-set index`;
  }

  const twigId = selectedTree.twigBranchIds[cutSetIndex];

  if (!twigId) {
    return `f-cut set ${String(cutSetNumber)}: Twig ID not found`;
  }

  const twigLabel = getBranchLabel(graph, twigId) ?? "?";

  // Build the f-cut set branches description
  const branchParts: string[] = [];

  for (const [branchId, direction] of branchDirections.entries()) {
    const label = getBranchLabel(graph, branchId) ?? "?";

    if (direction === "reverse") {
      branchParts.push(`${label}̄`); // Add overbar for reverse direction
    } else {
      branchParts.push(label);
    }
  }

  const branchesDescription = branchParts.join(", ");

  return `f-cut set ${String(cutSetNumber)}: ${branchesDescription} (twig: ${twigLabel})`;
}

/**
 * 🌳 Gets the selected spanning tree from the graph.
 */
function getSelectedTree(graph: AnalysisGraph): SpanningTree | undefined {
  return graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);
}

/**
 * 🏷️ Gets the standard label for a branch (a, b, c, ...).
 */
function getBranchLabel(graph: AnalysisGraph, branchId: string): string | undefined {
  const index = graph.branches.findIndex(b => b.id === branchId);

  if (index === -1) {
    return undefined;
  }

  // Convert index to letter (0 -> a, 1 -> b, etc.)
  return String.fromCodePoint(97 + index);
}

/**
 * Generates a color indicator for a fundamental cut-set (f-cut set).
 *
 * @param cutSetIndex - Index of the f-cut set (0-based)
 * @returns CSS color string
 */
export function getCutSetColor(cutSetIndex: number): string {
  const colors = [
    "#3498DB", // Blue
    "#E67E22", // Orange
    "#2ECC71", // Green
    "#9B59B6", // Purple
    "#E74C3C", // Red
    "#1ABC9C", // Turquoise
    "#F39C12", // Yellow-Orange
    "#34495E", // Dark Gray
  ];

  const color = colors[cutSetIndex % colors.length];
  return color ?? "#3498DB";
}
