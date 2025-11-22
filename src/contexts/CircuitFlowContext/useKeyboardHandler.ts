/**
 * Hook for handling keyboard events in connection mode
 */

import { useEffect } from "react";
import { logger } from "../../utils/logger";
import { useConnectionStore } from "../../store/connectionStore";

/**
 * Handle keyboard events for connection mode
 * - Escape: Cancel connection drawing
 * - Delete/Backspace: Remove last waypoint
 */
export function useKeyboardHandler() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { isConnecting } = useConnectionStore.getState();
      if (!isConnecting) return;

      // Handle Escape - cancel connection
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        logger.debug({ caller: "useKeyboardHandler" }, "Connection cancelled via Escape");
        useConnectionStore.getState().cancelConnecting();
        return;
      }

      // Handle Delete or Backspace - remove last waypoint
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        logger.debug({ caller: "useKeyboardHandler" }, "Removing last waypoint via Delete/Backspace");
        useConnectionStore.getState().removeLastWaypoint();
      }
    };

    // Use window listener only to avoid duplicate events
    globalThis.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);
}
