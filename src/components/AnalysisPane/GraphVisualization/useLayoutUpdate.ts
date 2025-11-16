/**
 * 🔄 useLayoutUpdate - Hook for updating graph layout on mode changes.
 */

import { useEffect } from 'react';
import type { Core, LayoutOptions } from 'cytoscape';
import type { GraphVisualizationData } from '../../../contexts/PresentationContext';
import { logger } from '../../../utils/logger';

const caller = 'useLayoutUpdate';

interface UseLayoutUpdateParams {
  readonly cyRef: { current: Core | null };
  readonly visualizationData: GraphVisualizationData;
  readonly layout: LayoutOptions;
}

/**
 * Hook for updating layout when visualization mode changes.
 */
export function useLayoutUpdate({
  cyRef,
  visualizationData,
  layout,
}: UseLayoutUpdateParams) {
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    logger.debug({ caller }, 'Updating layout for mode change', {
      mode: visualizationData.mode,
    });

    try {
      // Re-run layout
      cy.layout(layout).run();

      // Fit to viewport after layout
      setTimeout(() => {
        try {
          // Check if Cytoscape is ready before fitting
          if (cy.elements().length > 0) {
            cy.fit(undefined, 30);
          }
        } catch (error: unknown) {
          logger.warn({ caller }, 'Error fitting view after layout', { error });
        }
      }, 600); // Wait for animation to complete
    } catch (error: unknown) {
      logger.error({ caller }, 'Error updating layout', { error });
    }
  }, [cyRef, visualizationData.mode, layout]);
}
