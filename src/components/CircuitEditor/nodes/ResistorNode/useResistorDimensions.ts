/**
 * Hook for calculating resistor dimensions based on rotation
 */

import { useMemo } from "react";
import { useTheme } from "@mui/material";
import { getHandlePosition } from "./helpers";
import {
  HORIZONTAL_WIDTH,
  HORIZONTAL_HEIGHT,
  VERTICAL_WIDTH,
  VERTICAL_HEIGHT,
  HANDLE_SIZE,
  HANDLE_BORDER_WIDTH,
} from "./constants";

export const useResistorDimensions = (rotation: number) => {
  const theme = useTheme();

  const leftHandlePosition = useMemo(() => getHandlePosition("left", rotation), [rotation]);
  const rightHandlePosition = useMemo(() => getHandlePosition("right", rotation), [rotation]);

  const isVertical = useMemo(() => rotation === 90 || rotation === 270, [rotation]);
  const wrapperWidth = useMemo(() => (isVertical ? VERTICAL_WIDTH : HORIZONTAL_WIDTH), [isVertical]);
  const wrapperHeight = useMemo(() => (isVertical ? VERTICAL_HEIGHT : HORIZONTAL_HEIGHT), [isVertical]);

  const wrapperSx = useMemo(() => ({ width: wrapperWidth, height: wrapperHeight }), [wrapperWidth, wrapperHeight]);

  const handleStyle = useMemo(
    () => ({
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      background: theme.palette.text.primary,
      border: `${String(HANDLE_BORDER_WIDTH)}px solid ${theme.palette.background.paper}`,
    }),
    [theme.palette.text.primary, theme.palette.background.paper]
  );

  return {
    leftHandlePosition,
    rightHandlePosition,
    wrapperSx,
    handleStyle,
  };
};
