/**
 * 📊 ModeInfoPanel - Displays mode-specific information and statistics.
 *
 * Shows different information based on the current visualization mode:
 * - Tree mode: Statistics about twigs and links
 * - Loops mode: Loop equations and count
 * - Cut-sets mode: Cut-set equations and count
 * - Results mode: Color scale legend
 */

import React, { useMemo } from "react";
import { Box, Typography, Paper, Divider, Chip } from "@mui/material";
import type {
  VisualizationMode,
  GraphVisualizationData,
  LoopDefinition,
  CutSetDefinition,
} from "../../../contexts/PresentationContext";
import type { AnalysisGraph, SpanningTree } from "../../../types/analysis";

/**
 * 📊 Renders graph mode information.
 */
function renderGraphMode(analysisGraph: AnalysisGraph): React.ReactElement {
  const nodeCount = analysisGraph.nodes.length;
  const branchCount = analysisGraph.branches.length;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Circuit Graph
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Nodes: {nodeCount}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Branches: {branchCount}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Directed graph showing all circuit components with arrows indicating current direction.
      </Typography>
    </Box>
  );
}

/**
 * 🌳 Renders tree mode information.
 */
function renderTreeMode(analysisGraph: AnalysisGraph, selectedTree: SpanningTree): React.ReactElement {
  const twigCount = selectedTree.twigBranchIds.length;
  const linkCount = selectedTree.linkBranchIds.length;
  const nodeCount = analysisGraph.nodes.length;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Spanning Tree
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Twigs (Tree branches): {twigCount} = N-1 = {nodeCount.toString()}-1
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Links (Co-tree): {linkCount} = B-N+1 = {analysisGraph.branches.length.toString()}-{nodeCount.toString()}+1
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Typography variant="body2" color="text.secondary">
        <strong>Twigs:</strong> Solid green lines forming the spanning tree
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <strong>Links:</strong> Dashed red lines (co-tree branches)
      </Typography>
    </Box>
  );
}

/**
 * 🔄 Renders loops mode information.
 */
function renderLoopsMode(
  analysisGraph: AnalysisGraph,
  loopDefinitions: LoopDefinition[],
  onElementClick: ((elementId: string) => void) | undefined,
  sectionStyle: Record<string, unknown>
): React.ReactElement {
  const loopCount = loopDefinitions.length;
  const nodeCount = analysisGraph.nodes.length;
  const branchCount = analysisGraph.branches.length;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Fundamental Loops
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {`Number of loops: L = B-N+1 = ${branchCount.toString()}-${nodeCount.toString()}+1 = ${loopCount.toString()}`}
      </Typography>
      <Divider sx={{ my: 1 }} />
      {loopDefinitions.map((loop, index) => (
        <Box
          key={loop.id}
          sx={sectionStyle}
          onClick={() => onElementClick?.(loop.id)}
          style={{ cursor: onElementClick ? "pointer" : "default" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Chip
              label={`Loop ${(index + 1).toString()}`}
              size="small"
              sx={{
                backgroundColor: loop.color,
                color: "#fff",
                fontWeight: "bold",
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
            {loop.equation}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * ✂️ Renders cut-sets mode information.
 */
function renderCutSetsMode(
  analysisGraph: AnalysisGraph,
  cutSetDefinitions: CutSetDefinition[],
  onElementClick: ((elementId: string) => void) | undefined,
  sectionStyle: Record<string, unknown>
): React.ReactElement {
  const cutSetCount = cutSetDefinitions.length;
  const nodeCount = analysisGraph.nodes.length;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Fundamental Cut-Sets
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {`Number of cut-sets: N-1 = ${nodeCount.toString()}-1 = ${cutSetCount.toString()}`}
      </Typography>
      <Divider sx={{ my: 1 }} />
      {cutSetDefinitions.map((cutSet, index) => (
        <Box
          key={cutSet.id}
          sx={sectionStyle}
          onClick={() => onElementClick?.(cutSet.id)}
          style={{ cursor: onElementClick ? "pointer" : "default" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Chip
              label={`Cut-set ${(index + 1).toString()}`}
              size="small"
              sx={{
                backgroundColor: cutSet.color,
                color: "#fff",
                fontWeight: "bold",
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
            {cutSet.equation}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * 📈 Renders results mode information.
 */
function renderResultsMode(branchResults: Map<string, { current: number; voltage: number }>): React.ReactElement {
  const resultsArray = Array.from(branchResults.values());
  const currents = resultsArray.map(r => Math.abs(r.current));
  const minCurrent = Math.min(...currents);
  const maxCurrent = Math.max(...currents);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Analysis Results
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Branch currents and voltages are displayed on the graph.
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Typography variant="body2" color="text.secondary">
        <strong>Current Range:</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Min: {minCurrent.toFixed(3)} A
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Max: {maxCurrent.toFixed(3)} A
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: "0.75rem" }}>
        Hover over branches to see detailed current and voltage values.
      </Typography>
    </Box>
  );
}

/**
 * Props for ModeInfoPanel component.
 */
export interface ModeInfoPanelProps {
  /** Current visualization mode */
  readonly mode: VisualizationMode;
  /** Visualization data with definitions and results */
  readonly visualizationData: GraphVisualizationData;
  /** The analysis graph */
  readonly analysisGraph: AnalysisGraph;
  /** Callback when an element is clicked */
  readonly onElementClick?: ((elementId: string) => void) | undefined;
}

/**
 * 🌳 Handles tree mode rendering with validation.
 */
function handleTreeMode(
  analysisGraph: AnalysisGraph,
  selectedTree: SpanningTree | undefined
): React.ReactElement | null {
  if (!selectedTree) {
    return null;
  }
  return renderTreeMode(analysisGraph, selectedTree);
}

/**
 * 🔄 Handles loops mode rendering with validation.
 */
function handleLoopsMode(
  analysisGraph: AnalysisGraph,
  visualizationData: GraphVisualizationData,
  onElementClick: ((elementId: string) => void) | undefined,
  sectionStyle: Record<string, unknown>
): React.ReactElement | null {
  if (!visualizationData.loopDefinitions) {
    return null;
  }
  return renderLoopsMode(analysisGraph, visualizationData.loopDefinitions, onElementClick, sectionStyle);
}

/**
 * ✂️ Handles cut-sets mode rendering with validation.
 */
function handleCutSetsMode(
  analysisGraph: AnalysisGraph,
  visualizationData: GraphVisualizationData,
  onElementClick: ((elementId: string) => void) | undefined,
  sectionStyle: Record<string, unknown>
): React.ReactElement | null {
  if (!visualizationData.cutSetDefinitions) {
    return null;
  }
  return renderCutSetsMode(analysisGraph, visualizationData.cutSetDefinitions, onElementClick, sectionStyle);
}

/**
 * 📈 Handles results mode rendering with validation.
 */
function handleResultsMode(visualizationData: GraphVisualizationData): React.ReactElement | null {
  if (!visualizationData.branchResults) {
    return null;
  }
  return renderResultsMode(visualizationData.branchResults);
}

/**
 * 🎨 Renders content based on the current visualization mode.
 */
function renderModeContent(
  mode: VisualizationMode,
  visualizationData: GraphVisualizationData,
  analysisGraph: AnalysisGraph,
  selectedTree: SpanningTree | undefined,
  onElementClick: ((elementId: string) => void) | undefined,
  sectionStyle: Record<string, unknown>
): React.ReactElement | null {
  if (mode === "graph") {
    return renderGraphMode(analysisGraph);
  }

  if (mode === "tree") {
    return handleTreeMode(analysisGraph, selectedTree);
  }

  if (mode === "loops") {
    return handleLoopsMode(analysisGraph, visualizationData, onElementClick, sectionStyle);
  }

  if (mode === "cutsets") {
    return handleCutSetsMode(analysisGraph, visualizationData, onElementClick, sectionStyle);
  }

  // mode === 'results'
  return handleResultsMode(visualizationData);
}

/**
 * 📊 ModeInfoPanel - Displays mode-specific information.
 */
export function ModeInfoPanel({
  mode,
  visualizationData,
  analysisGraph,
  onElementClick,
}: ModeInfoPanelProps): React.ReactElement | null {
  // Memoize styles
  const containerStyle = useMemo(
    () => ({
      p: 2,
      backgroundColor: "background.paper",
      border: 1,
      borderColor: "divider",
      borderRadius: 1,
      maxHeight: "300px",
      overflowY: "auto" as const,
    }),
    []
  );

  const sectionStyle = useMemo(
    () => ({
      mb: 2,
    }),
    []
  );

  // Get selected tree
  const selectedTree = useMemo(
    () => analysisGraph.allSpanningTrees.find(tree => tree.id === analysisGraph.selectedTreeId),
    [analysisGraph]
  );

  // Render content based on mode
  const renderContent = useMemo(
    () => renderModeContent(mode, visualizationData, analysisGraph, selectedTree, onElementClick, sectionStyle),
    [mode, visualizationData, analysisGraph, selectedTree, onElementClick, sectionStyle]
  );

  // Don't render if no content
  if (!renderContent) {
    return null;
  }

  return <Paper sx={containerStyle}>{renderContent}</Paper>;
}
