/**
 * Spanning Tree View Component (Placeholder)
 * 
 * Placeholder for future spanning tree visualization.
 * Will be implemented in a future spec to show twigs and links.
 */

import React from "react";
import type { LayoutGraph } from "../types";
import type { BranchId, NodeId } from "../../../../types/analysis";

/**
 * Props for the SpanningTreeView component
 */
export interface SpanningTreeViewProps {
  /** The geometric graph layout to render */
  layoutGraph: LayoutGraph;
  /** Set of branch IDs that are twigs in the selected spanning tree */
  twigBranchIds: Set<BranchId>;
  /** Color for graph elements */
  color: string;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: NodeId) => void;
  /** Callback when an edge is clicked */
  onEdgeClick?: (branchId: BranchId) => void;
}

/**
 * 🌳 Placeholder for spanning tree visualization.
 * 
 * This component will be implemented in a future spec to show
 * the spanning tree with twigs (solid lines) and links (dashed lines).
 */
export const SpanningTreeView: React.FC<SpanningTreeViewProps> = React.memo(({
  layoutGraph,
  twigBranchIds,
  color: _color,
}) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        padding: "2rem",
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "#666",
        }}
      >
        <h3 style={{ marginBottom: "1rem", fontSize: "1.5rem" }}>
          Spanning Tree View - To be implemented
        </h3>
        <p style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
          Layout dimensions: {layoutGraph.width.toFixed(0)} × {layoutGraph.height.toFixed(0)}
        </p>
        <p style={{ fontSize: "1rem" }}>
          Twigs: {twigBranchIds.size} | Links: {layoutGraph.edges.length - twigBranchIds.size}
        </p>
      </div>
    </div>
  );
});

SpanningTreeView.displayName = "SpanningTreeView";
