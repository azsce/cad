/**
 * Circuit Manager Pane Component
 * Displays list of all circuits with metadata and provides circuit management functionality.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 11.3
 */

import { Box, IconButton, Tooltip } from "@mui/material";
import { ChevronRight as ChevronRightIcon } from "@mui/icons-material";
import { useCircuitStore } from "../../../store/circuitStore";
import { useUIStore } from "../../../store/uiStore";
import { CircuitManagerHeader } from "./CircuitManagerHeader";
import { CircuitList } from "./CircuitList";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useCircuitManager } from "./useCircuitManager";

export function CircuitManagerPane() {
  const circuits = useCircuitStore(state => state.circuits);
  const activeCircuitId = useCircuitStore(state => state.activeCircuitId);
  const createCircuit = useCircuitStore(state => state.createCircuit);
  const deleteCircuit = useCircuitStore(state => state.deleteCircuit);
  const setActiveCircuit = useCircuitStore(state => state.setActiveCircuit);
  const updateCircuitName = useCircuitStore(state => state.updateCircuitName);
  const isCollapsed = useUIStore(state => state.isLeftPanelCollapsed);
  const toggleCollapse = useUIStore(state => state.toggleLeftPanelCollapse);

  const { circuitList, editingState, deleteConfirmId, handlers } = useCircuitManager({
    circuits,
    createCircuit,
    deleteCircuit,
    setActiveCircuit,
    updateCircuitName,
  });

  if (isCollapsed) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          pt: 2,
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <Tooltip title="Expand panel">
          <IconButton onClick={toggleCollapse} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      <CircuitManagerHeader onCreateCircuit={handlers.handleCreateCircuit} />

      <CircuitList
        circuitList={circuitList}
        activeCircuitId={activeCircuitId}
        editingState={editingState}
        handlers={handlers}
      />

      <DeleteConfirmDialog
        open={deleteConfirmId !== null}
        circuitName={deleteConfirmId === null ? "" : (circuits[deleteConfirmId]?.name ?? "")}
        onConfirm={handlers.handleConfirmDelete}
        onCancel={handlers.handleCancelDelete}
      />
    </Box>
  );
}
