/**
 * 🖼️ GraphCanvas - Renders the zoomable/pannable graph canvas.
 */

import React, { useCallback } from "react";
import { Box } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import type { LayoutGraph, TooltipData } from "./types";
import { GraphTooltip } from "./GraphTooltip";
import { GraphControls } from "./GraphControls";
import { exportToPNG } from "./exportToPNG";

/**
 * Props for GraphCanvas component
 */
export interface GraphCanvasProps {
  readonly transformRef: React.RefObject<ReactZoomPanPinchRef | null>;
  readonly layoutGraph: LayoutGraph;
  readonly tooltipData: TooltipData | null;
  readonly onEmptySpaceClick: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFitView: () => void;
  readonly children: React.ReactNode;
}

/**
 * 🖼️ Canvas component with zoom/pan controls.
 */
export function GraphCanvas({
  transformRef,
  layoutGraph,
  tooltipData,
  onEmptySpaceClick,
  onZoomIn,
  onZoomOut,
  onFitView,
  children,
}: GraphCanvasProps): React.ReactElement {
  const handleExportPNG = useCallback(() => {
    const svgElement = document.querySelector("svg");
    if (svgElement) {
      exportToPNG(svgElement, "circuit-graph");
    }
  }, []);

  return (
    <Box
      sx={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
      }}
      onClick={onEmptySpaceClick}
    >
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        limitToBounds={false}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: true }}
      >
        <TransformComponent
          wrapperStyle={{
            width: "100%",
            height: "100%",
          }}
          contentStyle={{
            width: "100%",
            height: "100%",
          }}
        >
          {children}
          <GraphTooltip
            data={tooltipData}
            svgWidth={layoutGraph.width}
            svgHeight={layoutGraph.height}
          />
        </TransformComponent>
      </TransformWrapper>

      <GraphControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFitView={onFitView}
        onExportPNG={handleExportPNG}
      />
    </Box>
  );
}
