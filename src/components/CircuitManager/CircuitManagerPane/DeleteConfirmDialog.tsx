/**
 * DeleteConfirmDialog component - confirmation dialog for circuit deletion
 */

import { memo } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

interface DeleteConfirmDialogProps {
  open: boolean;
  circuitName: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmDialog = memo(({ open, circuitName, onConfirm, onCancel }: DeleteConfirmDialogProps) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Circuit</DialogTitle>
      <DialogContent>
        <Typography>Are you sure you want to delete "{circuitName}"?</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
});

DeleteConfirmDialog.displayName = "DeleteConfirmDialog";
