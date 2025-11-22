/**
 * DeleteButton component - renders the edge delete button
 */

import { memo } from "react";
import { IconButton, useTheme } from "@mui/material";
import { Close } from "@mui/icons-material";
import type { Position } from "../../../../types/circuit";

interface DeleteButtonProps {
  labelPosition: Position;
  onDelete: (e: React.MouseEvent) => void;
}

export const DeleteButton = memo(({ labelPosition, onDelete }: DeleteButtonProps) => {
  const theme = useTheme();

  return (
    <div
      style={{
        position: "absolute",
        transform: `translate(-50%, -50%) translate(${labelPosition.x.toString()}px,${labelPosition.y.toString()}px)`,
        pointerEvents: "all",
      }}
      className="nodrag nopan"
    >
      <IconButton
        onClick={onDelete}
        size="small"
        sx={{
          width: 20,
          height: 20,
          padding: 0,
          bgcolor: theme.palette.error.main,
          color: theme.palette.error.contrastText,
          "&:hover": {
            bgcolor: theme.palette.error.dark,
          },
          "& .MuiSvgIcon-root": {
            fontSize: 14,
          },
        }}
      >
        <Close />
      </IconButton>
    </div>
  );
});

DeleteButton.displayName = "DeleteButton";
