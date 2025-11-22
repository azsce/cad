/**
 * CircuitEditorInner component - main editor logic with React Flow instance access
 */

import { useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { Box } from "@mui/material";
import { useCircuitFlow } from "../../../hooks/useCircuitFlow";
import { useConnectionStore } from "../../../store/connectionStore";
import { logger } from "../../../utils/logger";
import { ComponentPalette } from "../ComponentPalette";
import { ComponentConfigDialog } from "../ComponentConfigDialog";
import { ReactFlowCanvas } from "./ReactFlowCanvas";
import { ConnectionModeIndicator } from "./ConnectionModeIndicator";
import { useComponentDrop } from "./useComponentDrop";
import { useConnectionValidation } from "./useConnectionValidation";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useComponentConfig } from "./useComponentConfig";

export function CircuitEditorInner() {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Get nodes, edges, helper lines, and update functions from context
  // Context manages state independently - no store subscriptions here!
  const {
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
    isCtrlPressed,
    isAltPressed,
    addNode: addNodeToFlow,
    deleteNodes,
    deleteEdges,
  } = useCircuitFlow();

  // Subscribe to connection mode state for visual feedback
  const isConnecting = useConnectionStore(state => state.isConnecting);

  // Log when isConnecting changes
  logger.debug({ caller: "CircuitEditorInner" }, "isConnecting state", { isConnecting });

  // Component drop handling
  const { configDialogOpen, pendingComponent, onDragOver, onDrop, closeDialog } = useComponentDrop(
    reactFlowInstance,
    reactFlowWrapper,
    addNodeToFlow
  );

  // Connection validation
  const { isValidConnection } = useConnectionValidation(edges);

  // Component configuration
  const { handleConfigConfirm } = useComponentConfig(pendingComponent, addNodeToFlow, reactFlowInstance, closeDialog);

  // Keyboard shortcuts
  useKeyboardShortcuts({ nodes, edges, deleteNodes, deleteEdges });

  return (
    <>
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          bgcolor: "background.default",
        }}
      >
        {/* Component Palette Sidebar */}
        <Box
          sx={{
            opacity: isConnecting ? 0.5 : 1,
            transition: "opacity 0.2s ease",
            pointerEvents: isConnecting ? "none" : "all",
          }}
        >
          <ComponentPalette />
        </Box>

        {/* React Flow Canvas */}
        <Box ref={reactFlowWrapper} sx={{ flex: 1, height: "100%", position: "relative" }}>
          <ReactFlowCanvas
            nodes={nodes}
            edges={edges}
            helperLines={helperLines}
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
            isValidConnection={isValidConnection}
            isConnecting={isConnecting}
            isCtrlPressed={isCtrlPressed}
            isAltPressed={isAltPressed}
          />

          {/* Connection Mode Status Indicator (Requirement 10.2) */}
          <ConnectionModeIndicator isConnecting={isConnecting} />
        </Box>
      </Box>

      {/* Component Configuration Dialog */}
      <ComponentConfigDialog
        open={configDialogOpen}
        componentType={pendingComponent?.type ?? null}
        onConfirm={handleConfigConfirm}
        onCancel={closeDialog}
      />
    </>
  );
}
