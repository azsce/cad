/**
 * Hook for pane interaction handlers (click and mouse move)
 */

import { useCallback } from "react";
import { logger } from "../../utils/logger";
import { useConnectionStore } from "../../store/connectionStore";
import { useCircuitStore } from "../../store/circuitStore";
import { isTooCloseToJunction } from "../../utils/edgeSplitting";
import { isJunctionNode } from "../../types/circuit";

interface UsePaneHandlersProps {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
}

export function usePaneHandlers({ screenToFlowPosition }: UsePaneHandlersProps) {
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      const { isConnecting } = useConnectionStore.getState();

      logger.info({ caller: "usePaneHandlers" }, "🖱️ PANE CLICKED (empty space)", {
        isConnecting,
        clientX: event.clientX,
        clientY: event.clientY,
        target: (event.target as HTMLElement).className,
      });

      if (!isConnecting) {
        logger.info({ caller: "usePaneHandlers" }, "❌ Not in connection mode, ignoring pane click");
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      logger.info({ caller: "usePaneHandlers" }, "📍 Flow position calculated", { position });

      // Check distance to all junctions (5px minimum)
      const circuit = useCircuitStore.getState().getActiveCircuit();
      if (circuit) {
        const junctions = circuit.nodes.filter(node => isJunctionNode(node));
        const tooClose = junctions.some(junction => isTooCloseToJunction(position, junction.position, 5));

        if (tooClose) {
          logger.info({ caller: "usePaneHandlers" }, "⚠️ Waypoint too close to junction, skipping", {
            position,
          });
          return; // Don't add waypoint
        }
      }

      logger.info({ caller: "usePaneHandlers" }, "✅ Waypoint added to connection", { position });
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
