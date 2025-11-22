/**
 * Type definitions for CircuitEditorPane components
 */

import type { Edge, OnConnect, Connection, EdgeMouseHandler, NodeChange, EdgeChange } from "@xyflow/react";
import type { HelperLinesProps } from "../HelperLines";
import type { CircuitNode, CircuitEdge } from "../../../types/circuit";

export interface ReactFlowCanvasProps {
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  helperLines: HelperLinesProps;
  onNodesChange: (changes: NodeChange<CircuitNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<CircuitEdge>[]) => void;
  onConnect: OnConnect;
  onPaneClick: (event: React.MouseEvent) => void;
  onPaneMouseMove: (event: React.MouseEvent) => void;
  onEdgeClick: (event: React.MouseEvent, edge: CircuitEdge) => void;
  onEdgeMouseEnter: EdgeMouseHandler;
  onEdgeMouseLeave: EdgeMouseHandler;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  isValidConnection: (connection: Edge | Connection) => boolean;
  isConnecting: boolean;
  isCtrlPressed: boolean;
  isAltPressed: boolean;
}
