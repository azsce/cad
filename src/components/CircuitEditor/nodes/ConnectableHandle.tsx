import { memo, useCallback, useMemo, type CSSProperties } from "react";
import { Handle, type HandleProps, useReactFlow } from "@xyflow/react";
import { useTheme } from "@mui/material";
import { logger } from "../../../utils/logger";
import { useCircuitFlow } from "../../../hooks/useCircuitFlow";
import { useConnectionStore } from "../../../store/connectionStore";
import { createNodeId } from "../../../types/identifiers";
import type { NodeId } from "../../../types/identifiers";

/**
 * Custom Handle component that supports click-to-connect mode.
 * Wraps React Flow's Handle with custom click handling for waypoint connections.
 */
interface ConnectableHandleProps extends HandleProps {
  nodeId: string;
  handleId: string;
}

/**
 * Check if a connection attempt is valid
 */
function isValidConnection(sourceNode: NodeId | null, targetNodeId: string): boolean {
  const targetNode = createNodeId(targetNodeId);
  // Can't connect node to itself
  return sourceNode !== targetNode;
}

/**
 * Hook to compute handle style based on connection state
 */
function useHandleStyle(
  baseStyle: CSSProperties | undefined,
  isConnecting: boolean,
  isConnectedToSelectedEdge: boolean,
  errorColor: string
) {
  return useMemo(
    () => ({
      ...baseStyle,
      cursor: baseStyle?.cursor ?? (isConnecting ? "pointer" : "crosshair"),
      background: isConnectedToSelectedEdge ? errorColor : baseStyle?.background,
    }),
    [baseStyle, isConnecting, isConnectedToSelectedEdge, errorColor]
  );
}

export const ConnectableHandle = memo(({ nodeId, handleId, ...handleProps }: ConnectableHandleProps) => {
  const theme = useTheme();
  const { startConnection, onConnect, edges } = useCircuitFlow();
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const sourceNode = useConnectionStore(state => state.sourceNode);
  const sourceHandle = useConnectionStore(state => state.sourceHandle);

  // Check if this handle is connected to a selected edge
  const isConnectedToSelectedEdge = useMemo(
    () =>
      edges.some(
        edge =>
          edge.selected &&
          ((edge.source === nodeId && edge.sourceHandle === handleId) ||
            (edge.target === nodeId && edge.targetHandle === handleId))
      ),
    [nodeId, handleId, edges]
  );

  /**
   * Start a new connection from this handle
   * Uses event.currentTarget to ensure we get the handle element, not a child
   */
  const handleStartConnection = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Use currentTarget instead of target to get the element with the onClick handler
      // This ensures we get the handle element itself, not a child element
      const handleElement = event.currentTarget;
      const rect = handleElement.getBoundingClientRect();
      const screenPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      const viewport = getViewport();
      const handlePosition = screenToFlowPosition(screenPos);

      logger.debug({ caller: "ConnectableHandle" }, "Starting connection", {
        nodeId,
        handleId,
        screenPos,
        handlePosition,
        viewport,
        rectInfo: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      });

      startConnection(createNodeId(nodeId), handleId, handlePosition);
    },
    [nodeId, handleId, startConnection, screenToFlowPosition, getViewport]
  );

  /**
   * Complete an existing connection to this handle
   */
  const handleCompleteConnection = useCallback(() => {
    if (!isValidConnection(sourceNode, nodeId)) {
      return;
    }

    onConnect({
      source: sourceNode ?? "",
      sourceHandle: sourceHandle ?? "",
      target: nodeId,
      targetHandle: handleId,
    });
  }, [sourceNode, sourceHandle, nodeId, handleId, onConnect]);

  /**
   * Handle click on this handle
   * - If not in connection mode: start connection from this handle
   * - If in connection mode: complete connection to this handle
   */
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Allow Alt+Click to bubble up (e.g. for deletion)
      if (event.altKey) {
        return;
      }

      event.stopPropagation();

      logger.info({ caller: "ConnectableHandle" }, "🖱️ HANDLE CLICKED", {
        nodeId,
        handleId,
        isConnecting,
        clientX: event.clientX,
        clientY: event.clientY,
      });

      if (isConnecting) {
        logger.info({ caller: "ConnectableHandle" }, "✅ Completing connection to this handle");
        handleCompleteConnection();
      } else {
        logger.info({ caller: "ConnectableHandle" }, "🚀 Starting connection from this handle");
        handleStartConnection(event);
      }
    },
    [isConnecting, handleCompleteConnection, handleStartConnection, nodeId, handleId]
  );

  const handleStyle = useHandleStyle(
    handleProps.style,
    isConnecting,
    isConnectedToSelectedEdge,
    theme.palette.error.main
  );

  return <Handle {...handleProps} onClick={handleClick} style={handleStyle} />;
});

ConnectableHandle.displayName = "ConnectableHandle";
