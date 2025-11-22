/**
 * 🔍 Handles clicks on loop/cut-set definitions.
 *
 * When a user clicks on a loop or cut-set in the info panel,
 * this function highlights the corresponding branches in the graph
 * and scrolls the element into view.
 */

import type { GraphVisualizationData } from "../../../contexts/PresentationContext";
import { logger } from "../../../utils/logger";

/**
 * 🔍 Finds loop branches by element ID.
 */
function findLoopBranches(
  elementId: string,
  loopDefinitions: Array<{ id: string; branchIds: string[] }> | undefined
): string[] | null {
  if (!loopDefinitions) {
    return null;
  }

  const loop = loopDefinitions.find(l => l.id === elementId);
  return loop ? loop.branchIds : null;
}

/**
 * 🔍 Finds cut-set branches by element ID.
 */
function findCutSetBranches(
  elementId: string,
  cutSetDefinitions: Array<{ id: string; branchIds: string[] }> | undefined
): string[] | null {
  if (!cutSetDefinitions) {
    return null;
  }

  const cutSet = cutSetDefinitions.find(c => c.id === elementId);
  return cutSet ? cutSet.branchIds : null;
}

/**
 * 🔍 Attempts to find and log branches for a given mode.
 *
 * @returns Branch IDs if found, null otherwise
 */
function tryFindBranches(
  elementId: string,
  findFn: (elementId: string) => string[] | null,
  logLabel: string
): string[] | null {
  const branches = findFn(elementId);
  if (branches) {
    logger.debug({ caller: "handleDefinitionClick" }, `Highlighting ${logLabel} branches`, {
      [`${logLabel}Id`]: elementId,
      branchCount: branches.length,
    });
  }
  return branches;
}

/**
 * 🔍 Finds branches based on visualization mode.
 *
 * @returns Branch IDs if found, null otherwise
 */
function findBranchesByMode(elementId: string, visualizationData: GraphVisualizationData): string[] | null {
  if (visualizationData.mode === "loops") {
    return tryFindBranches(elementId, id => findLoopBranches(id, visualizationData.loopDefinitions), "loop");
  }

  if (visualizationData.mode === "cutsets") {
    return tryFindBranches(elementId, id => findCutSetBranches(id, visualizationData.cutSetDefinitions), "cut-set");
  }

  return null;
}

/**
 * 🔍 Handles click on a loop or cut-set definition.
 *
 * Extracts the branch IDs from the definition and returns them
 * for highlighting in the graph.
 *
 * @param elementId - ID of the clicked loop or cut-set
 * @param visualizationData - Current visualization data
 * @returns Array of branch IDs to highlight
 */
export function handleDefinitionClick(elementId: string, visualizationData: GraphVisualizationData): string[] {
  const caller = "handleDefinitionClick";

  logger.debug({ caller }, "Definition clicked", { elementId, mode: visualizationData.mode });

  // Try to find branches based on mode
  const branches = findBranchesByMode(elementId, visualizationData);

  if (branches) {
    return branches;
  }

  // If element is a branch ID, just return it
  logger.debug({ caller }, "Highlighting single element", { elementId });
  return [elementId];
}
