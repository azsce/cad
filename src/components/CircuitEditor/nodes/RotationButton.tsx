/**
 * RotationButton component for circuit nodes.
 * Provides a clickable button to rotate nodes clockwise or counter-clockwise.
 */

import { memo, useCallback } from "react";
import { IconButton, Tooltip, useTheme } from "@mui/material";
import { RotateRight, RotateLeft } from "@mui/icons-material";

interface RotationButtonProps {
  direction: "clockwise" | "counterclockwise";
  position: "top-left" | "bottom-left" | "bottom-right";
  onClick: () => void;
  visible: boolean;
}

/**
 * RotationButton component.
 * Displays a rotation control button that appears outside the node border.
 */
export const RotationButton = memo(({ direction, position, onClick, visible }: RotationButtonProps) => {
  const theme = useTheme();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent node selection/drag when clicking button
      onClick();
    },
    [onClick]
  );

  if (!visible) {
    return null;
  }

  const Icon = direction === "clockwise" ? RotateRight : RotateLeft;
  const tooltipText = direction === "clockwise" ? "Rotate clockwise" : "Rotate counter-clockwise";

  // Position styles based on corner placement
  const getPositionStyles = () => {
    if (position === "top-left") {
      return { top: -14, left: -14 };
    }
    if (position === "bottom-right") {
      return { bottom: -14, right: -14 };
    }
    return { bottom: -14, left: -14 };
  };

  const positionStyles = getPositionStyles();

  return (
    <Tooltip title={tooltipText} placement="top">
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{
          position: "absolute",
          ...positionStyles,
          width: 26,
          height: 26,
          padding: 0,
          bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "50%",
          zIndex: 1000,
          "&:hover": {
            bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
          },
          "& .MuiSvgIcon-root": {
            fontSize: 16,
          },
        }}
      >
        <Icon />
      </IconButton>
    </Tooltip>
  );
});

RotationButton.displayName = "RotationButton";
