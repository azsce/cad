/**
 * 🎮 Analysis Controls Toolbar
 *
 * Provides controls for running circuit analysis and configuring visualization:
 * - Run Analysis button with method selector
 * - Spanning tree selector
 * - Visualization mode tabs
 *
 * Integrates with CalculationContext and PresentationContext.
 */

import { useMemo } from "react";
import {
  Box,
  Button,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useAnalysisControls } from "./useAnalysisControls";

/**
 * 🎮 Analysis Controls Component
 */
export function AnalysisControls() {
  const {
    selectedMethod,
    selectedTreeId,
    isCalculating,
    isRunDisabled,
    availableTrees,
    runButtonTooltip,
    visualizationMode,
    handleRunAnalysis,
    handleMethodChange,
    handleTreeChange,
    handleVisualizationModeChange,
  } = useAnalysisControls();

  // Memoize styles
  const containerStyle = useMemo(
    () => ({
      p: 2,
      borderBottom: 1,
      borderColor: "divider",
      display: "flex",
      flexDirection: "column" as const,
      gap: 2,
    }),
    []
  );

  const topRowStyle = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      gap: 2,
      flexWrap: "wrap" as const,
    }),
    []
  );

  const formControlStyle = useMemo(
    () => ({
      minWidth: 150,
    }),
    []
  );

  return (
    <Box sx={containerStyle}>
      {/* Top row: Run button and selectors */}
      <Box sx={topRowStyle}>
        {/* Run Analysis Button */}
        <Tooltip title={runButtonTooltip}>
          <span>
            <Button
              variant="contained"
              color="primary"
              startIcon={isCalculating ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              onClick={handleRunAnalysis}
              disabled={isRunDisabled}
            >
              {isCalculating ? "Analyzing..." : "Run Analysis"}
            </Button>
          </span>
        </Tooltip>

        {/* Method Selector */}
        <FormControl sx={formControlStyle} size="small">
          <InputLabel id="method-select-label">Method</InputLabel>
          <Select
            labelId="method-select-label"
            id="method-select"
            value={selectedMethod}
            label="Method"
            onChange={handleMethodChange}
            disabled={isCalculating}
          >
            <MenuItem value="nodal">Nodal Analysis</MenuItem>
            <MenuItem value="loop">Loop Analysis</MenuItem>
            <MenuItem value="both">Both Methods</MenuItem>
          </Select>
        </FormControl>

        {/* Spanning Tree Selector */}
        <FormControl sx={formControlStyle} size="small" disabled={availableTrees.length === 0}>
          <InputLabel id="tree-select-label">Spanning Tree</InputLabel>
          <Select
            labelId="tree-select-label"
            id="tree-select"
            value={selectedTreeId}
            label="Spanning Tree"
            onChange={handleTreeChange}
            disabled={isCalculating || availableTrees.length === 0}
          >
            {availableTrees.map((tree, index) => (
              <MenuItem key={tree.id} value={tree.id}>
                {tree.description ?? `Tree ${String(index + 1)}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Bottom row: Visualization mode tabs */}
      <Tabs
        value={visualizationMode}
        onChange={handleVisualizationModeChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="visualization mode tabs"
      >
        <Tab label="Graph" value="graph" />
        <Tab label="Tree" value="tree" />
        <Tab label="Loops" value="loops" />
        <Tab label="Cut-Sets" value="cutsets" />
        <Tab label="Results" value="results" />
      </Tabs>
    </Box>
  );
}
