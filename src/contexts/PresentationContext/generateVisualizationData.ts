/**
 * 🎨 Visualization data generator.
 * Extracts loop/cut-set definitions from analysis results for graph visualization.
 */

import type { CalculationResult, AnalysisGraph } from '../../types/analysis';
import type { GraphVisualizationData, LoopDefinition, CutSetDefinition } from './context';
import { getLoopColor } from '../../analysis/utils/reportGenerator/generateLoopDescription';
import { getCutSetColor } from '../../analysis/utils/reportGenerator/generateCutSetDescription';
import { logger } from '../../utils/logger';

/**
 * 🗺️ Generates visualization data from calculation results.
 *
 * Extracts:
 * - Loop definitions from tie-set matrix (for loop analysis)
 * - Cut-set definitions from incidence matrix (for nodal analysis)
 * - Branch results (voltages and currents)
 * - Color assignments for highlighting
 *
 * @param result - The calculation result
 * @param graph - The analysis graph
 * @returns Visualization data for graph display
 */
export function generateVisualizationData(
  result: CalculationResult,
  graph: AnalysisGraph
): GraphVisualizationData {
  const caller = 'generateVisualizationData';
  logger.info({ caller }, 'Generating visualization data', { method: result.method });

  // Extract branch results
  const branchResults = extractBranchResults(result, graph);

  // Extract loop or cut-set definitions based on method
  let loopDefinitions: LoopDefinition[] | undefined;
  let cutSetDefinitions: CutSetDefinition[] | undefined;

  if (result.method === 'loop' && result.tieSetMatrix) {
    loopDefinitions = extractLoopDefinitions(result, graph);
    logger.debug({ caller }, 'Extracted loop definitions', { count: loopDefinitions.length });
  } else if (result.method === 'nodal' && result.incidenceMatrix) {
    cutSetDefinitions = extractCutSetDefinitions(result, graph);
    logger.debug({ caller }, 'Extracted cut-set definitions', { count: cutSetDefinitions.length });
  }

  const vizData: GraphVisualizationData = {
    mode: 'graph',
    highlightedElements: [],
    branchResults,
  };

  if (loopDefinitions) {
    vizData.loopDefinitions = loopDefinitions;
  }

  if (cutSetDefinitions) {
    vizData.cutSetDefinitions = cutSetDefinitions;
  }

  return vizData;
}

/**
 * 📊 Extracts branch results (voltages and currents) from calculation result.
 */
function extractBranchResults(
  result: CalculationResult,
  graph: AnalysisGraph
): Map<string, { current: number; voltage: number }> {
  const branchResults = new Map<string, { current: number; voltage: number }>();

  const voltages = result.branchVoltages.valueOf() as number[][];
  const currents = result.branchCurrents.valueOf() as number[][];

  graph.branches.forEach((branch, index) => {
    const voltage = voltages[index]?.[0] ?? 0;
    const current = currents[index]?.[0] ?? 0;

    branchResults.set(branch.id, { current, voltage });
  });

  return branchResults;
}

/**
 * 🔄 Extracts loop definitions from tie-set matrix.
 *
 * Each row of the tie-set matrix B represents one fundamental loop.
 * B[i][j] indicates whether branch j is part of loop i and its direction.
 */
function extractLoopDefinitions(
  result: CalculationResult,
  graph: AnalysisGraph
): LoopDefinition[] {
  const caller = 'extractLoopDefinitions';

  if (!result.tieSetMatrix) {
    logger.warn({ caller }, 'No tie-set matrix available');
    return [];
  }

  const selectedTree = graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);

  if (!selectedTree) {
    logger.warn({ caller }, 'No spanning tree selected');
    return [];
  }

  const tieSetData = result.tieSetMatrix.valueOf() as number[][];
  const loopDefinitions: LoopDefinition[] = [];

  // Each row represents one fundamental loop
  tieSetData.forEach((row, loopIndex) => {
    const branchIds: string[] = [];
    const direction = new Map<string, 'forward' | 'reverse'>();

    // Check each branch
    row.forEach((value, branchIndex) => {
      if (value !== 0) {
        const branch = graph.branches[branchIndex];

        if (branch) {
          branchIds.push(branch.id);
          direction.set(branch.id, value > 0 ? 'forward' : 'reverse');
        }
      }
    });

    // Get the link that defines this loop
    const linkId = selectedTree.linkBranchIds[loopIndex];
    const linkLabel = linkId ? getBranchLabel(graph, linkId) : '?';

    loopDefinitions.push({
      id: `loop-${String(loopIndex)}`,
      branchIds,
      direction,
      color: getLoopColor(loopIndex),
      equation: `Loop ${String(loopIndex + 1)} (link: ${linkLabel})`,
    });
  });

  return loopDefinitions;
}

/**
 * ✂️ Extracts cut-set definitions from incidence matrix.
 *
 * Each row of the incidence matrix A represents one fundamental cut-set.
 * A[i][j] indicates whether branch j crosses the cut-set and its direction.
 */
function extractCutSetDefinitions(
  result: CalculationResult,
  graph: AnalysisGraph
): CutSetDefinition[] {
  const caller = 'extractCutSetDefinitions';

  if (!result.incidenceMatrix) {
    logger.warn({ caller }, 'No incidence matrix available');
    return [];
  }

  const selectedTree = graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);

  if (!selectedTree) {
    logger.warn({ caller }, 'No spanning tree selected');
    return [];
  }

  const incidenceData = result.incidenceMatrix.valueOf() as number[][];
  const cutSetDefinitions: CutSetDefinition[] = [];

  // Each row represents one fundamental cut-set (one per non-reference node)
  incidenceData.forEach((row, cutSetIndex) => {
    const branchIds: string[] = [];
    const direction = new Map<string, 'forward' | 'reverse'>();

    // Check each branch
    row.forEach((value, branchIndex) => {
      if (value !== 0) {
        const branch = graph.branches[branchIndex];

        if (branch) {
          branchIds.push(branch.id);
          direction.set(branch.id, value > 0 ? 'forward' : 'reverse');
        }
      }
    });

    // Get the twig that defines this cut-set
    const twigId = selectedTree.twigBranchIds[cutSetIndex];
    const twigLabel = twigId ? getBranchLabel(graph, twigId) : '?';

    cutSetDefinitions.push({
      id: `cutest-${String(cutSetIndex)}`,
      branchIds,
      direction,
      color: getCutSetColor(cutSetIndex),
      equation: `Cut-set ${String(cutSetIndex + 1)} (twig: ${twigLabel})`,
    });
  });

  return cutSetDefinitions;
}

/**
 * 🏷️ Gets the standard label for a branch (a, b, c, ...).
 */
function getBranchLabel(graph: AnalysisGraph, branchId: string): string {
  const index = graph.branches.findIndex(b => b.id === branchId);

  if (index === -1) {
    return '?';
  }

  return String.fromCharCode(97 + index);
}
