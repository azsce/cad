/**
 * JunctionNode - Visual representation of an electrical connection point.
 * Always visible, can connect to multiple wires from any direction.
 */

import { memo, useCallback, useState, useMemo, useEffect } from "react";
import { Position, type NodeProps, type Node } from "@xyflow/react";
import { Box, Typography, styled, useTheme } from "@mui/material";
import { useConnectionStore } from "../../../../store/connectionStore";
import { useCircuitFlow } from "../../../../hooks/useCircuitFlow";
import type { JunctionNodeData } from "../../../../types/circuit";
import type { NodeId } from "../../../../types/identifiers";
import { JunctionContextMenu } from "./JunctionContextMenu";
import { JunctionPropertiesDialog } from "./JunctionPropertiesDialog";
import { ConnectableHandle } from "../ConnectableHandle";

// Constants
const CIRCLE_RADIUS = 8;
const JunctionVisualNodeSize = 20;

// Custom cursor for delete action (Red X)
const DELETE_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='red' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'></line><line x1='6' y1='6' x2='18' y2='18'></line></svg>") 12 12, auto`;

// Styled Components
// The container has minimal size (1x1) so React Flow barely considers it
const JunctionContainer = styled(Box, {
  shouldForwardProp: prop => prop !== "isConnecting" && prop !== "isAltPressed",
})<{ isConnecting: boolean; isAltPressed: boolean }>(({ isConnecting, isAltPressed }) => {
  // Extract nested ternary for cursor
  let cursorStyle: string;
  if (isAltPressed) {
    cursorStyle = DELETE_CURSOR;
  } else if (isConnecting) {
    cursorStyle = "pointer";
  } else {
    cursorStyle = "default";
  }

  return {
    width: 2,
    height: 2,
    position: "absolute",
    left: -1,
    top: -1,
    cursor: cursorStyle,
    pointerEvents: "auto", // Container captures events for context menu
    backgroundColor: "yellow",
  };
});

const JunctionLabel = styled(Typography)<{ hasLabel: boolean }>(({ hasLabel }) => ({
  position: "absolute",
  top: `calc(50% + ${String(CIRCLE_RADIUS + 4)}px)`, // Position below the circle
  left: "50%",
  transform: "translateX(-50%)", // Center horizontally
  fontSize: "10px",
  whiteSpace: "nowrap",
  userSelect: "none",
  cursor: hasLabel ? "text" : "default",
  pointerEvents: "auto", // Label captures events
  zIndex: 2,
  ...(hasLabel && {
    "&:hover": {
      textDecoration: "underline",
    },
  }),
}));

const JunctionSvg = styled("svg")({
  position: "absolute",
  top: -8,
  left: -8.5,
  overflow: "visible",
  pointerEvents: "auto", // Enable hover detection
  zIndex: 1,
});

/**
 * 🔍 Check if junction is connected to a selected edge
 */
function isJunctionConnectedToSelectedEdge(
  junctionId: string,
  edges: Array<{ selected?: boolean; source: string; target: string }>
): boolean {
  return edges.some(edge => edge.selected && (edge.source === junctionId || edge.target === junctionId));
}

/**
 * 🔗 Hook for junction event handlers
 */
function useJunctionHandlers(
  id: string,
  deleteNodes: (ids: NodeId[]) => void,
  updateNodeData: (id: NodeId, data: Partial<JunctionNodeData>) => void
) {
  const [contextMenuAnchor, setContextMenuAnchor] = useState<HTMLElement | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuAnchor(null);
  }, []);

  const handleEditProperties = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    deleteNodes([id as NodeId]);
  }, [id, deleteNodes]);

  const handleSaveLabel = useCallback(
    (newLabel: string) => {
      updateNodeData(id as NodeId, { label: newLabel });
      setEditDialogOpen(false);
    },
    [id, updateNodeData]
  );

  const handleLabelDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setEditDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setEditDialogOpen(false);
  }, []);

  return {
    contextMenuAnchor,
    editDialogOpen,
    handleContextMenu,
    handleCloseContextMenu,
    handleEditProperties,
    handleDelete,
    handleSaveLabel,
    handleLabelDoubleClick,
    handleCloseDialog,
  };
}

/**
 * 🎨 Hook to calculate outline color based on state
 */
function useOutlineColor(isAltPressed: boolean, isHighlighted: boolean) {
  const theme = useTheme();

  if (isAltPressed) {
    return theme.palette.error.main;
  }
  if (isHighlighted) {
    return theme.palette.primary.main;
  }
  return theme.palette.mode === "dark" ? theme.palette.grey[400] : theme.palette.grey[600];
}

/**
 * 🎯 Hook to calculate cursor style
 */
function useHandleCursor(isAltPressed: boolean, isConnecting: boolean) {
  if (isAltPressed) return DELETE_CURSOR;
  if (isConnecting) return "pointer";
  return "crosshair";
}

/**
 * 🔘 Junction handle component
 */
interface JunctionHandleProps {
  id: string;
  isAltPressed: boolean;
  isConnecting: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const JunctionHandle = memo(({ id, isAltPressed, isConnecting, onMouseEnter, onMouseLeave }: JunctionHandleProps) => {
  const cursor = useHandleCursor(isAltPressed, isConnecting);

  return (
    <ConnectableHandle
      type="source"
      position={Position.Left}
      id="center"
      nodeId={id}
      handleId="center"
      style={{
        opacity: 0,
        background: "transparent",
        cursor,
        pointerEvents: "auto",
        width: 2,
        height: 2,
        left: 1,
        top: 1,
        zIndex: 10,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        style={{
          width: 20,
          height: 20,
          position: "absolute",
          left: -9,
          top: -9,
          borderRadius: "50%",
        }}
      />
    </ConnectableHandle>
  );
});

JunctionHandle.displayName = "JunctionHandle";

/**
 * ⚫ Junction visual circle component
 */
interface JunctionCircleProps {
  outlineColor: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const JunctionCircle = memo(({ outlineColor, onMouseEnter, onMouseLeave }: JunctionCircleProps) => (
  <JunctionSvg
    width={JunctionVisualNodeSize}
    height={JunctionVisualNodeSize}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <circle cx={JunctionVisualNodeSize / 2} cy={JunctionVisualNodeSize / 2} r={CIRCLE_RADIUS} fill={outlineColor} />
  </JunctionSvg>
));

JunctionCircle.displayName = "JunctionCircle";

/**
 * 🎨 Junction node component - minimal container with handle and label only
 * Visual representation is handled by JunctionVisualNode
 */
/**
 * 🎨 Junction node component - minimal container with handle and label only
 * Visual representation is handled by extracted components
 */
export const JunctionNode = memo(({ id, data, selected }: NodeProps<Node<JunctionNodeData>>) => {
  const { edges, deleteNodes, updateNodeData, isAltPressed } = useCircuitFlow();
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const [isHovered, setIsHovered] = useState(false);

  const handlers = useJunctionHandlers(id, deleteNodes, updateNodeData);
  const isConnectedToSelected = useMemo(() => isJunctionConnectedToSelectedEdge(id, edges), [id, edges]);

  const isHighlighted = useMemo(
    () => isHovered || isConnectedToSelected || selected,
    [isHovered, isConnectedToSelected, selected]
  );

  useEffect(() => {
    updateNodeData(id as NodeId, { isHighlighted });
  }, [isHighlighted, id, updateNodeData]);

  const outlineColor = useOutlineColor(isAltPressed, isHighlighted);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.altKey) {
        e.stopPropagation();
        handlers.handleDelete();
      }
    },
    [handlers]
  );

  return (
    <>
      <JunctionContainer
        isConnecting={isConnecting}
        isAltPressed={isAltPressed}
        onContextMenu={handlers.handleContextMenu}
        onClick={handleClick}
      >
        {data.label && (
          <JunctionLabel
            variant="caption"
            color="text.secondary"
            hasLabel={Boolean(data.label)}
            onDoubleClick={handlers.handleLabelDoubleClick}
          >
            {data.label}
          </JunctionLabel>
        )}

        <JunctionHandle
          id={id}
          isAltPressed={isAltPressed}
          isConnecting={isConnecting}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />

        <JunctionCircle outlineColor={outlineColor} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
      </JunctionContainer>

      <JunctionContextMenu
        anchorEl={handlers.contextMenuAnchor}
        open={Boolean(handlers.contextMenuAnchor)}
        onClose={handlers.handleCloseContextMenu}
        onEditProperties={handlers.handleEditProperties}
        onDelete={handlers.handleDelete}
      />

      <JunctionPropertiesDialog
        key={handlers.editDialogOpen ? "open" : "closed"}
        open={handlers.editDialogOpen}
        currentLabel={data.label ?? ""}
        onClose={handlers.handleCloseDialog}
        onSave={handlers.handleSaveLabel}
      />
    </>
  );
});

JunctionNode.displayName = "JunctionNode";
