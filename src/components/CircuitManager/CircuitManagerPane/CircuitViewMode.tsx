/**
 * CircuitViewMode component - view mode for circuit details
 */

import { memo } from "react";
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import type { Circuit } from "../../../types/circuit";
import { formatDate, formatTime } from "./dateFormatters";

interface CircuitViewModeProps {
  circuit: Circuit;
  onEdit: () => void;
  onDelete: () => void;
}

export const CircuitViewMode = memo(({ circuit, onEdit, onDelete }: CircuitViewModeProps) => {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight="medium">
          {circuit.name}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Rename circuit">
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete circuit">
            <IconButton
              size="small"
              color="error"
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          Created: {formatDate(circuit.createdAt)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Modified: {formatDate(circuit.modifiedAt)} at {formatTime(circuit.modifiedAt)}
        </Typography>
        <Box>
          <Chip label={`${circuit.nodes.length.toString()} components`} size="small" variant="outlined" />
        </Box>
      </Stack>
    </>
  );
});

CircuitViewMode.displayName = "CircuitViewMode";
