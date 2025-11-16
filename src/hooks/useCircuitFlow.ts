/**
 * Hook to access CircuitFlowContext
 */

import { createContext, useContext } from 'react';
import { type Node, type Edge, type NodeChange, type EdgeChange, type Connection } from '@xyflow/react';
import type { CircuitNode, CircuitEdge } from '../types/circuit';
import type { NodeId, EdgeId } from '../types/identifiers';

export interface CircuitFlowContextValue {
  nodes: Node[];
  edges: Edge[];
  helperLines: { horizontal?: number| undefined; vertical?: number | undefined};
  onNodesChange: (changes: NodeChange<Node>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  onConnect: (connection: Connection) => void;
  onPaneClick: (event: React.MouseEvent) => void;
  onPaneMouseMove: (event: React.MouseEvent) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  startConnection: (nodeId: NodeId, handleId: string, handlePosition: { x: number; y: number }) => void;
  addNode: (node: CircuitNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  updateNodeData: (nodeId: NodeId, data: Partial<CircuitNode['data']>) => void;
  updateEdge: (edgeId: EdgeId, updates: Partial<CircuitEdge>) => void;
  deleteNodes: (nodeIds: NodeId[]) => void;
  deleteEdges: (edgeIds: EdgeId[]) => void;
}

export const CircuitFlowContext = createContext<CircuitFlowContextValue | null>(null);


export function useCircuitFlow() {
  const context = useContext(CircuitFlowContext);
  if (!context) {
    throw new Error('useCircuitFlow must be used within CircuitFlowProvider');
  }
  return context;
}
