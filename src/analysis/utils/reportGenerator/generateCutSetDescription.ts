/**
 * ✂️ Cut-set description generator.
 * Creates human-readable descriptions of fundamental cut-sets for visualization.
 */

import type { AnalysisGraph, SpanningTree } from '../../../types/analysis';

/**
 * Generates a human-readable description of a fundamental cut-set.
 * 
 * A fundamental cut-set is defined by a single twig (tree branch) and
 * consists of that twig plus all links that connect the two parts of
 * the tree when the twig is removed.
 * 
 * @param cutSetIndex - Index of the cut-set (0-based)
 * @param graph - The analysis graph
 * @returns Human-readable cut-set description
 * 
 * @example
 * ```typescript
 * const description = generateCutSetDescription(0, graph);
 * // Returns: "Cut-set 1: Defined by twig a"
 * ```
 */
export function generateCutSetDescription(
  cutSetIndex: number,
  graph: AnalysisGraph
): string {
  const selectedTree = getSelectedTree(graph);
  const cutSetNumber = cutSetIndex + 1;
  
  if (!selectedTree) {
    return `Cut-set ${String(cutSetNumber)}: No spanning tree selected`;
  }
  
  // Each fundamental cut-set is defined by one twig
  if (cutSetIndex >= selectedTree.twigBranchIds.length) {
    return `Cut-set ${String(cutSetNumber)}: Invalid cut-set index`;
  }
  
  const twigId = selectedTree.twigBranchIds[cutSetIndex];
  
  if (!twigId) {
    return `Cut-set ${String(cutSetNumber)}: Twig ID not found`;
  }
  
  const twigBranch = graph.branches.find(b => b.id === twigId);
  
  if (!twigBranch) {
    return `Cut-set ${String(cutSetNumber)}: Twig branch not found`;
  }
  
  // Get branch label (a, b, c, ...)
  const twigLabel = getBranchLabel(graph, twigId) ?? '?';
  
  return `Cut-set ${String(cutSetNumber)}: Defined by twig ${twigLabel}`;
}

/**
 * Generates a detailed cut-set description with branch directions.
 * 
 * @param cutSetIndex - Index of the cut-set (0-based)
 * @param graph - The analysis graph
 * @param branchDirections - Map of branch IDs to their direction in the cut-set ('forward' | 'reverse')
 * @returns Detailed cut-set description
 * 
 * @example
 * ```typescript
 * const directions = new Map([['a', 'forward'], ['b', 'reverse']]);
 * const description = generateDetailedCutSetDescription(0, graph, directions);
 * // Returns: "Cut-set 1: a, b̄ (twig: a)"
 * ```
 */
export function generateDetailedCutSetDescription(
  cutSetIndex: number,
  graph: AnalysisGraph,
  branchDirections: Map<string, 'forward' | 'reverse'>
): string {
  const selectedTree = getSelectedTree(graph);
  const cutSetNumber = cutSetIndex + 1;
  
  if (!selectedTree) {
    return `Cut-set ${String(cutSetNumber)}: No spanning tree selected`;
  }
  
  if (cutSetIndex >= selectedTree.twigBranchIds.length) {
    return `Cut-set ${String(cutSetNumber)}: Invalid cut-set index`;
  }
  
  const twigId = selectedTree.twigBranchIds[cutSetIndex];
  
  if (!twigId) {
    return `Cut-set ${String(cutSetNumber)}: Twig ID not found`;
  }
  
  const twigLabel = getBranchLabel(graph, twigId) ?? '?';
  
  // Build the cut-set branches description
  const branchParts: string[] = [];
  
  for (const [branchId, direction] of branchDirections.entries()) {
    const label = getBranchLabel(graph, branchId) ?? '?';
    
    if (direction === 'reverse') {
      branchParts.push(`${label}̄`); // Add overbar for reverse direction
    } else {
      branchParts.push(label);
    }
  }
  
  const branchesDescription = branchParts.join(', ');
  
  return `Cut-set ${String(cutSetNumber)}: ${branchesDescription} (twig: ${twigLabel})`;
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
  return String.fromCharCode(97 + index);
}

/**
 * Generates a color indicator for a cut-set.
 * 
 * @param cutSetIndex - Index of the cut-set (0-based)
 * @returns CSS color string
 */
export function getCutSetColor(cutSetIndex: number): string {
  const colors = [
    '#3498DB', // Blue
    '#E67E22', // Orange
    '#2ECC71', // Green
    '#9B59B6', // Purple
    '#E74C3C', // Red
    '#1ABC9C', // Turquoise
    '#F39C12', // Yellow-Orange
    '#34495E', // Dark Gray
  ];
  
  const color = colors[cutSetIndex % colors.length];
  return color ?? '#3498DB';
}
