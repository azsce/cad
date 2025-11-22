/**
 * CircuitList component - displays list of circuits
 */

import { memo } from "react";
import { Box, List, Typography } from "@mui/material";
import type { Circuit } from "../../../types/circuit";
import type { CircuitId } from "../../../types/identifiers";
import { CircuitListItem } from "./CircuitListItem";
import type { EditingState, CircuitHandlers } from "./types";

interface CircuitListProps {
  circuitList: Circuit[];
  activeCircuitId: CircuitId | null;
  editingState: EditingState;
  handlers: CircuitHandlers;
}

export const CircuitList = memo(({ circuitList, activeCircuitId, editingState, handlers }: CircuitListProps) => {
  if (circuitList.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        <Typography variant="body1" gutterBottom>
          No circuits yet
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Click "New Circuit" to get started
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, overflow: "auto" }}>
      <List sx={{ p: 0 }}>
        {circuitList.map(circuit => (
          <CircuitListItem
            key={circuit.id}
            circuit={circuit}
            isActive={circuit.id === activeCircuitId}
            isEditing={editingState.editingId === circuit.id}
            editingName={editingState.editingName}
            onEditingNameChange={editingState.setEditingName}
            handlers={handlers}
          />
        ))}
      </List>
    </Box>
  );
});

CircuitList.displayName = "CircuitList";
