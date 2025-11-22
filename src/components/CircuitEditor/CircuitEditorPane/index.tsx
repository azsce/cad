/**
 * CircuitEditorPane component.
 * Main visual editor for designing circuits with drag-and-drop components.
 * Wrapped with ReactFlowProvider and CircuitFlowProvider.
 */

import { ReactFlowProvider } from "@xyflow/react";
import { Box, Typography } from "@mui/material";
import { useCircuitStore } from "../../../store/circuitStore";
import { CircuitFlowProvider } from "../../../contexts/CircuitFlowContext";
import { CircuitEditorInner } from "./CircuitEditorInner";

export function CircuitEditorPane() {
  const activeCircuitId = useCircuitStore(state => state.activeCircuitId);

  // Show empty state when no circuit is selected
  if (!activeCircuitId) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No circuit selected. Create or select a circuit to begin.
        </Typography>
      </Box>
    );
  }

  return (
    <ReactFlowProvider>
      <CircuitFlowProvider circuitId={activeCircuitId}>
        <CircuitEditorInner />
      </CircuitFlowProvider>
    </ReactFlowProvider>
  );
}
