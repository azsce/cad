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
      const { isConnecting } = useConnectionStore.getState();
      
      logger.debug({ caller: 'useKeyboardHandler' }, 'Key pressed', { 
        key: event.key, 
        isConnecting 
      });
      
      if (event.key === 'Escape' && isConnecting) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        logger.debug({ caller: 'useKeyboardHandler' }, 'Connection cancelled via Escape');
        useConnectionStore.getState().cancelConnecting();
      }
    };

    // Add listener to both window and document for maximum coverage
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
