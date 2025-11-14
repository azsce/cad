/**
 * CircuitEditorPane component.
 * Integrates React Flow as a controlled component for visual circuit editing.
 * All circuit data is synchronized with the Zustand store (single source of truth).
 */

import { useCallback, useMemo, useState, useRef } from 'react';
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
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Typography, useTheme } from '@mui/material';
import { useCircuitStore } from '../../store/circuitStore';
import { ResistorNode } from './nodes/ResistorNode';
import { VoltageSourceNode } from './nodes/VoltageSourceNode';
import { CurrentSourceNode } from './nodes/CurrentSourceNode';
import { ComponentPalette } from './ComponentPalette';
import { ComponentConfigDialog } from './ComponentConfigDialog';
import type { CircuitNode, CircuitEdge, ComponentData } from '../../types/circuit';

/**
 * Custom node types for React Flow.
 * Maps component type strings to their React components.
 * Memoized to prevent recreation on every render.
 */
const nodeTypes: NodeTypes = {
  resistor: ResistorNode,
  voltageSource: VoltageSourceNode,
  currentSource: CurrentSourceNode,
  ground: () => null, // Placeholder for ground node type
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
 * Inner component that has access to React Flow instance.
 */
function CircuitEditorInner() {
  const theme = useTheme();
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  const activeCircuit = useCircuitStore((state) => state.getActiveCircuit());
  const syncNodesFromFlow = useCircuitStore((state) => state.syncNodesFromFlow);
  const syncEdgesFromFlow = useCircuitStore((state) => state.syncEdgesFromFlow);
  const addEdge = useCircuitStore((state) => state.addEdge);
  const addNode = useCircuitStore((state) => state.addNode);

  // Dialog state for component configuration
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [pendingComponent, setPendingComponent] = useState<{
    type: 'resistor' | 'voltageSource' | 'currentSource';
    position: { x: number; y: number };
  } | null>(null);

  // Convert CircuitNode[] to React Flow Node[]
  const nodes: Node[] = useMemo(() => {
    if (!activeCircuit) return [];
    return activeCircuit.nodes.map((node) => {
      // Validate node type
      if (!['resistor', 'voltageSource', 'currentSource', 'ground'].includes(node.type)) {
        console.error('Invalid node type:', node.type, node);
      }
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      };
    });
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

  /**
   * Handle drag over event on React Flow canvas.
   * Allows dropping components onto the canvas.
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  /**
   * Handle drop event on React Flow canvas.
   * Creates a new node at the drop position and opens configuration dialog.
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!activeCircuit) return;
      if (!reactFlowWrapper.current) return;

      // Get the component type from drag data
      // cspell:ignore reactflow
      const type = event.dataTransfer.getData('application/reactflow');

      // Validate component type
      if (!type || !['resistor', 'voltageSource', 'currentSource'].includes(type)) {
        console.error('Invalid component type:', type);
        return;
      }

      // Calculate position in React Flow coordinates
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Store pending component and open configuration dialog
      setPendingComponent({ 
        type: type as 'resistor' | 'voltageSource' | 'currentSource', 
        position 
      });
      setConfigDialogOpen(true);
    },
    [activeCircuit, reactFlowInstance]
  );

  /**
   * Handle component configuration confirmation.
   * Creates the node with the configured properties.
   */
  const handleConfigConfirm = useCallback(
    (id: string, data: ComponentData) => {
      if (!activeCircuit || !pendingComponent) {
        console.error('Cannot add node: missing circuit or pending component');
        return;
      }

      try {
        const newNode: CircuitNode = {
          id,
          type: pendingComponent.type,
          position: pendingComponent.position,
          data,
        };

        addNode(activeCircuit.id, newNode);

        // Reset dialog state
        setConfigDialogOpen(false);
        setPendingComponent(null);
      } catch (error) {
        console.error('Error adding node:', error);
      }
    },
    [activeCircuit, pendingComponent, addNode]
  );

  /**
   * Handle component configuration cancellation.
   */
  const handleConfigCancel = useCallback(() => {
    setConfigDialogOpen(false);
    setPendingComponent(null);
  }, []);

  return (
    <>
      <Box
        sx={{
          height: '100%',
          width: '100%',
          display: 'flex',
          bgcolor: 'background.default',
        }}
      >
        {/* Component Palette Sidebar */}
        <ComponentPalette />

        {/* React Flow Canvas */}
        <Box
          ref={reactFlowWrapper}
          sx={{
            flex: 1,
            height: '100%',
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
            onDragOver={onDragOver}
            onDrop={onDrop}
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
      </Box>

      {/* Component Configuration Dialog */}
      <ComponentConfigDialog
        open={configDialogOpen}
        componentType={pendingComponent?.type ?? null}
        onConfirm={handleConfigConfirm}
        onCancel={handleConfigCancel}
      />
    </>
  );
}

/**
 * CircuitEditorPane component.
 * Main visual editor for designing circuits with drag-and-drop components.
 * Wrapped with ReactFlowProvider to provide React Flow context.
 */
export function CircuitEditorPane() {
  const activeCircuit = useCircuitStore((state) => state.getActiveCircuit());

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
    <ReactFlowProvider>
      <CircuitEditorInner />
    </ReactFlowProvider>
  );
}
