/**
 * PresentationProvider - Formats calculation results for display.
 *
 * This provider:
 * - Accepts CalculationResult from CalculationContext
 * - Automatically generates presentation when result changes (useEffect)
 * - Calls generateMarkdownReport() to create formatted output
 * - Generates visualization data for Cytoscape
 * - Provides PresentationContextState with markdownOutput, isGenerating, and visualizationData
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { CalculationResult, AnalysisGraph } from "../../types/analysis";
import { logger } from "../../utils/logger";
import { PresentationContext } from "./context";
import type { PresentationContextState, VisualizationMode, GraphVisualizationData } from "./context";
import { generateMarkdownReport } from "../../analysis/utils/reportGenerator";
import { generateVisualizationData } from "./generateVisualizationData";

/**
 * Props for PresentationProvider.
 */
export interface PresentationProviderProps {
  /** The calculation result (from CalculationContext) */
  readonly result: CalculationResult | null;
  /** The analysis graph (from ValidationContext) */
  readonly analysisGraph: AnalysisGraph | null;
  /** Name of the circuit being analyzed */
  readonly circuitName: string;
  /** Child components */
  readonly children: React.ReactNode;
}

/**
 * ✅ PresentationProvider - Provides presentation state to child components.
 *
 * Automatically formats calculation results into:
 * - Markdown report with LaTeX equations
 * - Visualization data for interactive graph display
 *
 * Provides:
 * - Formatted markdown output
 * - Visualization data (loops, cut-sets, branch results)
 * - Loading state
 * - Functions to control visualization mode and highlighting
 */
export function PresentationProvider({
  result,
  analysisGraph,
  circuitName,
  children,
}: PresentationProviderProps): React.ReactElement {
  const [markdownOutput, setMarkdownOutput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [visualizationData, setVisualizationData] = useState<GraphVisualizationData>({
    mode: "graph",
    highlightedElements: [],
  });

  /**
   * 🎨 Updates the visualization mode.
   */
  const setVisualizationMode = useCallback((mode: VisualizationMode): void => {
    const caller = "setVisualizationMode";
    logger.debug({ caller }, "Updating visualization mode", { mode });

    setVisualizationData(prev => ({
      ...prev,
      mode,
      highlightedElements: [], // Clear highlights when changing mode
    }));
  }, []);

  /**
   * 🔍 Updates the highlighted elements.
   */
  const setHighlightedElements = useCallback((elementIds: string[]): void => {
    const caller = "setHighlightedElements";
    logger.debug({ caller }, "Updating highlighted elements", { count: elementIds.length });

    setVisualizationData(prev => ({
      ...prev,
      highlightedElements: elementIds,
    }));
  }, []);

  /**
   * 🚀 Automatically generate presentation when calculation result changes.
   *
   * This effect runs whenever:
   * - A new calculation result is available
   * - The analysis graph changes
   * - The circuit name changes
   */
  useEffect(() => {
    const caller = "PresentationProvider.useEffect";

    // Only generate if we have both result and graph
    if (!result || !analysisGraph) {
      logger.debug({ caller }, "No result or graph available, skipping presentation generation");
      setMarkdownOutput("");
      setVisualizationData({
        mode: "graph",
        highlightedElements: [],
      });
      return;
    }

    logger.info({ caller }, "Starting presentation generation", {
      method: result.method,
      circuitName,
    });

    setIsGenerating(true);

    try {
      // Generate markdown report
      const markdown = generateMarkdownReport(result, analysisGraph, circuitName);
      setMarkdownOutput(markdown);

      // Generate visualization data
      const vizData = generateVisualizationData(result, analysisGraph);
      setVisualizationData(vizData);

      logger.info({ caller }, "Presentation generation completed successfully");
    } catch (err) {
      logger.error({ caller }, "Failed to generate presentation", err);

      // Set error message in markdown output
      const errorMessage = err instanceof Error ? err.message : "Unknown error during presentation generation";
      setMarkdownOutput(`# Error\n\nFailed to generate report: ${errorMessage}`);

      // Reset visualization data
      setVisualizationData({
        mode: "graph",
        highlightedElements: [],
      });
    } finally {
      setIsGenerating(false);
    }
  }, [result, analysisGraph, circuitName]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<PresentationContextState>(
    () => ({
      markdownOutput,
      isGenerating,
      visualizationData,
      setVisualizationMode,
      setHighlightedElements,
    }),
    [markdownOutput, isGenerating, visualizationData, setVisualizationMode, setHighlightedElements]
  );

  return <PresentationContext.Provider value={contextValue}>{children}</PresentationContext.Provider>;
}
