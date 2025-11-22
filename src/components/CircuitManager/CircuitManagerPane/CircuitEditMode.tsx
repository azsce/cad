/**
 * CircuitEditMode component - editing mode for circuit name
 */

import { memo } from "react";
import { IconButton, Stack, TextField, Tooltip } from "@mui/material";
import { Check as CheckIcon, Close as CloseIcon } from "@mui/icons-material";

interface CircuitEditModeProps {
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const CircuitEditMode = memo(({ editingName, onEditingNameChange, onSave, onCancel }: CircuitEditModeProps) => {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField
        value={editingName}
        onChange={e => {
          onEditingNameChange(e.target.value);
        }}
        onKeyDown={e => {
          if (e.key === "Enter") {
            onSave();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        onClick={e => {
          e.stopPropagation();
        }}
        autoFocus
        size="small"
        fullWidth
      />
      <Tooltip title="Save">
        <IconButton
          size="small"
          color="primary"
          onClick={e => {
            e.stopPropagation();
            onSave();
          }}
        >
          <CheckIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Cancel">
        <IconButton
          size="small"
          onClick={e => {
            e.stopPropagation();
            onCancel();
          }}
        >
          <CloseIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );
});

CircuitEditMode.displayName = "CircuitEditMode";
