/**
 * Hook for automatically fitting the view to nodes
 * Triggers on initial render and when circuit changes
 */

import { useEffect } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import { logger } from '../../utils/logger';

interface UseAutoFitViewOptions {
  readonly nodes: Node[];
  readonly enabled?: boolean;
  readonly padding?: number;
  readonly duration?: number;
}

/**
 * Automatically fits the view to show all nodes
 * @param nodes - Current nodes in the flow
 * @param enabled - Whether auto-fit is enabled (default: true)
 * @param padding - Padding around nodes in pixels (default: 0.1 = 10%)
 * @param duration - Animation duration in ms (default: 200)
 */
export function useAutoFitView({ 
  nodes, 
  enabled = true,
  padding = 0.1,
  duration = 200,
}: UseAutoFitViewOptions) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!enabled || nodes.length === 0) {
      return;
    }

    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      void fitView({ 
        padding,
        duration,
        nodes: nodes.map(node => ({ id: node.id })),
      }).then(() => {
        logger.debug({ caller: 'useAutoFitView' }, 'Fitted view to nodes', { 
          nodeCount: nodes.length,
          padding,
          duration,
        });
      });
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [nodes, enabled, padding, duration, fitView]);
}
