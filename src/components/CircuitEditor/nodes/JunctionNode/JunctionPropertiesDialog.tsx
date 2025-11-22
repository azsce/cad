/**
 * Dialog for editing junction properties (label).
 */

import { memo, useState, useCallback } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";

interface JunctionPropertiesDialogProps {
  open: boolean;
  currentLabel?: string;
  onClose: () => void;
  onSave: (label: string) => void;
}

export const JunctionPropertiesDialog = memo(
  ({ open, currentLabel = "", onClose, onSave }: JunctionPropertiesDialogProps) => {
    const [label, setLabel] = useState(currentLabel);

    const handleSave = useCallback(() => {
      onSave(label);
      onClose();
    }, [label, onSave, onClose]);

    const handleCancel = useCallback(() => {
      setLabel(currentLabel); // Reset to original
      onClose();
    }, [currentLabel, onClose]);

    return (
      <Dialog open={open} onClose={handleCancel} maxWidth="xs" fullWidth>
        <DialogTitle>Junction Properties</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Label"
            type="text"
            fullWidth
            variant="outlined"
            value={label}
            onChange={e => {
              setLabel(e.target.value);
            }}
            placeholder="e.g., VCC, GND, Node A"
            helperText="Optional label for this junction"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);

JunctionPropertiesDialog.displayName = "JunctionPropertiesDialog";
