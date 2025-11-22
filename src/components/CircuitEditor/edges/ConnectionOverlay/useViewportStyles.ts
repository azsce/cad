/**
 * Hook for calculating viewport-aware styles
 */

import { useMemo } from "react";
import { useViewport } from "@xyflow/react";

export const useViewportStyles = () => {
  const viewport = useViewport();

  return useMemo(
    () => ({
      viewport,
      strokeWidth: 2 / viewport.zoom,
      dashArray: 5 / viewport.zoom,
      waypointRadius: 4 / viewport.zoom,
      waypointStroke: 2 / viewport.zoom,
      cursorRadius: 3 / viewport.zoom,
    }),
    [viewport]
  );
};
