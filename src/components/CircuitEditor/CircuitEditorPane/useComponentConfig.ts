/**
 * Hook for handling component configuration
 */

import { useCallback } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import { logger } from '../../../utils/logger';
import { createNodeId } from '../../../types/identifiers';
import type { CircuitNode, ComponentData } from '../../../types/circuit';

interface PendingComponent {
  type: 'resistor' | 'voltageSource' | 'currentSource';
  position: { x: number; y: number };
}

export const useComponentConfig = (
  pendingComponent: PendingComponent | null,
  addNodeToFlow: (node: CircuitNode) => void,
  reactFlowInstance: ReactFlowInstance,
  closeDialog: () => void
) => {
  const handleConfigConfirm = useCallback(
    (id: string, data: ComponentData) => {
      logger.debug({ caller: 'useComponentConfig' }, 'handleConfigConfirm called', {
        id,
        data,
        hasPendingComponent: !!pendingComponent,
      });

      if (!pendingComponent) {
        logger.error({ caller: 'useComponentConfig' }, 'Missing pendingComponent');
        return;
      }

      const newNode: CircuitNode = {
        id: createNodeId(id),
        type: pendingComponent.type,
        position: pendingComponent.position,
        data,
      };

      logger.debug({ caller: 'useComponentConfig' }, 'Adding node via context', { newNode });
      addNodeToFlow(newNode);

      // Fit view to show the new node after a short delay to allow React Flow to update
      requestAnimationFrame(() => {
        void reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      });

      closeDialog();
    },
    [pendingComponent, addNodeToFlow, reactFlowInstance, closeDialog]
  );

  return { handleConfigConfirm };
};
