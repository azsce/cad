/**
 * 🎨 GraphCanvasNode - Custom React Flow node that renders the circuit graph canvas.
 *
 * This node wraps the existing graph visualization views and provides
 * an unlimited canvas area for the circuit graph.
 */

import React, { useMemo, useCallback } from "react";
import { Box, useTheme } from "@mui/material";
import type { NodeProps } from "@xyflow/react";
import type { AnalysisGraph } from "../../../types/analysis";
import type { GraphVisualizationData } from "../../../contexts/PresentationContext";
import { GraphTooltip } from "./GraphTooltip";
import { calculateLayoutGraph } from "./GraphCanvasNode.utils";
import { useGraphCanvasEventHandlers } from "./useGraphCanvasEventHandlers";
import { getViewRenderer } from "./viewRenderers";
import type { ViewRendererProps } from "./viewRenderers";
import { GraphCanvasErrorDisplay } from "./GraphCanvasErrorDisplay";

/**
 * Data passed to the GraphCanvasNode
 */
export interface GraphCanvasNodeData extends Record<string, unknown> {
  analysisGraph: AnalysisGraph;
  visualizationData: GraphVisualizationData;
  onElementClick: (elementId: string) => void;
}



/**
 * 🎨 Custom React Flow node that renders the circuit graph canvas.
 */
export const GraphCanvasNode = React.memo(
  ({ data }: NodeProps): React.ReactElement => {
    const { analysisGraph, visualizationData, onElementClick } =
      data as GraphCanvasNodeData;
    const theme = useTheme();

    const graphColor = useMemo(
      () => theme.palette.text.primary,
      [theme.palette.text.primary]
    );

    const layoutGraph = useMemo(
      () => calculateLayoutGraph(analysisGraph),
      [analysisGraph]
    );

    const {
      tooltipData,
      handleNodeHover,
      handleEdgeHover,
      handleMouseLeave,
      handleNodeClick,
      handleEdgeClick,
    } = useGraphCanvasEventHandlers({ analysisGraph, onElementClick });

    const renderView = useCallback(() => {
      if (!layoutGraph) {
        return null;
      }

      const renderer = getViewRenderer(visualizationData.mode);
      const props: ViewRendererProps = {
        layoutGraph,
        visualizationData,
        analysisGraph,
        color: graphColor,
        onNodeClick: handleNodeClick,
        onEdgeClick: handleEdgeClick,
        onNodeHover: handleNodeHover,
        onEdgeHover: handleEdgeHover,
        onMouseLeave: handleMouseLeave,
      };

      return renderer(props);
    }, [
      layoutGraph,
      visualizationData,
      analysisGraph,
      graphColor,
      handleNodeClick,
      handleEdgeClick,
      handleNodeHover,
      handleEdgeHover,
      handleMouseLeave,
    ]);

    if (!layoutGraph) {
      return <GraphCanvasErrorDisplay />;
    }

    const canvasWidth = Math.max(2000, layoutGraph.width + 1000);
    const canvasHeight = Math.max(2000, layoutGraph.height + 1000);

    return (
      <Box
        sx={{
          width: canvasWidth,
          height: canvasHeight,
          position: "relative",
        }}
      >
        {renderView()}
        <GraphTooltip
          data={tooltipData}
          svgWidth={layoutGraph.width}
          svgHeight={layoutGraph.height}
        />
      </Box>
    );
  }
);

GraphCanvasNode.displayName = "GraphCanvasNode";
