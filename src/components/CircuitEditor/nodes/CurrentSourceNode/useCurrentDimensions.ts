/**
 * Hook for calculating current source dimensions based on rotation
 */

import { useMemo } from "react";
import { useTheme } from "@mui/material";
import { getHandlePosition } from "./helpers";
import {
  HANDLE_SIZE,
  HANDLE_BORDER_WIDTH,
  HORIZONTAL_WIDTH,
  HORIZONTAL_HEIGHT,
  VERTICAL_WIDTH,
  VERTICAL_HEIGHT,
} from "./constants";

export const useCurrentDimensions = (rotation: number) => {
  const theme = useTheme();

  const topHandlePosition = useMemo(() => getHandlePosition("top", rotation), [rotation]);
  const bottomHandlePosition = useMemo(() => getHandlePosition("bottom", rotation), [rotation]);

  const dimensions = useMemo(() => {
    const isHorizontal = rotation === 90 || rotation === 270;
    return {
      width: isHorizontal ? HORIZONTAL_WIDTH : VERTICAL_WIDTH,
      height: isHorizontal ? HORIZONTAL_HEIGHT : VERTICAL_HEIGHT,
    };
  }, [rotation]);

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
    topHandlePosition,
    bottomHandlePosition,
    dimensions,
    handleStyle,
  };
};
