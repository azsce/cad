/**
 * Hook for handling canvas interaction modes (pan vs select)
 */

import { useState, useEffect } from "react";

interface UseCanvasInteractionResult {
  panOnDrag: boolean;
  selectionOnDrag: boolean;
  cursor: string;
  isSpacePressed: boolean;
}

export function useCanvasInteraction(isConnecting: boolean): UseCanvasInteractionResult {
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat) {
        // Prevent default scrolling behavior when space is pressed
        // But only if we are not in an input field (though usually canvas is focused)
        // For now, we just track the state.
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    // We attach to globalThis to ensure we catch events even if focus is slightly off,
    // but ideally we might want to scope this if it interferes with other inputs.
    // Given the context of a circuit editor, global space listener is usually acceptable
    // when the editor is active.
    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("keyup", handleKeyUp);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return {
    panOnDrag: isSpacePressed,
    selectionOnDrag: !isSpacePressed && !isConnecting, // Disable selection when in connection mode
    cursor: isSpacePressed ? "grab" : "default",
    isSpacePressed,
  };
}
