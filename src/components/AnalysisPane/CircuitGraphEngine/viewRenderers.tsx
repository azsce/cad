/**
 * 🎨 View renderer functions for different visualization modes.
 */

import React from "react";
import type { AnalysisGraph, NodeId, BranchId } from "../../../types/analysis";
import type { GraphVisualizationData } from "../../../contexts/PresentationContext";
import type { LayoutGraph } from "./types";
import {
  BasicGraphView,
  SpanningTreeView,
  LoopsView,
  CutSetsView,
  ResultsView,
} from "./views";

/**
 * Common props for all view renderers
 */
export interface ViewRendererProps {
  readonly layoutGraph: LayoutGraph;
  readonly visualizationData: GraphVisualizationData;
  readonly analysisGraph: AnalysisGraph;
  readonly color: string;
  readonly onNodeClick: (nodeId: NodeId) => void;
  readonly onEdgeClick: (branchId: BranchId) => void;
  readonly onNodeHover?: (nodeId: NodeId, event: React.MouseEvent) => void;
  readonly onEdgeHover?: (branchId: BranchId, event: React.MouseEvent) => void;
  readonly onMouseLeave?: () => void;
}

/**
 * 🎨 Render basic graph view.
 */
export function renderGraphView(props: ViewRendererProps): React.ReactElement {
  return (
    <BasicGraphView
      layoutGraph={props.layoutGraph}
      color={props.color}
      onNodeClick={props.onNodeClick}
      onEdgeClick={props.onEdgeClick}
      onNodeHover={props.onNodeHover}
      onEdgeHover={props.onEdgeHover}
      onMouseLeave={props.onMouseLeave}
    />
  );
}

/**
 * 🌳 Render spanning tree view.
 */
export function renderTreeView(props: ViewRendererProps): React.ReactElement {
  const selectedTree = props.analysisGraph.allSpanningTrees.find(
    (tree) => tree.id === props.analysisGraph.selectedTreeId
  );
  const twigBranchIds = new Set(selectedTree?.twigBranchIds ?? []);

  return (
    <SpanningTreeView
      layoutGraph={props.layoutGraph}
      twigBranchIds={twigBranchIds}
      color={props.color}
      onNodeClick={props.onNodeClick}
      onEdgeClick={props.onEdgeClick}
    />
  );
}

/**
 * 🔄 Render loops view.
 */
export function renderLoopsView(props: ViewRendererProps): React.ReactElement {
  return (
    <LoopsView
      layoutGraph={props.layoutGraph}
      loopDefinitions={props.visualizationData.loopDefinitions ?? []}
      highlightedElements={props.visualizationData.highlightedElements}
      color={props.color}
      onNodeClick={props.onNodeClick}
      onEdgeClick={props.onEdgeClick}
    />
  );
}

/**
 * ✂️ Render cut-sets view.
 */
export function renderCutSetsView(props: ViewRendererProps): React.ReactElement {
  return (
    <CutSetsView
      layoutGraph={props.layoutGraph}
      cutSetDefinitions={props.visualizationData.cutSetDefinitions ?? []}
      highlightedElements={props.visualizationData.highlightedElements}
      color={props.color}
      onNodeClick={props.onNodeClick}
      onEdgeClick={props.onEdgeClick}
    />
  );
}

/**
 * 📊 Render results view.
 */
export function renderResultsView(props: ViewRendererProps): React.ReactElement {
  return (
    <ResultsView
      layoutGraph={props.layoutGraph}
      branchResults={props.visualizationData.branchResults ?? new Map()}
      color={props.color}
      onNodeClick={props.onNodeClick}
      onEdgeClick={props.onEdgeClick}
    />
  );
}

/**
 * Type for view renderer function
 */
type ViewRenderer = (props: ViewRendererProps) => React.ReactElement;

/**
 * 🗺️ Lookup table mapping modes to renderer functions.
 */
export const VIEW_RENDERERS: Record<string, ViewRenderer | undefined> = {
  graph: renderGraphView,
  tree: renderTreeView,
  loops: renderLoopsView,
  cutsets: renderCutSetsView,
  results: renderResultsView,
};

/**
 * 🎯 Get renderer for a specific mode with fallback.
 */
export function getViewRenderer(mode: string): ViewRenderer {
  return VIEW_RENDERERS[mode] ?? renderGraphView;
}
