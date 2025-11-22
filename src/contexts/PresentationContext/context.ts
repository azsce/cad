/**
 * PresentationContext definition.
 * Separated from the provider for Fast Refresh compatibility.
 */

import { createContext } from "react";

/**
 * Visualization mode for the graph display.
 */
export type VisualizationMode = "graph" | "tree" | "loops" | "cutsets" | "results";

/**
 * Definition of a fundamental loop for visualization.
 */
export interface LoopDefinition {
  /** Unique identifier for the loop */
  id: string;
  /** IDs of branches that form this loop */
  branchIds: string[];
  /** Direction of each branch in the loop */
  direction: Map<string, "forward" | "reverse">;
  /** Color for highlighting this loop */
  color: string;
  /** Human-readable equation for this loop */
  equation: string;
}

/**
 * Definition of a fundamental cut-set for visualization.
 */
export interface CutSetDefinition {
  /** Unique identifier for the cut-set */
  id: string;
  /** IDs of branches that form this cut-set */
  branchIds: string[];
  /** Direction of each branch in the cut-set */
  direction: Map<string, "forward" | "reverse">;
  /** Color for highlighting this cut-set */
  color: string;
  /** Human-readable equation for this cut-set */
  equation: string;
}

/**
 * Data for graph visualization with highlighting and overlays.
 */
export interface GraphVisualizationData {
  /** Current visualization mode */
  mode: VisualizationMode;
  /** IDs of elements to highlight in the current mode */
  highlightedElements: string[];
  /** Loop definitions for loop visualization mode */
  loopDefinitions?: LoopDefinition[];
  /** Cut-set definitions for cut-set visualization mode */
  cutSetDefinitions?: CutSetDefinition[];
  /** Branch results for results visualization mode */
  branchResults?: Map<string, { current: number; voltage: number }>;
}

/**
 * State provided by the PresentationContext.
 */
export interface PresentationContextState {
  /** Markdown-formatted report output */
  markdownOutput: string;
  /** Whether presentation is currently being generated */
  isGenerating: boolean;
  /** Visualization data for interactive graph display */
  visualizationData: GraphVisualizationData;
  /** Function to update the visualization mode */
  setVisualizationMode: (mode: VisualizationMode) => void;
  /** Function to highlight specific elements */
  setHighlightedElements: (elementIds: string[]) => void;
}

/**
 * Default visualization data.
 */
const DEFAULT_VISUALIZATION_DATA: GraphVisualizationData = {
  mode: "graph",
  highlightedElements: [],
};

/**
 * Default context state.
 */
const DEFAULT_STATE: PresentationContextState = {
  markdownOutput: "",
  isGenerating: false,
  visualizationData: DEFAULT_VISUALIZATION_DATA,
  setVisualizationMode: () => {
    throw new Error("PresentationContext not initialized");
  },
  setHighlightedElements: () => {
    throw new Error("PresentationContext not initialized");
  },
};

/**
 * React Context for presentation state.
 */
export const PresentationContext = createContext<PresentationContextState>(DEFAULT_STATE);
