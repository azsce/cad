/**
 * Type definitions for CircuitEditorPane components
 */

import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect, Connection } from '@xyflow/react';
import type { HelperLinesProps } from '../HelperLines';

export interface ReactFlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  helperLines: HelperLinesProps;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onPaneClick: (event: React.MouseEvent) => void;
  onPaneMouseMove: (event: React.MouseEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  isValidConnection: (connection: Edge | Connection) => boolean;
  isConnecting: boolean;
}
