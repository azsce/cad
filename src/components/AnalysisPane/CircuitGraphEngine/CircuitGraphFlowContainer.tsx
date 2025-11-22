/* eslint-disable sonarjs/no-commented-code */
/**
 * 🎨 CircuitGraphFlowContainer - React Flow wrapper for circuit graph visualization.
 *
 * Uses React Flow for unlimited canvas with zoom/pan, wrapping the existing
 * SVG graph renderer as a custom node type for optimal performance.
 */

import React, { useMemo } from "react";
import { Box, useTheme } from "@mui/material";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AnalysisGraph } from "../../../types/analysis";
import type { GraphVisualizationData } from "../../../contexts/PresentationContext";
// import { ModeInfoPanel } from "./ModeInfoPanel";
import { GraphCanvasNode, type GraphCanvasNodeData } from "./GraphCanvasNode";

/**
 * Props for CircuitGraphFlowContainer component
 */
export interface CircuitGraphFlowContainerProps {
  /** The analysis graph to visualize */
  readonly analysisGraph: AnalysisGraph;
  /** Visualization data with mode and highlighting */
  readonly visualizationData: GraphVisualizationData;
  /** Callback when an element is clicked */
  readonly onElementClick?: (elementId: string) => void;
}

/**
 * 🎨 React Flow container for circuit graph visualization.
 *
 * Wraps the SVG graph renderer in a React Flow canvas node,
 * providing unlimited zoom/pan with built-in performance optimizations.
 */
export function CircuitGraphFlowContainer({
  analysisGraph,
  visualizationData,
  onElementClick,
}: CircuitGraphFlowContainerProps): React.ReactElement {
  const theme = useTheme();
  // Define custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      graphCanvas: GraphCanvasNode,
    }),
    []
  );

  // Create a single node that contains the entire graph canvas
  const nodes: Node<GraphCanvasNodeData>[] = useMemo(
    () => [
      {
        id: "graph-canvas",
        type: "graphCanvas",
        position: { x: 0, y: 0 },
        data: {
          analysisGraph,
          visualizationData,
          onElementClick: onElementClick ?? (() => {}),
        },
        draggable: false,
        selectable: false,
      },
    ],
    [analysisGraph, visualizationData, onElementClick]
  );

  const containerStyle = useMemo(
    () => ({
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column" as const,
      gap: 2,
    }),
    []
  );

  const flowStyle = useMemo(
    () => ({
      flex: 1,
      bgcolor: "background.paper",
    }),
    []
  );

  return (
    <Box sx={containerStyle}>
      <Box sx={flowStyle}>
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={5}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
          colorMode={theme.palette.mode === "dark" ? "dark" : "light"}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </Box>

      {/* keep it commented for now */}
      
      {/* {onElementClick && (
        <ModeInfoPanel
          mode={visualizationData.mode}
          visualizationData={visualizationData}
          analysisGraph={analysisGraph}
          onElementClick={onElementClick}
        />
      )} */}
      {/* {!onElementClick && (
        <ModeInfoPanel
          mode={visualizationData.mode}
          visualizationData={visualizationData}
          analysisGraph={analysisGraph}
        />
      )} */}
    </Box>
  );
}
