/**
 * 🎮 useGraphControls - Hook for graph zoom, pan, and export controls.
 */

import { useCallback } from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { logger } from "../../../utils/logger";

const caller = "useGraphControls";

/**
 * Hook providing control handlers for graph manipulation using react-zoom-pan-pinch.
 */
export function useGraphControls(transformRef: React.RefObject<ReactZoomPanPinchRef | null>) {
  /**
   * 🔍 Zoom in handler - increases zoom by 20%.
   */
  const handleZoomIn = useCallback(() => {
    transformRef.current?.zoomIn(0.2);
  }, [transformRef]);

  /**
   * 🔍 Zoom out handler - decreases zoom by 20%.
   */
  const handleZoomOut = useCallback(() => {
    transformRef.current?.zoomOut(0.2);
  }, [transformRef]);

  /**
   * 🎯 Fit to view handler - resets zoom and centers content.
   */
  const handleFitView = useCallback(() => {
    try {
      transformRef.current?.resetTransform();
    } catch (error: unknown) {
      logger.warn({ caller }, "Error fitting view", { error });
    }
  }, [transformRef]);

  return {
    handleZoomIn,
    handleZoomOut,
    handleFitView,
  };
}
