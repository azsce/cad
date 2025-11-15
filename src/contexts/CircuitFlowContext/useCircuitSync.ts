/**
 * Hook for synchronizing circuit data between store and local state
 */

import { useState, useEffect } from 'react';
import { type Node, type Edge } from '@xyflow/react';
import { logger } from '../../utils/logger';
import { useCircuitStore } from '../../store/circuitStore';
import type { CircuitId } from '../../types/identifiers';
import { initializeFromCircuit, convertNodesToFlow, convertEdgesToFlow } from './helpers';

/**
 * Manages local state for nodes and edges, synchronized with the circuit store
 */
export function useCircuitSync(circuitId: CircuitId) {
  // Initialize from store on mount - use regular useState instead of useNodesState
  // because we have custom onNodesChange logic in useFlowChangeHandlers
  const [nodes, setNodes] = useState<Node[]>(() => {
    const circuit = useCircuitStore.getState().circuits[circuitId];
    if (!circuit) {
      logger.warn({ caller: 'useCircuitSync' }, 'Circuit not found during init', { circuitId });
      return [];
    }
    return convertNodesToFlow(circuit.nodes);
  });
  
  const [edges, setEdges] = useState<Edge[]>(() => {
    const circuit = useCircuitStore.getState().circuits[circuitId];
    if (!circuit) {
      return [];
    }
    return convertEdgesToFlow(circuit.edges);
  });
  
  // Re-initialize when circuitId changes
  useEffect(() => {
    logger.debug({ caller: 'useCircuitSync' }, 'Circuit changed, re-initializing', { circuitId });
    
    const circuit = useCircuitStore.getState().circuits[circuitId];
    if (!circuit) {
      logger.warn({ caller: 'useCircuitSync' }, 'Circuit not found', { circuitId });
      return;
    }
    
    const { nodes: flowNodes, edges: flowEdges } = initializeFromCircuit(circuit);
    
    // Use queueMicrotask to defer state updates and avoid cascading renders
    queueMicrotask(() => {
      setNodes(flowNodes);
      setEdges(flowEdges);
      
      logger.debug({ caller: 'useCircuitSync' }, 'Re-initialized', { 
        nodesCount: flowNodes.length,
        edgesCount: flowEdges.length 
      });
    });
  }, [circuitId]);

  return { nodes, edges, setNodes, setEdges };
}
