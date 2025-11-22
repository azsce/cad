/**
 * Basic Graph View Component
 * 
 * Renders the basic circuit graph using CircuitGraphRenderer.
 * Forwards all interaction events to parent components.
 */

import React, { useCallback } from "react";
import type { LayoutGraph } from "../types";
import type { NodeId, BranchId } from "../../../../types/analysis";
import { CircuitGraphRenderer } from "../CircuitGraphRenderer";

/**
 * Props for the BasicGraphView component
 */
export interface BasicGraphViewProps {
  /** The geometric graph layout to render */
  layoutGraph: LayoutGraph;
  /** Color for graph elements */
  color: string;
  /** Callback when a node is clicked */
  onNodeClick?: ((nodeId: NodeId) => void) | undefined;
  /** Callback when an edge is clicked */
  onEdgeClick?: ((branchId: BranchId) => void) | undefined;
  /** Callback when a node is hovered */
  onNodeHover?: ((nodeId: NodeId, event: React.MouseEvent) => void) | undefined;
  /** Callback when an edge is hovered */
  onEdgeHover?: ((branchId: BranchId, event: React.MouseEvent) => void) | undefined;
  /** Callback when mouse leaves a graph element */
  onMouseLeave?: (() => void) | undefined;
}

/**
 * 🎨 Renders the basic circuit graph view.
 * 
 * This is the default visualization mode that shows the complete
 * circuit graph without any special highlighting or overlays.
 */
export const BasicGraphView: React.FC<BasicGraphViewProps> = React.memo(({
  layoutGraph,
  color,
  onNodeClick,
  onEdgeClick,
  onNodeHover: _onNodeHover,
  onEdgeHover: _onEdgeHover,
  onMouseLeave,
}) => {
  const handleNodeClick = useCallback((nodeId: NodeId) => {
    onNodeClick?.(nodeId);
  }, [onNodeClick]);

  const handleEdgeClick = useCallback((branchId: BranchId) => {
    onEdgeClick?.(branchId);
  }, [onEdgeClick]);

  return (
    <div
      style={{ width: "100%", height: "100%" }}
      onMouseLeave={onMouseLeave}
    >
      <CircuitGraphRenderer
        graph={layoutGraph}
        color={color}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
      />
    </div>
  );
});

BasicGraphView.displayName = "BasicGraphView";
