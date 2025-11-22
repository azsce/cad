/**
 * 🎮 GraphControls - Control buttons for graph manipulation.
 */

import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { ZoomIn, ZoomOut, FitScreen, CameraAlt } from "@mui/icons-material";

interface GraphControlsProps {
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFitView: () => void;
  readonly onExportPNG: () => void;
}

/**
 * Control buttons overlay for graph manipulation.
 */
export function GraphControls({ onZoomIn, onZoomOut, onFitView, onExportPNG }: GraphControlsProps): React.ReactElement {
  return (
    <Box
      sx={{
        position: "absolute",
        top: 8,
        right: 8,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        backgroundColor: "background.paper",
        borderRadius: 1,
        padding: 0.5,
        boxShadow: 2,
      }}
    >
      <Tooltip title="Zoom In" placement="left">
        <IconButton size="small" onClick={onZoomIn}>
          <ZoomIn />
        </IconButton>
      </Tooltip>

      <Tooltip title="Zoom Out" placement="left">
        <IconButton size="small" onClick={onZoomOut}>
          <ZoomOut />
        </IconButton>
      </Tooltip>

      <Tooltip title="Fit to View" placement="left">
        <IconButton size="small" onClick={onFitView}>
          <FitScreen />
        </IconButton>
      </Tooltip>

      <Tooltip title="Export as PNG" placement="left">
        <IconButton size="small" onClick={onExportPNG}>
          <CameraAlt />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
