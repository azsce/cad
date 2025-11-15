/**
 * ReactFlowCanvas component - renders the React Flow canvas with all controls
 */

import { memo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, ConnectionMode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, useTheme } from '@mui/material';
import { WaypointConnectionLine, ConnectionOverlay } from '../edges';
import HelperLinesRenderer from '../HelperLines';
import { nodeTypes, edgeTypes } from './constants';
import { useReactFlowStyles } from './useReactFlowStyles';
import type { ReactFlowCanvasProps } from './types';
import { logger } from '../../../utils/logger';

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
    onDragOver,
    onDrop,
    isValidConnection,
    isConnecting,
  }: ReactFlowCanvasProps) => {
    const theme = useTheme();
    
    logger.debug({ caller: 'ReactFlowCanvas' }, 'Rendering', { isConnecting });
    
    const canvasStyles = useReactFlowStyles(isConnecting);

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
          elementsSelectable={!isConnecting}
        >
          <Background color={theme.palette.mode === 'dark' ? '#555' : '#aaa'} gap={16} />
          <Controls />
          <MiniMap
            nodeColor={theme.palette.mode === 'dark' ? '#555' : '#e2e2e2'}
            maskColor={theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
            style={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <HelperLinesRenderer {...helperLines} />
          <ConnectionOverlay />
        </ReactFlow>
      </Box>
    );
  }
);

ReactFlowCanvas.displayName = 'ReactFlowCanvas';
