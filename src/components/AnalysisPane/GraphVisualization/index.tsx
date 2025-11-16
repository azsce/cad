/**
 * 🗺️ GraphVisualization - Interactive circuit graph display using Cytoscape.
 *
 * Renders the circuit analysis graph with multiple visualization modes:
 * 1. Circuit Graph - Basic directed graph with all nodes and branches
 * 2. Spanning Tree - Highlight twigs (green solid) vs links (red dashed)
 * 3. Loop Overlay - Color-coded fundamental loops with equations
 * 4. Cut-Set Overlay - Color-coded fundamental cut-sets with equations
 * 5. Results - Branch currents/voltages overlaid on graph
 *
 * Features:
 * - Zoom and pan enabled
 * - Hover tooltips showing component details
 * - Click handlers for selecting loops/cut-sets
 * - Export graph as PNG
 * - Mode-specific information panel with statistics and equations
 */

import React, { useRef, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type { Core } from 'cytoscape';
import { Box } from '@mui/material';
import type { AnalysisGraph } from '../../../types/analysis';
import type { GraphVisualizationData } from '../../../contexts/PresentationContext';
import { convertToCytoscapeElements } from './convertToCytoscapeElements';
import { createCytoscapeStylesheet } from './cytoscapeStylesheet';
import { createCytoscapeLayout } from './cytoscapeLayout';
import { ModeInfoPanel } from './ModeInfoPanel';
import { GraphControls } from './GraphControls';
import { useCytoscapeInit } from './useCytoscapeInit';
import { useLayoutUpdate } from './useLayoutUpdate';
import { useGraphControls } from './useGraphControls';

/**
 * Props for GraphVisualization component.
 */
export interface GraphVisualizationProps {
  /** The analysis graph to visualize */
  readonly analysisGraph: AnalysisGraph;
  /** Visualization data (mode, highlighting, etc.) */
  readonly visualizationData: GraphVisualizationData;
  /** Callback when an element is clicked */
  readonly onElementClick?: (elementId: string) => void;
}

/**
 * 🗺️ GraphVisualization - Main component for interactive graph display.
 *
 * Uses Cytoscape.js to render the circuit graph with academic conventions:
 * - Nodes labeled as n0, n1, n2, ...
 * - Edges labeled as a, b, c, ...
 * - Reference node as triangle (ground symbol)
 * - Directed edges with arrows
 * - Color-coded visualization modes
 */
export function GraphVisualization({
  analysisGraph,
  visualizationData,
  onElementClick,
}: GraphVisualizationProps): React.ReactElement {
  const cyRef = useRef<Core | null>(null);

  // Convert graph to Cytoscape elements
  const elements = useMemo(
    () => convertToCytoscapeElements(analysisGraph, visualizationData),
    [analysisGraph, visualizationData]
  );

  // Create stylesheet
  const stylesheet = useMemo(() => createCytoscapeStylesheet(), []);

  // Create layout configuration
  const layout = useMemo(
    () => createCytoscapeLayout(analysisGraph.referenceNodeId),
    [analysisGraph.referenceNodeId]
  );

  // Initialize Cytoscape and manage lifecycle
  const { handleCyInit } = useCytoscapeInit({
    cyRef,
    analysisGraph,
    visualizationData,
    onElementClick,
  });

  // Update layout on mode changes
  useLayoutUpdate({ cyRef, visualizationData, layout });

  // Graph control handlers
  const { handleZoomIn, handleZoomOut, handleFitView, handleExportPNG } =
    useGraphControls(cyRef);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        gap: 1,
      }}
    >
      {/* Graph canvas container */}
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          backgroundColor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          minHeight: 0,
        }}
      >
        {/* Cytoscape canvas */}
        <CytoscapeComponent
          elements={elements}
          stylesheet={stylesheet}
          layout={layout}
          cy={handleCyInit}
          style={{
            width: '100%',
            height: '100%',
          }}
        />

        {/* Control buttons */}
        <GraphControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onExportPNG={handleExportPNG}
        />
      </Box>

      {/* Mode-specific information panel */}
      {onElementClick ? (
        <ModeInfoPanel
          mode={visualizationData.mode}
          visualizationData={visualizationData}
          analysisGraph={analysisGraph}
          onElementClick={onElementClick}
        />
      ) : (
        <ModeInfoPanel
          mode={visualizationData.mode}
          visualizationData={visualizationData}
          analysisGraph={analysisGraph}
        />
      )}
    </Box>
  );
}

// Re-export ModeInfoPanel for convenience
export { ModeInfoPanel } from './ModeInfoPanel';
export type { ModeInfoPanelProps } from './ModeInfoPanel';
