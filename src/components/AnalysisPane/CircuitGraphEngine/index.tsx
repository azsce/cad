/**
 * Circuit Graph Engine - Main exports
 * 
 * This module exports the public API for the circuit graph visualization engine:
 * - CircuitGraphRenderer: React component for rendering graphs
 * - GraphLayoutEngine: Layout calculation engine
 * - View components: BasicGraphView, SpanningTreeView, etc.
 * - Interactive components: GraphControls, GraphTooltip, ModeInfoPanel
 * - Type definitions: LayoutGraph, LayoutNode, LayoutEdge, etc.
 */

// Main components
export { CircuitGraphRenderer } from "./CircuitGraphRenderer";
export type { CircuitGraphRendererProps, EdgeIntersection } from "./CircuitGraphRenderer";

// Note: GraphLayoutEngine and InvalidGraphError should be imported directly from
// ./engine/GraphLayoutEngine when needed (they are internal implementation details)

// Type definitions
export type {
  LayoutGraph,
  LayoutNode,
  LayoutEdge,
  Point,
  BoundingBox,
  ArrowPoint,
  PathData,
  EdgeKey,
  NodePlacementResult,
  EdgeRoutingResult,
  PathCandidate,
  LabelPosition,
  TooltipData,
} from "./types";

// View components
export { BasicGraphView } from "./views/BasicGraphView";
export type { BasicGraphViewProps } from "./views/BasicGraphView";
export { SpanningTreeView } from "./views/SpanningTreeView";
export type { SpanningTreeViewProps } from "./views/SpanningTreeView";
export { LoopsView } from "./views/LoopsView";
export type { LoopsViewProps } from "./views/LoopsView";
export { CutSetsView } from "./views/CutSetsView";
export type { CutSetsViewProps } from "./views/CutSetsView";
export { ResultsView } from "./views/ResultsView";
export type { ResultsViewProps } from "./views/ResultsView";

// Container components
export { CircuitGraphContainer } from "./CircuitGraphContainer";
export type { CircuitGraphContainerProps } from "./CircuitGraphContainer";
export { CircuitGraphFlowContainer } from "./CircuitGraphFlowContainer";
export type { CircuitGraphFlowContainerProps } from "./CircuitGraphFlowContainer";
export { GraphCanvasNode } from "./GraphCanvasNode";
export type { GraphCanvasNodeData } from "./GraphCanvasNode";

// Interactive components
export { GraphTooltip } from "./GraphTooltip";
export type { GraphTooltipProps } from "./GraphTooltip";
export { GraphControls } from "./GraphControls";
export { ModeInfoPanel } from "./ModeInfoPanel";
export type { ModeInfoPanelProps } from "./ModeInfoPanel";

// Note: useGraphControls, exportToPNG, and handleDefinitionClick are utility functions
// and should be imported directly from their respective files to avoid fast-refresh warnings
