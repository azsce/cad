/* eslint-disable sonarjs/function-return-type */
/**
 * Hook for generating React Flow canvas styles based on connection state
 */

import { useMemo } from "react";
import { useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { logger } from "../../../utils/logger";

// Create a pencil cursor using base64-encoded SVG
const PENCIL_CURSOR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#FFB300"/><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#FFA000"/><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="none" stroke="#000" stroke-width="0.5"/><circle cx="3" cy="21" r="1.5" fill="#424242"/></svg>';
const PENCIL_CURSOR_BASE64 = btoa(PENCIL_CURSOR_SVG);
const PENCIL_CURSOR = `url("data:image/svg+xml;base64,${PENCIL_CURSOR_BASE64}") 2 22, crosshair`;

// Create a junction cursor (circle with plus sign) using base64-encoded SVG
const JUNCTION_CURSOR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#FF9800" stroke="#000" stroke-width="1.5"/><circle cx="12" cy="12" r="6" fill="#FFA726" stroke="#FFB74D" stroke-width="1"/><line x1="12" y1="8" x2="12" y2="16" stroke="#FFF" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="#FFF" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="#FFF" opacity="0.3"/></svg>';
const JUNCTION_CURSOR_BASE64 = btoa(JUNCTION_CURSOR_SVG);
const JUNCTION_CURSOR = `url("data:image/svg+xml;base64,${JUNCTION_CURSOR_BASE64}") 12 12, copy`;

// Create a waypoint cursor (diamond shape) using base64-encoded SVG
const WAYPOINT_CURSOR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 4 L20 12 L12 20 L4 12 Z" fill="#2196F3" stroke="#000" stroke-width="1.5"/><path d="M12 6 L18 12 L12 18 L6 12 Z" fill="#42A5F5" stroke="#64B5F6" stroke-width="1"/><line x1="12" y1="8" x2="12" y2="16" stroke="#FFF" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="#FFF" stroke-width="2" stroke-linecap="round"/></svg>';
const WAYPOINT_CURSOR_BASE64 = btoa(WAYPOINT_CURSOR_SVG);
const WAYPOINT_CURSOR = `url("data:image/svg+xml;base64,${WAYPOINT_CURSOR_BASE64}") 12 12, cell`;

/**
 * 🎨 Generate base styles for React Flow canvas
 */
interface StyleOptions {
  isConnecting: boolean;
  isCtrlPressed: boolean;
  isAltPressed: boolean;
  isSpacePressed: boolean;
}

function getBaseStyles(options: StyleOptions, theme: Theme) {
  const { isConnecting, isCtrlPressed, isAltPressed, isSpacePressed } = options;

  // Determine edge cursor based on modifier keys
  let edgeCursor = "default";
  if (!isConnecting) {
    if (isCtrlPressed) {
      edgeCursor = JUNCTION_CURSOR;
    } else if (isAltPressed) {
      edgeCursor = WAYPOINT_CURSOR;
    }
  }

  // Determine pane cursor
  let paneCursor = "default";
  if (isConnecting) {
    paneCursor = PENCIL_CURSOR;
  } else if (isSpacePressed) {
    paneCursor = "grab";
  }

  return {
    flex: 1,
    height: "100%",
    position: "relative",
    "& .react-flow__pane": {
      cursor: paneCursor,
    },
    "& .react-flow__controls": {
      button: {
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        "&:hover": {
          backgroundColor: theme.palette.action.hover,
        },
      },
    },
    "& .react-flow__handle": {
      cursor: isConnecting ? "pointer" : "crosshair",
      transition: "all 0.2s ease",
    },
    "& .react-flow__edge": {
      cursor: edgeCursor,
    },
    // cspell:ignore selectionpane
    "& .react-flow__selectionpane": {
      zIndex: 4,
    },
    "& .react-flow__selection": {
      background: "rgba(0, 89, 220, 0.08)",
      border: "1px dashed rgba(0, 89, 220, 0.8)",
      position: "absolute",
    },
    // cspell:ignore nodesselection
    "& .react-flow__nodesselection": {
      zIndex: 3,
      transformOrigin: "left top",
    },
    "& .react-flow__nodesselection-rect": {
      background: "rgba(0, 89, 220, 0.08)",
      border: "1px dashed rgba(0, 89, 220, 0.8)",
      position: "absolute",
    },
  };
}

/**
 * 🔗 Generate styles for connection mode
 */
function getConnectingStyles(theme: Theme) {
  return {
    "& .react-flow__handle": {
      width: "12px !important",
      height: "12px !important",
      border: `2px solid ${theme.palette.primary.main}`,
      cursor: "pointer",
      transition: "all 0.2s ease",
      "&:hover": {
        width: "16px !important",
        height: "16px !important",
        backgroundColor: theme.palette.primary.main,
        boxShadow: `0 0 8px ${theme.palette.primary.main}`,
      },
    },
    "& .react-flow__node": {
      opacity: 0.5,
      pointerEvents: "none",
    },
    "& .react-flow__node .react-flow__handle": {
      pointerEvents: "all",
      opacity: 1,
    },
    "& .react-flow__edge": {
      opacity: 0.5,
      pointerEvents: "all", // ✅ Enable edge clicks during connection mode for wire-to-wire connections
      cursor: "pointer",
      "&:hover": {
        opacity: 0.8,
        strokeWidth: "3px",
      },
    },
    "& .react-flow__controls": {
      opacity: 0.5,
    },
    "& .react-flow__minimap": {
      opacity: 0.5,
    },
  };
}

/**
 * 🎨 Generate React Flow canvas styles
 */
function generateReactFlowStyles(options: StyleOptions, theme: Theme): SxProps<Theme> {
  const { isConnecting, isCtrlPressed, isAltPressed, isSpacePressed } = options;

  // Extract nested ternary into a variable
  let cursorType: string;
  if (isConnecting) {
    cursorType = "pencil";
  } else if (isSpacePressed) {
    cursorType = "grab";
  } else {
    cursorType = "default";
  }

  logger.debug({ caller: "useReactFlowStyles" }, "generateReactFlowStyles called", {
    isConnecting,
    isCtrlPressed,
    isAltPressed,
    isSpacePressed,
    cursor: cursorType,
    pencilCursorLength: PENCIL_CURSOR.length,
  });

  const baseStyles = getBaseStyles(options, theme);
  const connectingStyles = isConnecting ? getConnectingStyles(theme) : {};

  return {
    ...baseStyles,
    ...connectingStyles,
  };
}

export const useReactFlowStyles = (
  isConnecting: boolean,
  isCtrlPressed: boolean,
  isAltPressed: boolean,
  isSpacePressed: boolean
): SxProps<Theme> => {
  const theme = useTheme();

  logger.debug({ caller: "useReactFlowStyles" }, "Hook called", {
    isConnecting,
    isCtrlPressed,
    isAltPressed,
    isSpacePressed,
  });

  return useMemo(
    () => generateReactFlowStyles({ isConnecting, isCtrlPressed, isAltPressed, isSpacePressed }, theme),
    [isConnecting, isCtrlPressed, isAltPressed, isSpacePressed, theme]
  );
};
