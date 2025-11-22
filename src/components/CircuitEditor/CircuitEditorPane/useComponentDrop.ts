/**
 * Hook for handling component drag and drop
 */

import { useCallback, useState } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import { logger } from "../../../utils/logger";
import { VALID_COMPONENT_TYPES } from "./constants";
import { createNodeId } from "../../../types/identifiers";
import type { CircuitNode } from "../../../types/circuit";

interface PendingComponent {
  type: "resistor" | "voltageSource" | "currentSource";
  position: { x: number; y: number };
}

export const useComponentDrop = (
  reactFlowInstance: ReactFlowInstance,
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>,
  addNodeToFlow: (node: CircuitNode) => void
) => {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [pendingComponent, setPendingComponent] = useState<PendingComponent | null>(null);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current) return;

      // Get the component type from drag data
      // cspell:ignore reactflow
      const type = event.dataTransfer.getData("application/reactflow");

      // Validate component type (including junction)
      const isValidType = type && (VALID_COMPONENT_TYPES.includes(type as never) || type === "junction");
      if (!isValidType) {
        logger.error({ caller: "useComponentDrop" }, "Invalid component type", { type });
        return;
      }

      // Calculate position in React Flow coordinates
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Junction doesn't need config dialog - create immediately
      if (type === "junction") {
        const junctionNode: CircuitNode = {
          id: createNodeId(`junction-${Date.now().toString()}`),
          type: "junction",
          position,
          data: {}, // No label initially
        };

        logger.debug({ caller: "useComponentDrop" }, "Creating junction node", { junctionNode });
        addNodeToFlow(junctionNode);
        return;
      }

      // Other components need config dialog
      setPendingComponent({
        type: type as "resistor" | "voltageSource" | "currentSource",
        position,
      });
      setConfigDialogOpen(true);
    },
    [reactFlowInstance, reactFlowWrapper, addNodeToFlow]
  );

  const closeDialog = useCallback(() => {
    setConfigDialogOpen(false);
    setPendingComponent(null);
  }, []);

  return {
    configDialogOpen,
    pendingComponent,
    onDragOver,
    onDrop,
    closeDialog,
  };
};
