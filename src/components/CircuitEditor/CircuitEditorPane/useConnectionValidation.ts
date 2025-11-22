/**
 * Hook for validating connections between nodes
 */

import { useCallback } from "react";
import type { Edge, Connection } from "@xyflow/react";

/**
 * Validate connection between two nodes.
 * Prevents invalid connections such as:
 * - Connecting a node to itself (self-connections)
 * - Duplicate connections between the same two handles
 *
 * This validation applies to both direct connections and waypoint-based connections.
 * Waypoints are intermediate path points and don't affect connection validity.
 *
 * Requirements: 7.1, 7.2, 7.4
 */
export const useConnectionValidation = (edges: Edge[]) => {
  const isValidConnection = useCallback(
    (connection: Edge | Connection): boolean => {
      // Prevent self-connections (Requirement 7.1)
      if (connection.source === connection.target) {
        return false;
      }

      // Ensure both handles are specified
      if (!connection.sourceHandle || !connection.targetHandle) {
        return false;
      }

      // Prevent duplicate connections (Requirement 7.2)
      // Check if this exact connection already exists (same source, sourceHandle, target, targetHandle)
      const connectionExists = edges.some(
        edge =>
          edge.source === connection.source &&
          edge.sourceHandle === connection.sourceHandle &&
          edge.target === connection.target &&
          edge.targetHandle === connection.targetHandle
      );

      if (connectionExists) {
        return false;
      }

      // Allow multiple connections to the same handle (needed for circuit diagrams)
      // Requirement 7.4: Remain in connection mode without creating edge for invalid connections
      return true;
    },
    [edges]
  );

  return { isValidConnection };
};
