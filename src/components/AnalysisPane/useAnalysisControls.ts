/**
 * 🎮 Custom hook for analysis controls logic
 *
 * Manages state and handlers for the analysis controls toolbar.
 */

import { useState, useCallback, useMemo } from "react";
import type { SelectChangeEvent } from "@mui/material";
import { useValidation } from "../../contexts/ValidationContext";
import { useCalculation } from "../../contexts/CalculationContext";
import { usePresentation } from "../../contexts/PresentationContext";
import type { VisualizationMode } from "../../contexts/PresentationContext";
import { logger } from "../../utils/logger";

/**
 * 💡 Get tooltip text for Run Analysis button
 */
function getRunButtonTooltip(isSolvable: boolean, isCalculating: boolean): string {
  if (!isSolvable) {
    return "Fix validation errors first";
  }
  if (isCalculating) {
    return "Analysis in progress...";
  }
  return "Run circuit analysis";
}

/**
 * 🎮 Hook for managing analysis controls state and handlers
 */
export function useAnalysisControls() {
  const { validation, analysisGraph } = useValidation();
  const { isCalculating, runAnalysis } = useCalculation();
  const { visualizationData, setVisualizationMode } = usePresentation();

  // Local state for user selections
  const [selectedMethod, setSelectedMethod] = useState<"nodal" | "loop" | "both">("nodal");

  // Derive selected tree ID from analysis graph
  const selectedTreeId = useMemo(() => analysisGraph?.selectedTreeId ?? "", [analysisGraph?.selectedTreeId]);

  // Get available spanning trees
  const availableTrees = useMemo(() => analysisGraph?.allSpanningTrees ?? [], [analysisGraph?.allSpanningTrees]);

  // Determine if Run Analysis button should be disabled
  const isRunDisabled = useMemo(() => !validation.isSolvable || isCalculating, [validation.isSolvable, isCalculating]);

  // Get tooltip text for Run Analysis button
  const runButtonTooltip = useMemo(
    () => getRunButtonTooltip(validation.isSolvable, isCalculating),
    [validation.isSolvable, isCalculating]
  );

  /**
   * 🚀 Handle Run Analysis button click
   */
  const handleRunAnalysis = useCallback(() => {
    if (!validation.isSolvable) {
      logger.warn({ caller: "useAnalysisControls" }, "Cannot run analysis: circuit validation failed");
      return;
    }

    logger.info({ caller: "useAnalysisControls" }, "Running analysis", { method: selectedMethod });

    runAnalysis(selectedMethod);
  }, [validation.isSolvable, selectedMethod, runAnalysis]);

  /**
   * 🔄 Handle method selection change
   */
  const handleMethodChange = useCallback((event: SelectChangeEvent) => {
    const method = event.target.value as "nodal" | "loop" | "both";
    setSelectedMethod(method);
    logger.debug({ caller: "useAnalysisControls" }, "Method changed", { method });
  }, []);

  /**
   * 🌳 Handle spanning tree selection change
   */
  const handleTreeChange = useCallback((event: SelectChangeEvent) => {
    const treeId = event.target.value;
    logger.debug({ caller: "useAnalysisControls" }, "Tree changed", { treeId });
  }, []);

  /**
   * 🎨 Handle visualization mode tab change
   */
  const handleVisualizationModeChange = useCallback(
    (_event: React.SyntheticEvent, newMode: VisualizationMode) => {
      setVisualizationMode(newMode);
      logger.debug({ caller: "useAnalysisControls" }, "Visualization mode changed", { mode: newMode });
    },
    [setVisualizationMode]
  );

  return {
    selectedMethod,
    selectedTreeId,
    isCalculating,
    isRunDisabled,
    availableTrees,
    runButtonTooltip,
    visualizationMode: visualizationData.mode,
    handleRunAnalysis,
    handleMethodChange,
    handleTreeChange,
    handleVisualizationModeChange,
  };
}
