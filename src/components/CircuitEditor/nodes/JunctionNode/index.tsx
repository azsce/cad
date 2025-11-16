/**
 * JunctionNode - Visual representation of an electrical connection point.
 * Always visible, can connect to multiple wires from any direction.
 */

import { memo, useCallback, useState, useMemo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useTheme, Box, Typography, styled } from '@mui/material';
import { useConnectionStore } from '../../../../store/connectionStore';
import { useCircuitFlow } from '../../../../hooks/useCircuitFlow';
import { logger } from '../../../../utils/logger';
import type { JunctionNodeData } from '../../../../types/circuit';
import type { NodeId } from '../../../../types/identifiers';
import { JunctionContextMenu } from './JunctionContextMenu';
import { JunctionPropertiesDialog } from './JunctionPropertiesDialog';

// Constants
const CIRCLE_RADIUS = 8;
const SVG_SIZE = 20;
const OUTLINE_WIDTH_NORMAL = 2;
const OUTLINE_WIDTH_HIGHLIGHTED = 3;

// Styled Components
const JunctionContainer = styled(Box)<{ isConnecting: boolean }>(({ isConnecting }) => ({
  position: 'relative',
  width: SVG_SIZE,
  height: SVG_SIZE,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  cursor: isConnecting ? 'pointer' : 'default',
}));

const JunctionSvg = styled('svg')({
  overflow: 'visible',
});

const JunctionLabel = styled(Typography)<{ hasLabel: boolean }>(({ hasLabel }) => ({
  position: 'absolute',
  top: SVG_SIZE + 2,
  fontSize: '10px',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  cursor: hasLabel ? 'text' : 'default',
  '&:hover': hasLabel ? {
    textDecoration: 'underline',
  } : {},
}));

const InvisibleHandle = styled(Handle)<{ isConnecting: boolean }>(({ isConnecting }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: SVG_SIZE,
  height: SVG_SIZE,
  opacity: 0,
  border: 'none',
  background: 'transparent',
  cursor: isConnecting ? 'pointer' : 'crosshair',
}));

/**
 * 🔍 Check if junction is connected to a selected edge
 */
function isJunctionConnectedToSelectedEdge(
  junctionId: string,
  edges: Array<{ selected?: boolean; source: string; target: string }>
): boolean {
  return edges.some((edge) =>
    edge.selected && (edge.source === junctionId || edge.target === junctionId)
  );
}

/**
 * 🎨 Determine junction fill color based on state
 */
function getJunctionFillColor(
  isConnectedToSelected: boolean,
  isSelected: boolean,
  primaryColor: string
): string {
  if (isConnectedToSelected) return primaryColor;
  if (isSelected) return primaryColor;
  return 'none';
}

/**
 * 🎨 Determine outline width based on highlight state
 */
function getOutlineWidth(isHighlighted: boolean): number {
  if (isHighlighted) return OUTLINE_WIDTH_HIGHLIGHTED;
  return OUTLINE_WIDTH_NORMAL;
}

/**
 * 🎨 Get circle filter style
 */
function getCircleFilter(shouldGlow: boolean, primaryColor: string): string {
  if (shouldGlow) return `drop-shadow(0 0 6px ${primaryColor})`;
  return 'none';
}

/**
 * 🔗 Hook for junction event handlers
 */
function useJunctionHandlers(
  id: string,
  data: JunctionNodeData,
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

  const handleSaveLabel = useCallback((newLabel: string) => {
    logger.debug({ caller: 'JunctionNode' }, 'Saving label', { id, newLabel });
    updateNodeData(id as NodeId, { label: newLabel });
    setEditDialogOpen(false);
  }, [id, updateNodeData]);

  const handleLabelDoubleClick = useCallback((event: React.MouseEvent) => {
    if (!data.label) return;
    event.stopPropagation();
    setEditDialogOpen(true);
  }, [data.label]);

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
 * 🎨 Junction node component (CC=3, 38 lines)
 */
export const JunctionNode = memo(({ id, data, selected }: NodeProps<Node<JunctionNodeData>>) => {
  const theme = useTheme();
  const { edges, deleteNodes, updateNodeData } = useCircuitFlow();
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const [isHovered, setIsHovered] = useState(false);

  const handlers = useJunctionHandlers(id, data, deleteNodes, updateNodeData);

  const isConnectedToSelected = useMemo(
    () => isJunctionConnectedToSelectedEdge(id, edges),
    [id, edges]
  );

  const isHighlighted = isHovered || (isConnecting && isHovered);
  const fillColor = getJunctionFillColor(isConnectedToSelected, selected, theme.palette.primary.main);
  const outlineWidth = getOutlineWidth(isHighlighted);
  const shouldGlow = isHighlighted || isConnectedToSelected;

  logger.debug({ caller: 'JunctionNode' }, 'Rendering junction', {
    id,
    selected,
    isConnecting,
    hasLabel: Boolean(data.label),
  });

  return (
    <>
      <JunctionContainer
        isConnecting={isConnecting}
        onContextMenu={handlers.handleContextMenu}
        onClick={(event) => {
          logger.info({ caller: 'JunctionNode' }, '🖱️ JUNCTION NODE CLICKED', {
            id,
            isConnecting,
            clientX: event.clientX,
            clientY: event.clientY,
          });
        }}
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        <JunctionSvg width={SVG_SIZE} height={SVG_SIZE}>
          <circle
            cx={SVG_SIZE / 2}
            cy={SVG_SIZE / 2}
            r={CIRCLE_RADIUS}
            fill={fillColor}
            stroke={theme.palette.primary.main}
            strokeWidth={outlineWidth}
            style={{
              transition: 'all 0.2s ease',
              filter: getCircleFilter(shouldGlow, theme.palette.primary.main),
            }}
          />
        </JunctionSvg>

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

        <InvisibleHandle
          type="source"
          position={Position.Top}
          id="center"
          isConnecting={isConnecting}
        />
      </JunctionContainer>

      <JunctionContextMenu
        anchorEl={handlers.contextMenuAnchor}
        open={Boolean(handlers.contextMenuAnchor)}
        onClose={handlers.handleCloseContextMenu}
        onEditProperties={handlers.handleEditProperties}
        onDelete={handlers.handleDelete}
      />

      <JunctionPropertiesDialog
        key={handlers.editDialogOpen ? 'open' : 'closed'}
        open={handlers.editDialogOpen}
        currentLabel={data.label ?? ''}
        onClose={handlers.handleCloseDialog}
        onSave={handlers.handleSaveLabel}
      />
    </>
  );
});

JunctionNode.displayName = 'JunctionNode';
