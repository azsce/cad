/**
 * 🎨 Visualization data generator.
 *
 * - Fundamental loops (f-loops): Defined by tie-set matrix B
 * - Fundamental cut-sets (f-cut sets): Defined by cut-set matrix C or incidence matrix A
 *
 * Extracts loop/cut-set definitions from analysis results for graph visualization.
 */

import type { CalculationResult, AnalysisGraph } from "../../types/analysis";
import type { GraphVisualizationData, LoopDefinition, CutSetDefinition } from "./context";
import { getLoopColor } from "../../analysis/utils/reportGenerator/generateLoopDescription";
import { getCutSetColor } from "../../analysis/utils/reportGenerator/generateCutSetDescription";
import { logger } from "../../utils/logger";

/**
 * 🗺️ Generates visualization data from calculation results.
 *
 * Extracts:
 * - f-loop definitions from tie-set matrix B (for loop analysis)
 * - f-cut set definitions from incidence matrix A (for nodal analysis)
 * - Branch results (voltages V_B and currents J_B)
 * - Color assignments for highlighting
 *
 * @param result - The calculation result
 * @param graph - The analysis graph
 * @returns Visualization data for graph display
 */
export function generateVisualizationData(result: CalculationResult, graph: AnalysisGraph): GraphVisualizationData {
  const caller = "generateVisualizationData";
  logger.info({ caller }, "Generating visualization data", { method: result.method });

  // Extract branch results
  const branchResults = extractBranchResults(result, graph);

  // Extract loop or cut-set definitions based on method
  let loopDefinitions: LoopDefinition[] | undefined;
  let cutSetDefinitions: CutSetDefinition[] | undefined;

  if (result.method === "loop" && result.tieSetMatrix) {
    loopDefinitions = extractLoopDefinitions(result, graph);
    logger.debug({ caller }, "Extracted loop definitions", { count: loopDefinitions.length });
  } else if (result.method === "nodal" && result.incidenceMatrix) {
    cutSetDefinitions = extractCutSetDefinitions(result, graph);
    logger.debug({ caller }, "Extracted cut-set definitions", { count: cutSetDefinitions.length });
  }

  const vizData: GraphVisualizationData = {
    mode: "graph",
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
 * 📊 Extracts branch results (voltages V_B and currents J_B) from calculation result.
 */
function extractBranchResults(
  result: CalculationResult,
  graph: AnalysisGraph
): Map<string, { current: number; voltage: number }> {
  const branchResults = new Map<string, { current: number; voltage: number }>();

  const voltages = result.branchVoltages.valueOf() as number[][];
  const currents = result.branchCurrents.valueOf() as number[][];

  for (const [index, branch] of graph.branches.entries()) {
    const voltage = voltages[index]?.[0] ?? 0;
    const current = currents[index]?.[0] ?? 0;

    branchResults.set(branch.id, { current, voltage });
  }

  return branchResults;
}

/**
 * 🔧 Process a single row of a matrix (tie-set or incidence) to extract branch information
 */
function processMatrixRow(
  row: number[],
  graph: AnalysisGraph
): { branchIds: string[]; direction: Map<string, "forward" | "reverse"> } {
  const branchIds: string[] = [];
  const direction = new Map<string, "forward" | "reverse">();

  for (const [branchIndex, value] of row.entries()) {
    if (value === 0) continue;

    const branch = graph.branches[branchIndex];
    if (!branch) continue;

    branchIds.push(branch.id);
    direction.set(branch.id, value > 0 ? "forward" : "reverse");
  }

  return { branchIds, direction };
}

/**
 * 🔧 Create an f-loop definition from processed data
 */
function createLoopDefinition(
  loopIndex: number,
  branchIds: string[],
  direction: Map<string, "forward" | "reverse">,
  selectedTree: import("../../types/analysis").SpanningTree,
  graph: AnalysisGraph
): LoopDefinition {
  const linkId = selectedTree.linkBranchIds[loopIndex];
  const linkLabel = linkId ? getBranchLabel(graph, linkId) : "?";

  return {
    id: `loop-${String(loopIndex)}`,
    branchIds,
    direction,
    color: getLoopColor(loopIndex),
    equation: `f-loop ${String(loopIndex + 1)} (link: ${linkLabel})`,
  };
}

/**
 * 🔄 Extracts f-loop definitions from tie-set matrix.
 *
 * Each row of the tie-set matrix B represents one fundamental loop (f-loop).
 * - B[i][j] = +1 for the link that defines f-loop i
 * - B[i][j] = +1 if tree branch j has same direction as link
 * - B[i][j] = -1 if tree branch j has opposite direction to link
 * - B[i][j] = 0 if branch j is not part of f-loop i
 */
function extractLoopDefinitions(result: CalculationResult, graph: AnalysisGraph): LoopDefinition[] {
  const caller = "extractLoopDefinitions";

  if (!result.tieSetMatrix) {
    logger.warn({ caller }, "No tie-set matrix available");
    return [];
  }

  const selectedTree = graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);

  if (!selectedTree) {
    logger.warn({ caller }, "No spanning tree selected");
    return [];
  }

  const tieSetData = result.tieSetMatrix.valueOf() as number[][];
  const loopDefinitions: LoopDefinition[] = [];

  // Each row represents one fundamental loop (f-loop)
  for (const [loopIndex, row] of tieSetData.entries()) {
    const { branchIds, direction } = processMatrixRow(row, graph);
    const loopDef = createLoopDefinition(loopIndex, branchIds, direction, selectedTree, graph);
    loopDefinitions.push(loopDef);
  }

  return loopDefinitions;
}

/**
 * 🔧 Create an f-cut set definition from processed data
 */
function createCutSetDefinition(
  cutSetIndex: number,
  branchIds: string[],
  direction: Map<string, "forward" | "reverse">,
  selectedTree: import("../../types/analysis").SpanningTree,
  graph: AnalysisGraph
): CutSetDefinition {
  const twigId = selectedTree.twigBranchIds[cutSetIndex];
  const twigLabel = twigId ? getBranchLabel(graph, twigId) : "?";

  return {
    id: `cutest-${String(cutSetIndex)}`,
    branchIds,
    direction,
    color: getCutSetColor(cutSetIndex),
    equation: `f-cut set ${String(cutSetIndex + 1)} (twig: ${twigLabel})`,
  };
}

/**
 * ✂️ Extracts f-cut set definitions from incidence matrix.
 *
 * Each row of the reduced incidence matrix A represents one fundamental cut-set (f-cut set).
 * - A[i][j] = +1 if branch j current is leaving node i
 * - A[i][j] = -1 if branch j current is entering node i
 * - A[i][j] = 0 if branch j is not connected to node i
 *
 * Each f-cut set corresponds to one non-reference node.
 */
function extractCutSetDefinitions(result: CalculationResult, graph: AnalysisGraph): CutSetDefinition[] {
  const caller = "extractCutSetDefinitions";

  if (!result.incidenceMatrix) {
    logger.warn({ caller }, "No incidence matrix available");
    return [];
  }

  const selectedTree = graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);

  if (!selectedTree) {
    logger.warn({ caller }, "No spanning tree selected");
    return [];
  }

  const incidenceData = result.incidenceMatrix.valueOf() as number[][];
  const cutSetDefinitions: CutSetDefinition[] = [];

  // Each row represents one fundamental cut-set (f-cut set) - one per non-reference node
  for (const [cutSetIndex, row] of incidenceData.entries()) {
    const { branchIds, direction } = processMatrixRow(row, graph);
    const cutSetDef = createCutSetDefinition(cutSetIndex, branchIds, direction, selectedTree, graph);
    cutSetDefinitions.push(cutSetDef);
  }

  return cutSetDefinitions;
}

/**
 * 🏷️ Gets the standard label for a branch (a, b, c, ...).
 */
function getBranchLabel(graph: AnalysisGraph, branchId: string): string {
  const index = graph.branches.findIndex(b => b.id === branchId);

  if (index === -1) {
    return "?";
  }

  return String.fromCodePoint(97 + index);
}
