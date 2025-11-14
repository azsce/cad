/**
 * CircuitEditorPane component.
 * Integrates React Flow as a controlled component for visual circuit editing.
 * All circuit data is synchronized with the Zustand store (single source of truth).
 */

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Typography, useTheme } from '@mui/material';
import { useCircuitStore } from '../../store/circuitStore';
import { ResistorNode } from './nodes/ResistorNode';
import { VoltageSourceNode } from './nodes/VoltageSourceNode';
import { CurrentSourceNode } from './nodes/CurrentSourceNode';
import type { CircuitNode, CircuitEdge } from '../../types/circuit';

/**
 * Custom node types for React Flow.
 * Maps component type strings to their React components.
 */
const nodeTypes: NodeTypes = {
  resistor: ResistorNode,
  voltageSource: VoltageSourceNode,
  currentSource: CurrentSourceNode,
};

/**
 * Custom WireEdge component for circuit connections.
 * Renders a simple straight line for now.
 */
function WireEdge() {
  return null; // Use default edge for now
}

/**
 * Custom edge types for React Flow.
 */
const edgeTypes: EdgeTypes = {
  wire: WireEdge,
};

/**
 * CircuitEditorPane component.
 * Main visual editor for designing circuits with drag-and-drop components.
 */
export function CircuitEditorPane() {
  const theme = useTheme();
  const activeCircuit = useCircuitStore((state) => state.getActiveCircuit());
  const syncNodesFromFlow = useCircuitStore((state) => state.syncNodesFromFlow);
  const syncEdgesFromFlow = useCircuitStore((state) => state.syncEdgesFromFlow);
  const addEdge = useCircuitStore((state) => state.addEdge);

  // Convert CircuitNode[] to React Flow Node[]
  const nodes: Node[] = useMemo(() => {
    if (!activeCircuit) return [];
    return activeCircuit.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    }));
  }, [activeCircuit]);

  // Convert CircuitEdge[] to React Flow Edge[]
  const edges: Edge[] = useMemo(() => {
    if (!activeCircuit) return [];
    return activeCircuit.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      type: 'wire',
    }));
  }, [activeCircuit]);

  /**
   * Handle node changes (position, selection, removal).
   * Applies changes locally and syncs back to store.
   */
  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      if (!activeCircuit) return;

      // Apply changes to current nodes
      const updatedNodes = applyNodeChanges(changes, nodes);

      // Convert back to CircuitNode[] and sync to store
      const circuitNodes: CircuitNode[] = updatedNodes.map((node) => ({
        id: node.id,
        type: node.type as CircuitNode['type'],
        position: node.position,
        data: node.data as CircuitNode['data'],
      }));

      syncNodesFromFlow(activeCircuit.id, circuitNodes);
    },
    [activeCircuit, nodes, syncNodesFromFlow]
  );

  /**
   * Handle edge changes (selection, removal).
   * Applies changes locally and syncs back to store.
   */
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (!activeCircuit) return;

      // Apply changes to current edges
      const updatedEdges = applyEdgeChanges(changes, edges);

      // Convert back to CircuitEdge[] and sync to store
      const circuitEdges: CircuitEdge[] = updatedEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle ?? '',
        target: edge.target,
        targetHandle: edge.targetHandle ?? '',
      }));

      syncEdgesFromFlow(activeCircuit.id, circuitEdges);
    },
    [activeCircuit, edges, syncEdgesFromFlow]
  );

  /**
   * Handle new connection creation.
   * Creates a new edge in the store when user connects two nodes.
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!activeCircuit) return;
      if (!connection.source || !connection.target) return;
      if (!connection.sourceHandle || !connection.targetHandle) return;

      const timestamp = Date.now().toString();
      const randomPart = crypto.randomUUID().substring(0, 8);
      const newEdge: CircuitEdge = {
        id: `edge-${timestamp}-${randomPart}`,
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        target: connection.target,
        targetHandle: connection.targetHandle,
      };

      addEdge(activeCircuit.id, newEdge);
    },
    [activeCircuit, addEdge]
  );

  // Show empty state when no circuit is selected
  if (!activeCircuit) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No circuit selected. Create or select a circuit to begin.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        bgcolor: 'background.default',
        // Apply theme colors to React Flow controls using CSS variables
        '& .react-flow__controls': {
          button: {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderColor: theme.palette.divider,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          },
        },
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background
          color={theme.palette.mode === 'dark' ? '#555' : '#aaa'}
          gap={16}
        />
        <Controls />
        <MiniMap
          nodeColor={theme.palette.mode === 'dark' ? '#555' : '#e2e2e2'}
          maskColor={
            theme.palette.mode === 'dark'
              ? 'rgba(0, 0, 0, 0.6)'
              : 'rgba(255, 255, 255, 0.6)'
          }
          style={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }}
        />
      </ReactFlow>
    </Box>
  );
}
