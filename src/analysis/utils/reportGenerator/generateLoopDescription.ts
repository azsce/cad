/**
 * 🔄 Loop description generator.
 * Creates human-readable descriptions of fundamental loops for visualization.
 */

import type { AnalysisGraph, SpanningTree } from '../../../types/analysis';

/**
 * Generates a human-readable description of a fundamental loop.
 * 
 * A fundamental loop is defined by a single link (co-tree branch) and
 * the unique path through the spanning tree that connects its endpoints.
 * 
 * @param loopIndex - Index of the loop (0-based)
 * @param graph - The analysis graph
 * @returns Human-readable loop description
 * 
 * @example
 * ```typescript
 * const description = generateLoopDescription(0, graph);
 * // Returns: "Loop 1: a → b → c (link: a)"
 * ```
 */
export function generateLoopDescription(
  loopIndex: number,
  graph: AnalysisGraph
): string {
  const selectedTree = getSelectedTree(graph);
  const loopNumber = loopIndex + 1;
  
  if (!selectedTree) {
    return `Loop ${String(loopNumber)}: No spanning tree selected`;
  }
  
  // Each fundamental loop is defined by one link
  if (loopIndex >= selectedTree.linkBranchIds.length) {
    return `Loop ${String(loopNumber)}: Invalid loop index`;
  }
  
  const linkId = selectedTree.linkBranchIds[loopIndex];
  
  if (!linkId) {
    return `Loop ${String(loopNumber)}: Link ID not found`;
  }
  
  const linkBranch = graph.branches.find(b => b.id === linkId);
  
  if (!linkBranch) {
    return `Loop ${String(loopNumber)}: Link branch not found`;
  }
  
  // Get branch label (a, b, c, ...)
  const linkLabel = getBranchLabel(graph, linkId) ?? '?';
  
  // For now, provide a simple description
  // In a full implementation, we would trace the path through the tree
  return `Loop ${String(loopNumber)}: Fundamental loop defined by link ${linkLabel}`;
}

/**
 * Generates a detailed loop description with branch directions.
 * 
 * @param loopIndex - Index of the loop (0-based)
 * @param graph - The analysis graph
 * @param branchDirections - Map of branch IDs to their direction in the loop ('forward' | 'reverse')
 * @returns Detailed loop description with arrows
 * 
 * @example
 * ```typescript
 * const directions = new Map([['a', 'forward'], ['b', 'reverse']]);
 * const description = generateDetailedLoopDescription(0, graph, directions);
 * // Returns: "Loop 1: a → b̄ (link: a)"
 * ```
 */
export function generateDetailedLoopDescription(
  loopIndex: number,
  graph: AnalysisGraph,
  branchDirections: Map<string, 'forward' | 'reverse'>
): string {
  const selectedTree = getSelectedTree(graph);
  const loopNumber = loopIndex + 1;
  
  if (!selectedTree) {
    return `Loop ${String(loopNumber)}: No spanning tree selected`;
  }
  
  if (loopIndex >= selectedTree.linkBranchIds.length) {
    return `Loop ${String(loopNumber)}: Invalid loop index`;
  }
  
  const linkId = selectedTree.linkBranchIds[loopIndex];
  
  if (!linkId) {
    return `Loop ${String(loopNumber)}: Link ID not found`;
  }
  
  const linkLabel = getBranchLabel(graph, linkId) ?? '?';
  
  // Build the loop path description
  const pathParts: string[] = [];
  
  for (const [branchId, direction] of branchDirections.entries()) {
    const label = getBranchLabel(graph, branchId) ?? '?';
    
    if (direction === 'reverse') {
      pathParts.push(`${label}̄`); // Add overbar for reverse direction
    } else {
      pathParts.push(label);
    }
  }
  
  const pathDescription = pathParts.join(' → ');
  
  return `Loop ${String(loopNumber)}: ${pathDescription} (link: ${linkLabel})`;
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
 * Generates a color indicator for a loop.
 * 
 * @param loopIndex - Index of the loop (0-based)
 * @returns CSS color string
 */
export function getLoopColor(loopIndex: number): string {
  const colors = [
    '#E74C3C', // Red
    '#9B59B6', // Purple
    '#F39C12', // Orange
    '#1ABC9C', // Turquoise
    '#3498DB', // Blue
    '#E67E22', // Dark Orange
    '#2ECC71', // Green
    '#F1C40F', // Yellow
  ];
  
  const color = colors[loopIndex % colors.length];
  return color ?? '#E74C3C';
}
