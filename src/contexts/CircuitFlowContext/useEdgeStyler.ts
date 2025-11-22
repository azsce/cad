/**
 * 🎨 Hook for managing edge visual styles based on hover and connection state
 */

import { useState, useCallback, useEffect } from "react";
import type { Theme } from "@mui/material";
import type { EdgeMouseHandler } from "@xyflow/react";

/**
 * 🎹 Hook to track modifier keys (Ctrl/Cmd and Alt)
 */
function useModifierKeyTracking() {
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        setIsCtrlPressed(true);
      }
      if (e.key === "Alt") {
        setIsAltPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        setIsCtrlPressed(false);
      }
      if (e.key === "Alt") {
        setIsAltPressed(false);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("keyup", handleKeyUp);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return { isCtrlPressed, isAltPressed };
}

/**
 * 🎨 Get base edge style
 */
function getBaseStyle(selected: boolean, theme: Theme) {
  return {
    strokeWidth: selected ? 3 : 2,
    stroke: selected ? theme.palette.primary.main : theme.palette.text.primary,
  };
}

/**
 * 🎨 Get highlighted edge style for connection mode
 */
function getConnectionHighlight(theme: Theme) {
  return {
    strokeWidth: 4,
    stroke: theme.palette.success.main,
  };
}

/**
 * 🎨 Get highlighted edge style for Ctrl+hover (junction creation mode)
 */
function getCtrlHighlight(theme: Theme) {
  return {
    strokeWidth: 4,
    stroke: theme.palette.warning.main,
  };
}

/**
 * 🎨 Get highlighted edge style for Alt+hover (waypoint creation mode)
 */
function getAltHighlight(theme: Theme) {
  return {
    strokeWidth: 4,
    stroke: theme.palette.info.main,
  };
}

/**
 * 🎨 Hook for managing edge styles and hover state
 */
export function useEdgeStyler(theme: Theme, isConnecting: boolean) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const { isCtrlPressed, isAltPressed } = useModifierKeyTracking();

  const onEdgeMouseEnter: EdgeMouseHandler = useCallback((_event, edge) => {
    setHoveredEdgeId(edge.id);
  }, []);

  const onEdgeMouseLeave: EdgeMouseHandler = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  const getEdgeStyle = useCallback(
    (edgeId: string, selected: boolean) => {
      const isHovered = hoveredEdgeId === edgeId;
      const baseStyle = getBaseStyle(selected, theme);

      if (!isHovered) {
        return baseStyle;
      }

      if (isConnecting) {
        return { ...baseStyle, ...getConnectionHighlight(theme) };
      }

      if (isCtrlPressed) {
        return { ...baseStyle, ...getCtrlHighlight(theme) };
      }

      if (isAltPressed) {
        return { ...baseStyle, ...getAltHighlight(theme) };
      }

      return baseStyle;
    },
    [hoveredEdgeId, isConnecting, isCtrlPressed, isAltPressed, theme]
  );

  return {
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    getEdgeStyle,
    isCtrlPressed,
    isAltPressed,
  };
}
