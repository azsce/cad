/**
 * Hook for handling keyboard events in connection mode
 */

import { useEffect } from 'react';
import { logger } from '../../utils/logger';
import { useConnectionStore } from '../../store/connectionStore';

/**
 * Handle keyboard events for connection mode
 * Escape key cancels connection drawing
 */
export function useKeyboardHandler() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle Escape key when connecting
      if (event.key !== 'Escape') return;
      
      const { isConnecting } = useConnectionStore.getState();
      if (!isConnecting) return;
      
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      logger.debug({ caller: 'useKeyboardHandler' }, 'Connection cancelled via Escape');
      useConnectionStore.getState().cancelConnecting();
    };

    // Use window listener only to avoid duplicate events
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
