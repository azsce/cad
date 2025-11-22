/**
 * 🛠️ Utility functions for GraphCanvasNode.
 */

import type { AnalysisGraph, NodeId, BranchId } from "../../../types/analysis";
import type { LayoutGraph, TooltipData } from "./types";
import { GraphLayoutEngine } from "./engine/GraphLayoutEngine";
import { logger } from "../../../utils/logger";

const caller = "GraphCanvasNode.utils";

/**
 * 📐 Calculate layout graph from analysis graph.
 */
export function calculateLayoutGraph(
  analysisGraph: AnalysisGraph
): LayoutGraph | null {
  try {
    const engine = new GraphLayoutEngine();
    return engine.calculateLayout(analysisGraph);
  } catch (error: unknown) {
    logger.error({ caller }, "Failed to calculate layout", { error });
    return null;
  }
}

/**
 * 💬 Extract tooltip content for a node.
 */
export function getNodeTooltipContent(
  nodeId: NodeId,
  analysisGraph: AnalysisGraph
): TooltipData["content"] {
  const node = analysisGraph.nodes.find((n) => n.id === nodeId);
  const connectionCount = node?.connectedBranchIds.length ?? 0;

  return {
    title: nodeId,
    details: [{ label: "Connections", value: connectionCount.toString() }],
  };
}

/**
 * 💬 Extract tooltip content for an edge.
 */
export function getEdgeTooltipContent(
  branchId: BranchId,
  analysisGraph: AnalysisGraph
): TooltipData["content"] {
  const branch = analysisGraph.branches.find((b) => b.id === branchId);

  if (!branch) {
    return { title: branchId, details: [] };
  }

  const typeLabels: Record<string, string> = {
    resistor: "Resistor",
    voltageSource: "Voltage Source",
    currentSource: "Current Source",
  };

  const valueLabels: Record<string, string> = {
    resistor: "Resistance",
    voltageSource: "Voltage",
    currentSource: "Current",
  };

  const valueUnits: Record<string, string> = {
    resistor: "Ω",
    voltageSource: "V",
    currentSource: "A",
  };

  return {
    title: branchId,
    details: [
      { label: "Type", value: typeLabels[branch.type] ?? branch.type },
      {
        label: valueLabels[branch.type] ?? "Value",
        value: `${branch.value.toString()} ${valueUnits[branch.type] ?? ""}`,
      },
    ],
  };
}
