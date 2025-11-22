/**
 * Centralized state management for circuit data using Zustand.
 * This store is the single source of truth for all circuit data.
 * React Flow is configured as a controlled component that syncs with this store.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { logger } from "../utils/logger";
import type { Circuit, CircuitNode, CircuitEdge } from "../types/circuit";
import type { CircuitId, NodeId, EdgeId } from "../types/identifiers";
import { generateCircuitId } from "../types/identifiers";

/**
 * Parameters for node operations to reduce string parameter count.
 */
interface NodeOperationParams {
  circuitId: CircuitId;
  nodeId: NodeId;
}

/**
 * Parameters for edge operations to reduce string parameter count.
 */
interface EdgeOperationParams {
  circuitId: CircuitId;
  edgeId: EdgeId;
}

/**
 * The Zustand store interface for circuit management.
 * Provides CRUD operations for circuits and their components.
 */
interface CircuitStore {
  // State
  /** All circuits keyed by their ID */
  circuits: Record<string, Circuit>;
  /** ID of the currently active circuit */
  activeCircuitId: CircuitId | null;

  // Circuit management actions
  /** Create a new circuit and return its ID */
  createCircuit: (name?: string) => CircuitId;
  /** Delete a circuit by ID */
  deleteCircuit: (id: CircuitId) => void;
  /** Set the active circuit */
  setActiveCircuit: (id: CircuitId) => void;
  /** Update a circuit's name */
  updateCircuitName: (id: CircuitId, name: string) => void;

  // Node manipulation actions
  /** Add a node to a circuit */
  addNode: (circuitId: CircuitId, node: CircuitNode) => void;
  /** Update a node in a circuit */
  updateNode: (params: NodeOperationParams, updates: Partial<CircuitNode>) => void;
  /** Delete a node from a circuit */
  deleteNode: (params: NodeOperationParams) => void;

  // Edge manipulation actions
  /** Add an edge to a circuit */
  addEdge: (circuitId: CircuitId, edge: CircuitEdge) => void;
  /** Update an edge in a circuit */
  updateEdge: (params: EdgeOperationParams, updates: Partial<CircuitEdge>) => void;
  /** Delete an edge from a circuit */
  deleteEdge: (params: EdgeOperationParams) => void;

  // Batch update actions (for React Flow integration)
  /** Sync all nodes from React Flow to the store */
  syncNodesFromFlow: (circuitId: CircuitId, nodes: CircuitNode[]) => void;
  /** Sync all edges from React Flow to the store */
  syncEdgesFromFlow: (circuitId: CircuitId, edges: CircuitEdge[]) => void;

  // Selectors
  /** Get the currently active circuit */
  getActiveCircuit: () => Circuit | null;
  /** Get a circuit by ID */
  getCircuitById: (id: CircuitId) => Circuit | undefined;
}

/**
 * Helper function to update a circuit in the store.
 * Reduces code duplication by centralizing the update pattern.
 */
function updateCircuit(state: CircuitStore, circuitId: CircuitId, updates: Partial<Circuit>): CircuitStore {
  const circuit = state.circuits[circuitId];
  if (!circuit) return state;

  return {
    ...state,
    circuits: {
      ...state.circuits,
      [circuitId]: {
        ...circuit,
        ...updates,
        modifiedAt: Date.now(),
      },
    },
  };
}

/**
 * Helper function to update an item in an array by ID.
 * Returns null if the item is not found.
 */
function updateItemInArray<T extends { id: NodeId | EdgeId }>(
  items: T[],
  itemId: NodeId | EdgeId,
  updates: Partial<T>
): T[] | null {
  const itemIndex = items.findIndex(item => item.id === itemId);
  if (itemIndex === -1) return null;

  const updatedItems = [...items];
  const existingItem = updatedItems[itemIndex];
  if (!existingItem) return null;

  updatedItems[itemIndex] = {
    ...existingItem,
    ...updates,
  } as T;

  return updatedItems;
}

/**
 * Create the Zustand store for circuit management.
 * Uses persist middleware to save circuits to localStorage.
 */
export const useCircuitStore = create<CircuitStore>()(
  persist(
    (set, get) => ({
      // Initial state
      circuits: {},
      activeCircuitId: null,

      // Circuit management actions
      createCircuit: (name?: string) => {
        const id = generateCircuitId();
        const now = Date.now();
        const circuitCount = Object.keys(get().circuits).length + 1;
        const circuit: Circuit = {
          id,
          name: name ?? `Circuit ${circuitCount.toString()}`,
          nodes: [],
          edges: [],
          createdAt: now,
          modifiedAt: now,
        };

        set(state => ({
          circuits: {
            ...state.circuits,
            [id]: circuit,
          },
          activeCircuitId: id,
        }));

        return id;
      },

      deleteCircuit: (id: CircuitId) => {
        set(state => {
          const remainingCircuits = Object.fromEntries(Object.entries(state.circuits).filter(([key]) => key !== id));
          const firstKey = Object.keys(remainingCircuits)[0];
          const newActiveId =
            state.activeCircuitId === id ? ((firstKey as CircuitId | undefined) ?? null) : state.activeCircuitId;

          return {
            circuits: remainingCircuits,
            activeCircuitId: newActiveId,
          };
        });
      },

      setActiveCircuit: (id: CircuitId) => {
        set({ activeCircuitId: id });
      },

      updateCircuitName: (id: CircuitId, name: string) => {
        set(state => updateCircuit(state, id, { name }));
      },

      // Node manipulation actions
      addNode: (circuitId: CircuitId, node: CircuitNode) => {
        logger.debug({ caller: "circuitStore.addNode" }, "addNode called", { circuitId, node });

        set(state => {
          logger.debug({ caller: "circuitStore.addNode" }, "Current state circuits", Object.keys(state.circuits));
          const circuit = state.circuits[circuitId];

          if (!circuit) {
            logger.error({ caller: "circuitStore.addNode" }, "Circuit not found!", { circuitId });
            return state;
          }

          logger.debug({ caller: "circuitStore.addNode" }, "Current nodes count", circuit.nodes.length);
          const newNodes = [...circuit.nodes, node];
          logger.debug({ caller: "circuitStore.addNode" }, "New nodes count", newNodes.length);

          const updatedState = {
            circuits: {
              ...state.circuits,
              [circuitId]: {
                ...circuit,
                nodes: newNodes,
                modifiedAt: Date.now(),
              },
            },
          };

          logger.debug({ caller: "circuitStore.addNode" }, "Updated state created");
          return updatedState;
        });

        logger.debug({ caller: "circuitStore.addNode" }, "addNode completed");
      },

      updateNode: ({ circuitId, nodeId }: NodeOperationParams, updates: Partial<CircuitNode>) => {
        set(state => {
          const circuit = state.circuits[circuitId];
          if (!circuit) return state;

          const updatedNodes = updateItemInArray(circuit.nodes, nodeId, updates);
          if (!updatedNodes) return state;

          return updateCircuit(state, circuitId, { nodes: updatedNodes });
        });
      },

      deleteNode: ({ circuitId, nodeId }: NodeOperationParams) => {
        set(state => {
          const circuit = state.circuits[circuitId];
          if (!circuit) return state;

          // Remove the node
          const updatedNodes = circuit.nodes.filter(n => n.id !== nodeId);

          // Remove all edges connected to this node
          const updatedEdges = circuit.edges.filter(e => e.source !== nodeId && e.target !== nodeId);

          return updateCircuit(state, circuitId, {
            nodes: updatedNodes,
            edges: updatedEdges,
          });
        });
      },

      // Edge manipulation actions
      addEdge: (circuitId: CircuitId, edge: CircuitEdge) => {
        set(state => {
          const circuit = state.circuits[circuitId];
          if (!circuit) return state;

          return updateCircuit(state, circuitId, {
            edges: [...circuit.edges, edge],
          });
        });
      },

      updateEdge: ({ circuitId, edgeId }: EdgeOperationParams, updates: Partial<CircuitEdge>) => {
        set(state => {
          const circuit = state.circuits[circuitId];
          if (!circuit) return state;

          const updatedEdges = updateItemInArray(circuit.edges, edgeId, updates);
          if (!updatedEdges) return state;

          return updateCircuit(state, circuitId, { edges: updatedEdges });
        });
      },

      deleteEdge: ({ circuitId, edgeId }: EdgeOperationParams) => {
        set(state => {
          const circuit = state.circuits[circuitId];
          if (!circuit) return state;

          const updatedEdges = circuit.edges.filter(e => e.id !== edgeId);

          return updateCircuit(state, circuitId, { edges: updatedEdges });
        });
      },

      // Batch update actions (for React Flow integration)
      syncNodesFromFlow: (circuitId: CircuitId, nodes: CircuitNode[]) => {
        set(state => updateCircuit(state, circuitId, { nodes }));
      },

      syncEdgesFromFlow: (circuitId: CircuitId, edges: CircuitEdge[]) => {
        set(state => updateCircuit(state, circuitId, { edges }));
      },

      // Selectors
      getActiveCircuit: () => {
        const state = get();
        if (!state.activeCircuitId) return null;
        return state.circuits[state.activeCircuitId] ?? null;
      },

      getCircuitById: (id: CircuitId) => {
        return get().circuits[id];
      },
    }),
    {
      name: "circuit-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
