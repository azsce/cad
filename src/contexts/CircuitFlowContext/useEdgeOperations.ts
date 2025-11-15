/**
 * Hook for edge CRUD operations
 */

import { useCallback } from 'react';
import type { Edge } from '@xyflow/react';
import { logger } from '../../utils/logger';
import { useCircuitStore } from '../../store/circuitStore';
import type { CircuitEdge } from '../../types/circuit';
import type { CircuitId, EdgeId } from '../../types/identifiers';

interface UseEdgeOperationsProps {
  circuitId: CircuitId;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export function useEdgeOperations({ circuitId, setEdges }: UseEdgeOperationsProps) {
  const addEdge = useCallback((edge: CircuitEdge) => {
    logger.debug({ caller: 'useEdgeOperations' }, 'addEdge', { edgeId: edge.id });
    
    const flowEdge: Edge = {
      id: edge.id,
      type: 'default',
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      ...(edge.waypoints && { data: { waypoints: edge.waypoints } }),
    };
    setEdges((current) => [...current, flowEdge]);
    useCircuitStore.getState().addEdge(circuitId, edge);
  }, [circuitId, setEdges]);

  const deleteEdges = useCallback((edgeIds: EdgeId[]) => {
    logger.debug({ caller: 'useEdgeOperations' }, 'deleteEdges', { count: edgeIds.length });
    
    setEdges((current) => current.filter(edge => !edgeIds.includes(edge.id as EdgeId)));
    
    edgeIds.forEach(edgeId => {
      useCircuitStore.getState().deleteEdge({ circuitId, edgeId });
    });
  }, [circuitId, setEdges]);

  const updateEdge = useCallback((edgeId: EdgeId, updates: Partial<CircuitEdge>) => {
    logger.debug({ caller: 'useEdgeOperations' }, 'updateEdge', { edgeId, updates });
    
    setEdges((current) =>
      current.map((edge) =>
        edge.id === edgeId
          ? { ...edge, data: { ...edge.data, ...updates } }
          : edge
      )
    );
    
    useCircuitStore.getState().updateEdge({ circuitId, edgeId }, updates);
  }, [circuitId, setEdges]);

  return { addEdge, deleteEdges, updateEdge };
}
