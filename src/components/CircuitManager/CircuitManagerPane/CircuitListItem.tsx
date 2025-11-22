/**
 * CircuitListItem component - individual circuit item in the list
 */

import { memo } from "react";
import { ListItem, ListItemButton } from "@mui/material";
import type { Circuit } from "../../../types/circuit";
import type { CircuitHandlers } from "./types";
import { CircuitEditMode } from "./CircuitEditMode";
import { CircuitViewMode } from "./CircuitViewMode";

interface CircuitListItemProps {
  circuit: Circuit;
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  handlers: CircuitHandlers;
}

export const CircuitListItem = memo(
  ({ circuit, isActive, isEditing, editingName, onEditingNameChange, handlers }: CircuitListItemProps) => {
    return (
      <ListItem
        disablePadding
        sx={{
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <ListItemButton
          selected={isActive}
          onClick={() => {
            if (!isEditing) {
              handlers.handleSelectCircuit(circuit.id);
            }
          }}
          sx={{
            flexDirection: "column",
            alignItems: "stretch",
            py: 1.5,
          }}
        >
          {isEditing ? (
            <CircuitEditMode
              editingName={editingName}
              onEditingNameChange={onEditingNameChange}
              onSave={handlers.handleSaveEdit}
              onCancel={handlers.handleCancelEdit}
            />
          ) : (
            <CircuitViewMode
              circuit={circuit}
              onEdit={() => {
                handlers.handleStartEdit(circuit.id, circuit.name);
              }}
              onDelete={() => {
                handlers.handleDeleteClick(circuit.id);
              }}
            />
          )}
        </ListItemButton>
      </ListItem>
    );
  }
);

CircuitListItem.displayName = "CircuitListItem";
