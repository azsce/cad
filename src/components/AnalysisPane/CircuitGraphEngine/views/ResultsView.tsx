/**
 * Results View Component (Placeholder)
 * 
 * Placeholder for future results visualization.
 * Will be implemented in a future spec to show branch currents and voltages.
 */

import React from "react";
import type { LayoutGraph } from "../types";
import type { BranchId, NodeId } from "../../../../types/analysis";

/**
 * Props for the ResultsView component
 */
export interface ResultsViewProps {
  /** The geometric graph layout to render */
  layoutGraph: LayoutGraph;
  /** Branch results (current and voltage) for visualization */
  branchResults: Map<string, { current: number; voltage: number }>;
  /** Color for graph elements */
  color: string;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: NodeId) => void;
  /** Callback when an edge is clicked */
  onEdgeClick?: (branchId: BranchId) => void;
}

/**
 * 📊 Placeholder for results visualization.
 * 
 * This component will be implemented in a future spec to show
 * branch currents and voltages overlaid on the graph.
 */
export const ResultsView: React.FC<ResultsViewProps> = React.memo(({
  layoutGraph,
  branchResults,
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
          Results View - To be implemented
        </h3>
        <p style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
          Layout dimensions: {layoutGraph.width.toFixed(0)} × {layoutGraph.height.toFixed(0)}
        </p>
        <p style={{ fontSize: "1rem" }}>
          Branch results: {branchResults.size}
        </p>
      </div>
    </div>
  );
});

ResultsView.displayName = "ResultsView";
