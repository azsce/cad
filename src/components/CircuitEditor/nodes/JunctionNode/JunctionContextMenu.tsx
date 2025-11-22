/**
 * Context menu for junction nodes.
 * Shows Edit Properties and Delete options.
 */

import { memo, useCallback } from "react";
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

interface JunctionContextMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onEditProperties: () => void;
  onDelete: () => void;
}

export const JunctionContextMenu = memo(
  ({ anchorEl, open, onClose, onEditProperties, onDelete }: JunctionContextMenuProps) => {
    const handleEditClick = useCallback(() => {
      onEditProperties();
      onClose();
    }, [onEditProperties, onClose]);

    const handleDeleteClick = useCallback(() => {
      onDelete();
      onClose();
    }, [onDelete, onClose]);

    return (
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Properties</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Junction</ListItemText>
        </MenuItem>
      </Menu>
    );
  }
);

JunctionContextMenu.displayName = "JunctionContextMenu";
