/**
 * 📊 Analysis Pane Component
 *
 * Main analysis pane with vertical split layout:
 * - Top section (40%): AnalysisControls + GraphVisualization
 * - Bottom section (60%): ErrorDisplay / LoadingSpinner / ResultsDisplay
 *
 * Consumes ValidationContext, CalculationContext, and PresentationContext.
 */

import { useMemo, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useValidation } from "../../contexts/ValidationContext";
import { useCalculation } from "../../contexts/CalculationContext";
import { usePresentation } from "../../contexts/PresentationContext";
import { AnalysisControls } from "./AnalysisControls";
import { handleDefinitionClick } from "./CircuitGraphEngine/handleDefinitionClick";
import { ResultsDisplay } from "./ResultsDisplay";
import { ErrorDisplay } from "./ErrorDisplay";
import { LoadingSpinner } from "./LoadingSpinner";
import { CalculationErrorDialog } from "./CalculationErrorDialog";
import { CircuitGraphFlowContainer } from "./CircuitGraphEngine";

/**
 * 🗺️ Graph visualization component with interactive features
 */
function GraphVisualization() {
  const { analysisGraph } = useValidation();
  const { visualizationData, setHighlightedElements } = usePresentation();

  const graphStyle = useMemo(
    () => ({
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "background.paper",
      color: "text.secondary",
      minHeight: 0,
    }),
    []
  );

  /**
   * 🔍 Handle element click - highlights loops/cut-sets or individual elements
   */
  const handleElementClick = useCallback(
    (elementId: string) => {
      const branchIds = handleDefinitionClick(elementId, visualizationData);
      setHighlightedElements(branchIds);
    },
    [visualizationData, setHighlightedElements]
  );

  // Show placeholder if no graph available
  if (!analysisGraph) {
    return (
      <Box sx={graphStyle}>
        <Typography variant="body2">No circuit graph available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
      <CircuitGraphFlowContainer
        analysisGraph={analysisGraph}
        visualizationData={visualizationData}
        onElementClick={handleElementClick}
      />
    </Box>
  );
}

/**
 * 📊 Main Analysis Pane component
 */
export function AnalysisPane() {
  const { validation, isValidating } = useValidation();
  const { isCalculating, error: calculationError } = useCalculation();

  /**
   * ❌ Close the error dialog
   */
  const handleCloseErrorDialog = useCallback(() => {
    // Error dialog will close when calculationError becomes null
    // This is handled by the CalculationContext
  }, []);

  const topSectionStyle = useMemo(
    () => ({
      height: "100%",
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
    }),
    []
  );

  const bottomSectionStyle = useMemo(
    () => ({
      height: "100%",
      overflow: "hidden",
      bgcolor: "background.default",
    }),
    []
  );

  const resizeHandleStyle = useMemo(
    () => ({
      height: "4px",
      bgcolor: "divider",
      cursor: "row-resize",
      "&:hover": {
        bgcolor: "primary.main",
      },
      "&[data-resize-handle-active]": {
        bgcolor: "primary.main",
      },
    }),
    []
  );

  // Determine what to show in the bottom section
  const renderBottomSection = () => {
    if (isValidating || isCalculating) {
      return <LoadingSpinner />;
    }

    if (!validation.isValid) {
      return <ErrorDisplay validation={validation} />;
    }

    return <ResultsDisplay />;
  };

  return (
    <>
      <PanelGroup direction="vertical">
        <Panel defaultSize={40} minSize={5} maxSize={95}>
          <Box sx={topSectionStyle}>
            <AnalysisControls />
            <GraphVisualization />
          </Box>
        </Panel>

        <PanelResizeHandle>
          <Box sx={resizeHandleStyle} />
        </PanelResizeHandle>

        <Panel defaultSize={60} minSize={40} maxSize={80}>
          <Box sx={bottomSectionStyle}>{renderBottomSection()}</Box>
        </Panel>
      </PanelGroup>

      {calculationError !== null && (
        <CalculationErrorDialog
          open={true}
          errorMessage={calculationError}
          technicalDetails={calculationError}
          onClose={handleCloseErrorDialog}
        />
      )}
    </>
  );
}
