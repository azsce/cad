/**
 * 🎨 CircuitGraphContainer - Main orchestration component for graph visualization.
 *
 * Manages zoom/pan, mode switching, layout calculation, and interactive features.
 */

import React, { useRef, useMemo, useCallback } from "react";
import { Box, useTheme } from "@mui/material";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import type { AnalysisGraph } from "../../../types/analysis";
import type { GraphVisualizationData } from "../../../contexts/PresentationContext";
import { ModeInfoPanel } from "./ModeInfoPanel";
import { useGraphControls } from "./useGraphControls";
import { useGraphEventHandlers } from "./useGraphEventHandlers";
import { calculateLayoutGraph } from "./CircuitGraphContainer.utils";
import { getViewRenderer } from "./viewRenderers";
import type { ViewRendererProps } from "./viewRenderers";
import { GraphCanvas } from "./GraphCanvas";
import { ErrorDisplay } from "./ErrorDisplay";

/**
 * Props for CircuitGraphContainer component
 */
export interface CircuitGraphContainerProps {
  /** The analysis graph to visualize */
  readonly analysisGraph: AnalysisGraph;
  /** Visualization data with mode and highlighting */
  readonly visualizationData: GraphVisualizationData;
  /** Callback when an element is clicked */
  readonly onElementClick?: (elementId: string) => void;
}



/**
 * 🎨 Main container for circuit graph visualization.
 *
 * Orchestrates layout calculation, mode switching, zoom/pan controls,
 * tooltips, and interactive features.
 */
export function CircuitGraphContainer({
  analysisGraph,
  visualizationData,
  onElementClick,
}: CircuitGraphContainerProps): React.ReactElement {
  const theme = useTheme();
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

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
    handleEmptySpaceClick,
  } = useGraphEventHandlers({ analysisGraph, onElementClick });

  const { handleZoomIn, handleZoomOut, handleFitView } =
    useGraphControls(transformRef);

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
    return <ErrorDisplay />;
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <GraphCanvas
        transformRef={transformRef}
        layoutGraph={layoutGraph}
        tooltipData={tooltipData}
        onEmptySpaceClick={handleEmptySpaceClick}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
      >
        {renderView()}
      </GraphCanvas>

      <ModeInfoPanel
        mode={visualizationData.mode}
        visualizationData={visualizationData}
        analysisGraph={analysisGraph}
        onElementClick={onElementClick}
      />
    </Box>
  );
}
