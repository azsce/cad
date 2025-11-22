/**
 * 🖱️ Hook for handling edge click events:
 * - Ctrl+Click to start connection from edge
 * - Click during connection mode to end at edge
 */

import { useCallback } from "react";
import { useTheme } from "@mui/material";
import { useConnectionStore } from "../../store/connectionStore";
import type { CircuitNode, CircuitEdge, JunctionNode, Waypoint, Position } from "../../types/circuit";
import type { NodeId, EdgeId } from "../../types/identifiers";
import { splitEdge, findWaypointInsertionIndex } from "../../utils/edgeSplitting";
import { useEdgeStyler } from "./useEdgeStyler";
import { getRenderedEdgeSegments } from "../../utils/svgPathParser";

interface UseEdgeClickHandlerParams {
  screenToFlowPosition: (screenPosition: { x: number; y: number }) => { x: number; y: number };
  addNode: (node: CircuitNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  updateEdge: (edgeId: EdgeId, updates: Partial<CircuitEdge>) => void;
  deleteEdges: (edgeIds: EdgeId[]) => void;
  edges: CircuitEdge[];
}

/**
 * Generate a unique junction node ID
 */
function generateJunctionId(): NodeId {
  const timestamp = Date.now().toString();
  return `J${timestamp}` as NodeId;
}

/**
 * Generate a unique edge ID
 * Using Math.random() is safe here for generating unique IDs (not for security)
 */
function generateEdgeId(): EdgeId {
  const timestamp = Date.now().toString();
  // eslint-disable-next-line sonarjs/pseudo-random
  const random = Math.floor(Math.random() * 1000000).toString();
  return `edge-${timestamp}-${random}` as EdgeId;
}

/**
 * 🏗️ Create a junction node at the specified position
 * Position is adjusted so the junction center (not top-left) is at the specified point
 */
function createJunctionNode(position: Position): JunctionNode {
  return {
    id: generateJunctionId(),
    type: "junction",
    position: {
      x: position.x,
      y: position.y,
    },
    width: 1,
    height: 1,
    data: {},
  };
}

/**
 * ✂️ Split an edge at a junction point using the edge splitting utility
 */
function splitEdgeAtJunction(params: {
  edgeId: EdgeId;
  junctionId: NodeId;
  junctionPosition: Position;
  edges: CircuitEdge[];
  deleteEdges: (ids: EdgeId[]) => void;
  addEdge: (edge: CircuitEdge) => void;
}): void {
  const { edgeId, junctionId, junctionPosition, edges, deleteEdges, addEdge } = params;

  const edgeToSplit = edges.find(e => e.id === edgeId);
  if (!edgeToSplit) return;

  const { edge1, edge2, deletedEdgeId } = splitEdge({
    originalEdge: edgeToSplit,
    junctionId,
    junctionPosition,
  });

  deleteEdges([deletedEdgeId]);
  addEdge(edge1);
  addEdge(edge2);
}

/**
 * 🔗 Create connection edge from source to junction
 */
function createConnectionEdge(
  sourceNode: NodeId,
  sourceHandle: string,
  junctionId: NodeId,
  waypoints: Waypoint[]
): CircuitEdge {
  return {
    id: generateEdgeId(),
    source: sourceNode,
    sourceHandle: sourceHandle,
    target: junctionId,
    targetHandle: "center",
    ...(waypoints.length > 0 && { waypoints }),
  };
}

/**
 * ✅ Validate connection state before processing edge click
 */
function validateConnectionState(
  isConnecting: boolean,
  sourceNode: NodeId | null,
  sourceHandle: string | null
): { valid: false } | { valid: true; sourceNode: NodeId; sourceHandle: string } {
  if (!isConnecting) {
    return { valid: false };
  }

  if (!sourceNode || !sourceHandle) {
    return { valid: false };
  }

  return { valid: true, sourceNode, sourceHandle };
}

/**
 * 🔍 Find and validate clicked edge
 */
function findClickedEdge(edgeId: string, edges: CircuitEdge[]): CircuitEdge | undefined {
  const clickedEdge = edges.find(e => e.id === edgeId);
  return clickedEdge;
}

/**
 * ✅ Check if Ctrl/Cmd key is pressed
 */
function isCtrlOrMetaPressed(event: React.MouseEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

/**
 * ✅ Check if Alt key is pressed in event
 */
function isAltKeyPressed(event: React.MouseEvent): boolean {
  return event.altKey;
}

/**
 * 📍 Find the exact position on the edge path for junction placement
 * For horizontal edges: use click.x and edge.y
 * For vertical edges: use edge.x and click.y
 */
function findEdgePathPosition(clickPosition: Position, edgeId: EdgeId): Position {
  const segmentInfo = findClickedSegment(clickPosition, edgeId);

  if (!segmentInfo) {
    return clickPosition;
  }

  if (segmentInfo.direction === "horizontal") {
    return { x: clickPosition.x, y: segmentInfo.startPoint.y };
  } else {
    return { x: segmentInfo.startPoint.x, y: clickPosition.y };
  }
}

type SegmentDirection = "horizontal" | "vertical" | "diagonal";

type PathSegment = {
  start: Position;
  end: Position;
  direction: SegmentDirection;
};

/**
 * 🎯 Check if a point is ON a segment (collinear and between endpoints)
 * For orthogonal paths:
 * - Horizontal: click.y ≈ segment.y AND click.x is between start.x and end.x
 * - Vertical: click.x ≈ segment.x AND click.y is between start.y and end.y
 */
function isPointOnSegment(point: Position, segmentStart: Position, segmentEnd: Position, threshold = 5): boolean {
  const isHorizontal = Math.abs(segmentStart.y - segmentEnd.y) < 0.1;
  const isVertical = Math.abs(segmentStart.x - segmentEnd.x) < 0.1;

  if (isHorizontal) {
    const isOnLine = Math.abs(point.y - segmentStart.y) < threshold;
    const minX = Math.min(segmentStart.x, segmentEnd.x);
    const maxX = Math.max(segmentStart.x, segmentEnd.x);
    const isBetween = point.x >= minX - threshold && point.x <= maxX + threshold;
    return isOnLine && isBetween;
  }

  if (isVertical) {
    const isOnLine = Math.abs(point.x - segmentStart.x) < threshold;
    const minY = Math.min(segmentStart.y, segmentEnd.y);
    const maxY = Math.max(segmentStart.y, segmentEnd.y);
    const isBetween = point.y >= minY - threshold && point.y <= maxY + threshold;
    return isOnLine && isBetween;
  }

  return false;
}

/**
 * 🔍 Find which segment contains the click point
 * Uses geometric validation (point-on-segment) rather than distance
 */
function findSegmentContainingPoint(segments: PathSegment[], point: Position): number | null {
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;

    if (isPointOnSegment(point, segment.start, segment.end)) {
      return i;
    }
  }
  return null;
}

/**
 * 🧭 Normalize segment direction
 */
function normalizeSegmentDirection(segment: PathSegment): "horizontal" | "vertical" {
  const isHorizontal = Math.abs(segment.start.y - segment.end.y) < 0.1;
  if (isHorizontal) {
    return "horizontal";
  }
  return "vertical";
}

/**
 * 🔍 Find which segment was clicked using the actual rendered SVG path
 * Uses geometric validation to ensure the click is ON the segment
 */
function findClickedSegment(
  clickPosition: Position,
  edgeId: EdgeId
): {
  insertIndex: number;
  direction: "horizontal" | "vertical";
  startPoint: Position;
  endPoint: Position;
  startType: "handle" | "waypoint";
  endType: "handle" | "waypoint";
} | null {
  const segments = getRenderedEdgeSegments(edgeId);

  if (segments.length === 0) {
    return null;
  }

  const segmentIndex = findSegmentContainingPoint(segments, clickPosition);
  if (segmentIndex === null) {
    return null;
  }

  const clickedSegment = segments[segmentIndex];
  if (!clickedSegment) {
    return null;
  }

  const direction = normalizeSegmentDirection(clickedSegment);
  const startType = segmentIndex === 0 ? "handle" : "waypoint";
  const endType = segmentIndex === segments.length - 1 ? "handle" : "waypoint";

  return {
    insertIndex: segmentIndex,
    direction,
    startPoint: clickedSegment.start,
    endPoint: clickedSegment.end,
    startType,
    endType,
  };
}

/**
 * 📍 Hook for handling Alt+Click on edges to add waypoints
 */
function useAltClickHandler(edges: CircuitEdge[], updateEdge: (edgeId: EdgeId, updates: Partial<CircuitEdge>) => void) {
  return useCallback(
    (edgeId: EdgeId, clickPosition: Position) => {
      const edge = edges.find(e => e.id === edgeId);
      if (!edge) {
        return;
      }

      // Find edge path position using rendered SVG
      const edgePathPosition = findEdgePathPosition(clickPosition, edgeId);

      const existingWaypoints = edge.data?.waypoints ?? [];

      // Find which segment was clicked using the actual rendered SVG path
      const segmentInfo = findClickedSegment(clickPosition, edgeId);

      if (!segmentInfo) {
        return;
      }

      // Use the same logic as edge splitting to find correct insertion index
      const insertIndex = findWaypointInsertionIndex(edgeId, existingWaypoints, edgePathPosition);

      if (insertIndex === null) {
        return;
      }

      // Create new waypoint with direction
      const newWaypoint: Waypoint = {
        x: edgePathPosition.x,
        y: edgePathPosition.y,
        direction: segmentInfo.direction,
        auto: false, // User manually added this
      };

      // Insert waypoint at the correct position
      const newWaypoints = [
        ...existingWaypoints.slice(0, insertIndex),
        newWaypoint,
        ...existingWaypoints.slice(insertIndex),
      ];

      // Update edge with new waypoints
      updateEdge(edgeId, { data: { waypoints: newWaypoints } });
    },
    [edges, updateEdge]
  );
}

/**
 * 🎯 Hook for handling Ctrl+Click to start connection from edge
 */
function useCtrlClickHandler(params: {
  edges: CircuitEdge[];
  addNode: (node: JunctionNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  deleteEdges: (ids: EdgeId[]) => void;
}) {
  const { edges, addNode, addEdge, deleteEdges } = params;

  return useCallback(
    (edgeId: EdgeId, clickPosition: Position) => {
      const edge = edges.find(e => e.id === edgeId);
      if (!edge) return;

      // Find edge path position using rendered SVG
      const edgePathPosition = findEdgePathPosition(clickPosition, edgeId);

      const junctionNode = createJunctionNode(edgePathPosition);
      addNode(junctionNode);

      splitEdgeAtJunction({
        edgeId,
        junctionId: junctionNode.id,
        junctionPosition: edgePathPosition,
        edges,
        deleteEdges,
        addEdge,
      });

      useConnectionStore.getState().startConnecting(junctionNode.id, "center", edgePathPosition);
    },
    [edges, addNode, addEdge, deleteEdges]
  );
}

/**
 * 🏗️ Create junction and complete connection
 */
function createJunctionAndConnect(params: {
  clickedEdge: CircuitEdge;
  flowPosition: Position;
  sourceNodeId: NodeId;
  sourceHandle: string;
  finalWaypoints: Waypoint[];
  edges: CircuitEdge[];
  addNode: (node: CircuitNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  deleteEdges: (edgeIds: EdgeId[]) => void;
}): void {
  const {
    clickedEdge,
    flowPosition,
    sourceNodeId,
    sourceHandle,
    finalWaypoints,
    edges,
    addNode,
    addEdge,
    deleteEdges,
  } = params;

  // Find exact position on edge path using rendered SVG
  const exactPosition = findEdgePathPosition(flowPosition, clickedEdge.id);

  // Create junction node at exact edge position
  const junctionNode = createJunctionNode(exactPosition);
  addNode(junctionNode);

  // Split the clicked edge at junction
  splitEdgeAtJunction({
    edgeId: clickedEdge.id,
    junctionId: junctionNode.id,
    junctionPosition: exactPosition,
    edges,
    deleteEdges,
    addEdge,
  });

  // Create connection edge from source to junction
  const connectionEdge = createConnectionEdge(sourceNodeId, sourceHandle, junctionNode.id, finalWaypoints);
  addEdge(connectionEdge);
}

/**
 * 🔗 Hook for handling connection mode edge click
 */
function useConnectionModeClickHandler(params: {
  sourceNode: NodeId | null;
  sourceHandle: string | null;
  waypoints: Waypoint[];
  endConnecting: () => {
    waypoints: Waypoint[];
    temporaryJunction: { position: Position; edgeId: string } | null;
  } | null;
  edges: CircuitEdge[];
  addNode: (node: CircuitNode) => void;
  addEdge: (edge: CircuitEdge) => void;
  deleteEdges: (edgeIds: EdgeId[]) => void;
}) {
  const { sourceNode, sourceHandle, waypoints, endConnecting, edges, addNode, addEdge, deleteEdges } = params;

  return useCallback(
    (event: React.MouseEvent, edge: CircuitEdge, flowPosition: Position) => {
      const validationResult = validateConnectionState(true, sourceNode, sourceHandle);
      if (!validationResult.valid) {
        return;
      }

      const { sourceNode: validSourceNode, sourceHandle: validSourceHandle } = validationResult;

      const clickedEdge = findClickedEdge(edge.id, edges);
      if (!clickedEdge) {
        return;
      }

      const connectionResult = endConnecting();
      const finalWaypoints = connectionResult?.waypoints ?? waypoints;

      createJunctionAndConnect({
        clickedEdge,
        flowPosition,
        sourceNodeId: validSourceNode,
        sourceHandle: validSourceHandle,
        finalWaypoints,
        edges,
        addNode,
        addEdge,
        deleteEdges,
      });

      event.stopPropagation();
    },
    [sourceNode, sourceHandle, waypoints, endConnecting, edges, addNode, addEdge, deleteEdges]
  );
}

/**
 * 🖱️ Hook for composing edge click behavior
 */
function useEdgeClickCallback(params: {
  isConnecting: boolean;
  screenToFlowPosition: (screenPosition: { x: number; y: number }) => { x: number; y: number };
  handleAltClick: (edgeId: EdgeId, clickPosition: Position) => void;
  handleCtrlClick: (edgeId: EdgeId, clickPosition: Position) => void;
  handleConnectionClick: (event: React.MouseEvent, edge: CircuitEdge, flowPosition: Position) => void;
}) {
  const { isConnecting, screenToFlowPosition, handleAltClick, handleCtrlClick, handleConnectionClick } = params;

  return useCallback(
    (event: React.MouseEvent, edge: CircuitEdge) => {
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const isCtrlClick = isCtrlOrMetaPressed(event);
      const isAltClick = isAltKeyPressed(event);

      // CASE 1: Alt+Click when NOT in connection mode - ADD waypoint to edge
      if (!isConnecting && isAltClick) {
        event.stopPropagation();
        handleAltClick(edge.id, flowPosition);
        return;
      }

      // CASE 2: Ctrl+Click when NOT in connection mode - START connection from edge
      if (!isConnecting && isCtrlClick) {
        event.stopPropagation();
        handleCtrlClick(edge.id, flowPosition);
        return;
      }

      // CASE 3: Click during connection mode - END connection at edge
      if (isConnecting) {
        handleConnectionClick(event, edge, flowPosition);
      }
    },
    [isConnecting, screenToFlowPosition, handleAltClick, handleCtrlClick, handleConnectionClick]
  );
}

export function useEdgeClickHandler({
  screenToFlowPosition,
  addNode,
  addEdge,
  updateEdge,
  deleteEdges,
  edges,
}: UseEdgeClickHandlerParams) {
  const theme = useTheme();
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const sourceNode = useConnectionStore(state => state.sourceNode);
  const sourceHandle = useConnectionStore(state => state.sourceHandle);
  const waypoints = useConnectionStore(state => state.waypoints);
  const endConnecting = useConnectionStore(state => state.endConnecting);

  // Edge styling and hover handlers
  const { onEdgeMouseEnter, onEdgeMouseLeave, getEdgeStyle, isCtrlPressed, isAltPressed } = useEdgeStyler(
    theme,
    isConnecting
  );

  // Click handlers
  const handleAltClick = useAltClickHandler(edges, updateEdge);
  const handleCtrlClick = useCtrlClickHandler({ edges, addNode, addEdge, deleteEdges });
  const handleConnectionClick = useConnectionModeClickHandler({
    sourceNode,
    sourceHandle,
    waypoints,
    endConnecting,
    edges,
    addNode,
    addEdge,
    deleteEdges,
  });

  const onEdgeClick = useEdgeClickCallback({
    isConnecting,
    screenToFlowPosition,
    handleAltClick,
    handleCtrlClick,
    handleConnectionClick,
  });

  return {
    onEdgeClick,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    getEdgeStyle,
    isCtrlPressed,
    isAltPressed,
  };
}
