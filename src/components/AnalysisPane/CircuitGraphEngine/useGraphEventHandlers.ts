/**
 * 🎯 Custom hook for graph event handlers.
 */

import { useState, useCallback } from "react";
import type { AnalysisGraph, NodeId, BranchId } from "../../../types/analysis";
import type { TooltipData } from "./types";
import { getNodeTooltipContent, getEdgeTooltipContent } from "./CircuitGraphContainer.utils";

/**
 * Parameters for useGraphEventHandlers hook
 */
export interface UseGraphEventHandlersParams {
  readonly analysisGraph: AnalysisGraph;
  readonly onElementClick?: ((elementId: string) => void) | undefined;
}

/**
 * Return type for useGraphEventHandlers hook
 */
export interface UseGraphEventHandlersReturn {
  readonly tooltipData: TooltipData | null;
  readonly handleNodeHover: (nodeId: NodeId, event: React.MouseEvent) => void;
  readonly handleEdgeHover: (branchId: BranchId, event: React.MouseEvent) => void;
  readonly handleMouseLeave: () => void;
  readonly handleNodeClick: (nodeId: NodeId) => void;
  readonly handleEdgeClick: (branchId: BranchId) => void;
  readonly handleEmptySpaceClick: () => void;
}

/**
 * 🎯 Hook for managing graph interaction event handlers.
 */
export function useGraphEventHandlers({
  analysisGraph,
  onElementClick,
}: UseGraphEventHandlersParams): UseGraphEventHandlersReturn {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  const handleNodeHover = useCallback(
    (nodeId: NodeId, event: React.MouseEvent) => {
      const content = getNodeTooltipContent(nodeId, analysisGraph);
      setTooltipData({
        type: "node",
        position: { x: event.clientX, y: event.clientY },
        content,
      });
    },
    [analysisGraph]
  );

  const handleEdgeHover = useCallback(
    (branchId: BranchId, event: React.MouseEvent) => {
      const content = getEdgeTooltipContent(branchId, analysisGraph);
      setTooltipData({
        type: "edge",
        position: { x: event.clientX, y: event.clientY },
        content,
      });
    },
    [analysisGraph]
  );

  const handleMouseLeave = useCallback(() => {
    setTimeout(() => {
      setTooltipData(null);
    }, 100);
  }, []);

  const handleNodeClick = useCallback(
    (nodeId: NodeId) => {
      onElementClick?.(nodeId);
    },
    [onElementClick]
  );

  const handleEdgeClick = useCallback(
    (branchId: BranchId) => {
      onElementClick?.(branchId);
    },
    [onElementClick]
  );

  const handleEmptySpaceClick = useCallback(() => {
    onElementClick?.("");
  }, [onElementClick]);

  return {
    tooltipData,
    handleNodeHover,
    handleEdgeHover,
    handleMouseLeave,
    handleNodeClick,
    handleEdgeClick,
    handleEmptySpaceClick,
  };
}
