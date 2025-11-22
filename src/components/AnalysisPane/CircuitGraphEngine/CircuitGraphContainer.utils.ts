/**
 * 🛠️ Utility functions for CircuitGraphContainer.
 */

import type { AnalysisGraph, NodeId, BranchId } from "../../../types/analysis";
import type { LayoutGraph, TooltipData } from "./types";
import { GraphLayoutEngine } from "./engine/GraphLayoutEngine";
import { logger } from "../../../utils/logger";

const caller = "CircuitGraphContainer.utils";

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
 * 🏷️ Get type label for branch.
 */
function getBranchTypeLabel(type: string): string {
  if (type === "resistor") {
    return "Resistor";
  }
  if (type === "voltageSource") {
    return "Voltage Source";
  }
  return "Current Source";
}

/**
 * 🏷️ Get value label for branch.
 */
function getBranchValueLabel(type: string): string {
  if (type === "resistor") {
    return "Resistance";
  }
  if (type === "voltageSource") {
    return "Voltage";
  }
  return "Current";
}

/**
 * 🏷️ Get value unit for branch.
 */
function getBranchValueUnit(type: string): string {
  if (type === "resistor") {
    return "Ω";
  }
  if (type === "voltageSource") {
    return "V";
  }
  return "A";
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
    return {
      title: branchId,
      details: [],
    };
  }

  const typeLabel = getBranchTypeLabel(branch.type);
  const valueLabel = getBranchValueLabel(branch.type);
  const valueUnit = getBranchValueUnit(branch.type);

  return {
    title: branchId,
    details: [
      { label: "Type", value: typeLabel },
      { label: valueLabel, value: `${branch.value.toString()} ${valueUnit}` },
    ],
  };
}
