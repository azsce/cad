/**
 * 🎯 Analysis Pane Wrapper Component
 *
 * Wraps the Analysis Pane with three nested context providers:
 * ValidationProvider → CalculationProvider → PresentationProvider
 *
 * Shows an empty state when no circuit is selected.
 */

import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
} from "@mui/icons-material";
import { useUIStore } from "../../store/uiStore";
import { useCircuitStore } from "../../store/circuitStore";
import { ValidationProvider, useValidation } from "../../contexts/ValidationContext";
import { CalculationProvider, useCalculation } from "../../contexts/CalculationContext";
import { PresentationProvider } from "../../contexts/PresentationContext";
import { AnalysisPane } from "./AnalysisPane";
import { EmptyState } from "./EmptyState";
import type { AnalysisGraph } from "../../types/analysis";

/**
 * 🔗 Content component that consumes ValidationContext and passes props to CalculationProvider
 */
function AnalysisPaneContent({ circuitName }: { readonly circuitName: string }) {
  const { analysisGraph, validation } = useValidation();

  return (
    <CalculationProvider analysisGraph={analysisGraph} isSolvable={validation.isSolvable}>
      <PresentationWrapper circuitName={circuitName} analysisGraph={analysisGraph} />
    </CalculationProvider>
  );
}

/**
 * 🔗 Wrapper component that consumes CalculationContext and passes props to PresentationProvider
 */
function PresentationWrapper({
  circuitName,
  analysisGraph,
}: {
  readonly circuitName: string;
  readonly analysisGraph: AnalysisGraph | null;
}) {
  const { result } = useCalculation();

  return (
    <PresentationProvider result={result} analysisGraph={analysisGraph} circuitName={circuitName}>
      <AnalysisPane />
    </PresentationProvider>
  );
}

/**
 * 🎯 Main wrapper component for the Analysis Pane
 */
export function AnalysisPaneWrapper() {
  const isExpanded = useUIStore(state => state.isRightPanelExpanded);
  const isCollapsed = useUIStore(state => state.isRightPanelCollapsed);
  const toggleExpand = useUIStore(state => state.toggleRightPanelExpand);
  const toggleCollapse = useUIStore(state => state.toggleRightPanelCollapse);
  const activeCircuit = useCircuitStore(state => state.getActiveCircuit());

  const containerStyle = useMemo(
    () => ({
      height: "100%",
      display: "flex",
      flexDirection: "column" as const,
      bgcolor: "background.default",
      color: "text.primary",
    }),
    []
  );

  const headerStyle = useMemo(
    () => ({
      p: 2,
      borderBottom: 1,
      borderColor: "divider",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }),
    []
  );

  const contentStyle = useMemo(
    () => ({
      flex: 1,
      overflow: "hidden",
    }),
    []
  );

  const collapsedStyle = useMemo(
    () => ({
      height: "100%",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      pt: 2,
      bgcolor: "background.default",
      color: "text.primary",
    }),
    []
  );

  if (isCollapsed) {
    return (
      <Box sx={collapsedStyle}>
        <Tooltip title="Expand panel">
          <IconButton onClick={toggleCollapse} size="small">
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={containerStyle}>
      <Box sx={headerStyle}>
        <Typography variant="h6" component="h2">
          Analysis
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={isExpanded ? "Exit fullscreen" : "Expand to fullscreen"}>
            <IconButton onClick={toggleExpand} size="small">
              {isExpanded ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Collapse panel">
            <IconButton onClick={toggleCollapse} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={contentStyle}>
        {activeCircuit ? (
          <ValidationProvider circuit={activeCircuit}>
            <AnalysisPaneContent circuitName={activeCircuit.name} />
          </ValidationProvider>
        ) : (
          <EmptyState />
        )}
      </Box>
    </Box>
  );
}
