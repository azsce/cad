/**
 * Hook for handling component configuration
 */

import { useCallback } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import { logger } from "../../../utils/logger";
import { createNodeId } from "../../../types/identifiers";
import type { CircuitNode, ComponentData } from "../../../types/circuit";

interface PendingComponent {
  type: "resistor" | "voltageSource" | "currentSource";
  position: { x: number; y: number };
}

export const useComponentConfig = (
  pendingComponent: PendingComponent | null,
  addNodeToFlow: (node: CircuitNode) => void,
  _reactFlowInstance: ReactFlowInstance,
  closeDialog: () => void
) => {
  const handleConfigConfirm = useCallback(
    (id: string, data: ComponentData) => {
      logger.debug({ caller: "useComponentConfig" }, "handleConfigConfirm called", {
        id,
        data,
        hasPendingComponent: !!pendingComponent,
      });

      if (!pendingComponent) {
        logger.error({ caller: "useComponentConfig" }, "Missing pendingComponent");
        return;
      }

      // Type assertion is safe here because pendingComponent.type is validated
      // and data comes from the config dialog which ensures correct type
      const newNode = {
        id: createNodeId(id),
        type: pendingComponent.type,
        position: pendingComponent.position,
        data,
      } as CircuitNode;

      logger.debug({ caller: "useComponentConfig" }, "Adding node via context", { newNode });
      addNodeToFlow(newNode);

      closeDialog();
    },
    [pendingComponent, addNodeToFlow, closeDialog]
  );

  return { handleConfigConfirm };
};
