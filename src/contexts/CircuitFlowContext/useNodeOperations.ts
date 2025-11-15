/**
 * Hook for node CRUD operations
 */

import { useCallback } from 'react';
import type { Node } from '@xyflow/react';
import { logger } from '../../utils/logger';
import { useCircuitStore } from '../../store/circuitStore';
import type { CircuitNode } from '../../types/circuit';
import type { CircuitId, NodeId } from '../../types/identifiers';

interface UseNodeOperationsProps {
  circuitId: CircuitId;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

export function useNodeOperations({ circuitId, setNodes }: UseNodeOperationsProps) {
  const addNode = useCallback((node: CircuitNode) => {
    logger.debug({ caller: 'useNodeOperations' }, 'addNode', { nodeId: node.id });
    
    const flowNode: Node = {
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
      // Required properties for React Flow to properly initialize the node
      draggable: true,
      selectable: true,
      connectable: false, // We handle connections manually
    };
    setNodes((current) => [...current, flowNode]);
    useCircuitStore.getState().addNode(circuitId, node);
  }, [circuitId, setNodes]);

  const deleteNodes = useCallback((nodeIds: NodeId[]) => {
    logger.debug({ caller: 'useNodeOperations' }, 'deleteNodes', { count: nodeIds.length });
    
    setNodes((current) => current.filter(node => !nodeIds.includes(node.id as NodeId)));
    
    nodeIds.forEach(nodeId => {
      useCircuitStore.getState().deleteNode({ circuitId, nodeId });
    });
  }, [circuitId, setNodes]);

  const updateNodeData = useCallback((nodeId: NodeId, dataUpdates: Partial<CircuitNode['data']>) => {
    logger.debug({ caller: 'useNodeOperations' }, 'updateNodeData', { nodeId, dataUpdates });
    
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...dataUpdates } }
          : node
      )
    );
    
    const currentNode = useCircuitStore.getState().circuits[circuitId]?.nodes.find(n => n.id === nodeId);
    if (currentNode) {
      useCircuitStore.getState().updateNode({ circuitId, nodeId }, {
        data: { ...currentNode.data, ...dataUpdates } as CircuitNode['data']
      });
    }
  }, [circuitId, setNodes]);

  return { addNode, deleteNodes, updateNodeData };
}
