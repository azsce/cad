/**
 * Hook for connection-related event handlers
 * Composes smaller, focused hooks for better maintainability
 */

import type { CircuitEdge } from '../../types/circuit';
import { usePaneHandlers } from './usePaneHandlers';
import { useConnectionStart } from './useConnectionStart';
import { useConnectionComplete } from './useConnectionComplete';

interface UseConnectionHandlersProps {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  addEdge: (edge: CircuitEdge) => void;
}

/**
 * Aggregates all connection-related handlers into a single hook
 */
export function useConnectionHandlers({ screenToFlowPosition, addEdge }: UseConnectionHandlersProps) {
  const { onPaneClick, onPaneMouseMove } = usePaneHandlers({ screenToFlowPosition });
  const { startConnection } = useConnectionStart();
  const { onConnect } = useConnectionComplete({ addEdge });

  return { onPaneClick, onPaneMouseMove, startConnection, onConnect };
}
