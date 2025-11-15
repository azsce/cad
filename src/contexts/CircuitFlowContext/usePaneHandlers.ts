/**
 * Hook for pane interaction handlers (click and mouse move)
 */

import { useCallback } from 'react';
import { logger } from '../../utils/logger';
import { useConnectionStore } from '../../store/connectionStore';

interface UsePaneHandlersProps {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
}

export function usePaneHandlers({ screenToFlowPosition }: UsePaneHandlersProps) {
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      const { isConnecting } = useConnectionStore.getState();
      if (!isConnecting) return;
      
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      logger.debug({ caller: 'usePaneHandlers' }, 'Waypoint added', { position });
      useConnectionStore.getState().addWaypoint(position);
    },
    [screenToFlowPosition]
  );

  const onPaneMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const { isConnecting } = useConnectionStore.getState();
      if (!isConnecting) return;
      
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      useConnectionStore.getState().updateCursorPosition(position);
    },
    [screenToFlowPosition]
  );

  return { onPaneClick, onPaneMouseMove };
}
