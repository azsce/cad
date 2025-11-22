/**
 * CircuitManagerHeader component - header with title and new circuit button
 */

import { memo } from "react";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import {
  Add as AddIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { useTheme } from "../../../contexts/ThemeContext";
import { useUIStore } from "../../../store/uiStore";

interface CircuitManagerHeaderProps {
  onCreateCircuit: () => void;
}

export const CircuitManagerHeader = memo(({ onCreateCircuit }: CircuitManagerHeaderProps) => {
  const { mode, toggleTheme } = useTheme();
  const isCollapsed = useUIStore(state => state.isLeftPanelCollapsed);
  const toggleCollapse = useUIStore(state => state.toggleLeftPanelCollapse);

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" component="h2">
          Circuit Manager
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}>
            <IconButton onClick={toggleTheme} size="small">
              {mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={isCollapsed ? "Expand panel" : "Collapse panel"}>
            <IconButton onClick={toggleCollapse} size="small">
              {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateCircuit} fullWidth>
        New Circuit
      </Button>
    </Box>
  );
});

CircuitManagerHeader.displayName = "CircuitManagerHeader";
