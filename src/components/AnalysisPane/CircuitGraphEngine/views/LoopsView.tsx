/**
 * Loops View Component (Placeholder)
 * 
 * Placeholder for future loops visualization.
 * Will be implemented in a future spec to show fundamental loops.
 */

import React from "react";
import type { LayoutGraph } from "../types";
import type { BranchId, NodeId } from "../../../../types/analysis";
import type { LoopDefinition } from "../../../../contexts/PresentationContext";

/**
 * Props for the LoopsView component
 */
export interface LoopsViewProps {
  /** The geometric graph layout to render */
  layoutGraph: LayoutGraph;
  /** Loop definitions for visualization */
  loopDefinitions: LoopDefinition[];
  /** IDs of elements to highlight */
  highlightedElements: string[];
  /** Color for graph elements */
  color: string;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: NodeId) => void;
  /** Callback when an edge is clicked */
  onEdgeClick?: (branchId: BranchId) => void;
}

/**
 * 🔄 Placeholder for loops visualization.
 * 
 * This component will be implemented in a future spec to show
 * fundamental loops with color-coded highlighting.
 */
export const LoopsView: React.FC<LoopsViewProps> = React.memo(({
  layoutGraph,
  loopDefinitions,
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
          Loops View - To be implemented
        </h3>
        <p style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
          Layout dimensions: {layoutGraph.width.toFixed(0)} × {layoutGraph.height.toFixed(0)}
        </p>
        <p style={{ fontSize: "1rem" }}>
          Fundamental loops: {loopDefinitions.length}
        </p>
      </div>
    </div>
  );
});

LoopsView.displayName = "LoopsView";
