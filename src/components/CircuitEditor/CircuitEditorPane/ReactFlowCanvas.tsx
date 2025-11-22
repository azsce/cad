/**
 * ReactFlowCanvas component - renders the React Flow canvas with all controls
 */

import { memo } from "react";
import { ReactFlow, Background, Controls, MiniMap, ConnectionMode, SelectionMode } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, useTheme } from "@mui/material";
import { WaypointConnectionLine, ConnectionOverlay } from "../edges";
import HelperLinesRenderer from "../HelperLines";
import { nodeTypes, edgeTypes } from "./constants";
import { useReactFlowStyles } from "./useReactFlowStyles";
import type { ReactFlowCanvasProps } from "./types";
import { logger } from "../../../utils/logger";

import { useCanvasInteraction } from "./useCanvasInteraction";

export const ReactFlowCanvas = memo(
  ({
    nodes,
    edges,
    helperLines,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onPaneClick,
    onPaneMouseMove,
    onEdgeClick,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    onDragOver,
    onDrop,
    isValidConnection,
    isConnecting,
    isCtrlPressed,
    isAltPressed,
  }: ReactFlowCanvasProps) => {
    const theme = useTheme();
    const { panOnDrag, selectionOnDrag, isSpacePressed } = useCanvasInteraction(isConnecting);

    logger.debug({ caller: "ReactFlowCanvas" }, "Rendering", { isConnecting, isCtrlPressed, isAltPressed });

    const canvasStyles = useReactFlowStyles(isConnecting, isCtrlPressed, isAltPressed, isSpacePressed);

    return (
      <Box sx={canvasStyles}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          onPaneMouseMove={onPaneMouseMove}
          onEdgeClick={onEdgeClick}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineComponent={WaypointConnectionLine}
          connectionMode={ConnectionMode.Loose}
          isValidConnection={isValidConnection}
          attributionPosition="bottom-left"
          deleteKeyCode={null}
          nodesDraggable={!isConnecting}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={panOnDrag}
          selectionOnDrag={selectionOnDrag}
          panOnScroll={true}
          selectionKeyCode={null}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode="Shift"
          minZoom={0.1}
          maxZoom={8}
          colorMode={theme.palette.mode === "dark" ? "dark" : "light"}
        >
          <Background />
          <Controls />
          <MiniMap />
          <HelperLinesRenderer {...helperLines} />
          <ConnectionOverlay />
        </ReactFlow>
      </Box>
    );
  }
);

ReactFlowCanvas.displayName = "ReactFlowCanvas";
