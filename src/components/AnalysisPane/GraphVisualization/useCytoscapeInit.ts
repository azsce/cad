/**
 * 🎨 useCytoscapeInit - Hook for initializing Cytoscape instance.
 */

import { useCallback, useEffect } from 'react';
import type { Core, EventObject } from 'cytoscape';
import type { AnalysisGraph } from '../../../types/analysis';
import type { GraphVisualizationData } from '../../../contexts/PresentationContext';
import { setupTooltips, cleanupTooltips } from './setupTooltips';
import { logger } from '../../../utils/logger';

const caller = 'useCytoscapeInit';

interface UseCytoscapeInitParams {
  readonly cyRef: { current: Core | null };
  readonly analysisGraph: AnalysisGraph;
  readonly visualizationData: GraphVisualizationData;
  readonly onElementClick: ((elementId: string) => void) | undefined;
}

/**
 * Hook for initializing Cytoscape instance and managing lifecycle.
 */
export function useCytoscapeInit({
  cyRef,
  analysisGraph,
  visualizationData,
  onElementClick,
}: UseCytoscapeInitParams) {
  /**
   * 🔍 Handle element click events.
   */
  const handleElementClick = useCallback(
    (event: EventObject) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const element = event.target;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const elementId = element.id() as string;

      logger.debug({ caller }, 'Element clicked', { elementId });

      if (onElementClick) {
        onElementClick(elementId);
      }
    },
    [onElementClick]
  );

  /**
   * 🎨 Initialize Cytoscape instance and set up event handlers.
   */
  const handleCyInit = useCallback(
    (cy: Core) => {
      cyRef.current = cy;

      logger.debug({ caller }, 'Cytoscape initialized', {
        nodeCount: cy.nodes().length,
        edgeCount: cy.edges().length,
      });

      // Set up click handlers
      cy.on('tap', 'node', handleElementClick);
      cy.on('tap', 'edge', handleElementClick);

      // Enable zoom and pan
      cy.userZoomingEnabled(true);
      cy.userPanningEnabled(true);

      // Set up hover tooltips
      setupTooltips(cy, analysisGraph, visualizationData);

      // Fit to viewport after a short delay to ensure DOM is ready
      setTimeout(() => {
        try {
          if (cy.elements().length > 0) {
            cy.fit(undefined, 30);
          }
        } catch (error: unknown) {
          logger.warn({ caller }, 'Error fitting view on init', { error });
        }
      }, 100);
    },
    [cyRef, handleElementClick, analysisGraph, visualizationData]
  );

  /**
   * 🔄 Update tooltips when visualization data changes.
   */
  useEffect(() => {
    if (cyRef.current) {
      setupTooltips(cyRef.current, analysisGraph, visualizationData);
    }
  }, [cyRef, analysisGraph, visualizationData]);

  /**
   * 🧹 Cleanup tooltips on unmount.
   */
  useEffect(() => {
    return () => {
      cleanupTooltips();
    };
  }, []);

  return { handleCyInit };
}
