/**
 * 🎮 useGraphControls - Hook for graph zoom, pan, and export controls.
 */

import { useCallback } from 'react';
import type { Core } from 'cytoscape';
import { logger } from '../../../utils/logger';

const caller = 'useGraphControls';

/**
 * Hook providing control handlers for graph manipulation.
 */
export function useGraphControls(cyRef: { current: Core | null }) {
  /**
   * 🔍 Zoom in handler.
   */
  const handleZoomIn = useCallback(() => {
    if (cyRef.current) {
      const cy = cyRef.current;
      const currentZoom = cy.zoom();
      cy.zoom({
        level: currentZoom * 1.2,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
      });
    }
  }, [cyRef]);

  /**
   * 🔍 Zoom out handler.
   */
  const handleZoomOut = useCallback(() => {
    if (cyRef.current) {
      const cy = cyRef.current;
      const currentZoom = cy.zoom();
      cy.zoom({
        level: currentZoom / 1.2,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
      });
    }
  }, [cyRef]);

  /**
   * 🎯 Fit to view handler.
   */
  const handleFitView = useCallback(() => {
    const cy = cyRef.current;
    if (cy) {
      try {
        if (cy.elements().length > 0) {
          cy.fit(undefined, 30);
        }
      } catch (error: unknown) {
        logger.warn({ caller }, 'Error fitting view', { error });
      }
    }
  }, [cyRef]);

  /**
   * 📷 Export as PNG handler.
   */
  const handleExportPNG = useCallback(() => {
    if (cyRef.current) {
      const cy = cyRef.current;
      const png = cy.png({ full: true, scale: 2 });

      // Create download link
      const link = document.createElement('a');
      link.href = png;
      link.download = `circuit-graph-${Date.now().toString()}.png`;
      link.click();

      logger.info({ caller }, 'Graph exported as PNG');
    }
  }, [cyRef]);

  return {
    handleZoomIn,
    handleZoomOut,
    handleFitView,
    handleExportPNG,
  };
}
