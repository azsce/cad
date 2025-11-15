/**
 * Hook for completing connections
 */

import { useCallback } from 'react';
import type { Connection } from '@xyflow/react';
import { logger } from '../../utils/logger';
import { useConnectionStore } from '../../store/connectionStore';
import type { CircuitEdge, Waypoint } from '../../types/circuit';
import { createNodeId, createEdgeId } from '../../types/identifiers';

interface UseConnectionCompleteProps {
  addEdge: (edge: CircuitEdge) => void;
}

/**
 * Validated connection with all required fields
 */
interface ValidatedConnection {
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

/**
 * Type guard to validate that a connection has all required fields
 */
function isValidConnection(connection: Connection): connection is ValidatedConnection {
  return Boolean(
    connection.source &&
    connection.target &&
    connection.sourceHandle &&
    connection.targetHandle
  );
}

/**
 * Creates a new edge from a completed connection
 */
function createEdgeFromConnection(connection: ValidatedConnection, waypoints: Waypoint[]): CircuitEdge {
  const timestamp = Date.now().toString();
  const randomPart = crypto.randomUUID().substring(0, 8);
  
  const edge: CircuitEdge = {
    id: createEdgeId(`edge-${timestamp}-${randomPart}`),
    source: createNodeId(connection.source),
    sourceHandle: connection.sourceHandle,
    target: createNodeId(connection.target),
    targetHandle: connection.targetHandle,
  };

  if (waypoints.length > 0) {
    edge.waypoints = waypoints;
  }

  return edge;
}

export function useConnectionComplete({ addEdge }: UseConnectionCompleteProps) {
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;

      const result = useConnectionStore.getState().endConnecting();
      const waypoints = result?.waypoints ?? [];

      logger.debug({ caller: 'useConnectionComplete' }, 'Creating edge with waypoints', {
        connection,
        waypointCount: waypoints.length,
      });

      const newEdge = createEdgeFromConnection(connection, waypoints);
      addEdge(newEdge);
    },
    [addEdge]
  );

  return { onConnect };
}
