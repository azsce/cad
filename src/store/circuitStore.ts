/**
 * Centralized state management for circuit data using Zustand.
 * This store is the single source of truth for all circuit data.
 * React Flow is configured as a controlled component that syncs with this store.
 */

import { create } from 'zustand';
import type { Circuit, CircuitNode, CircuitEdge } from '../types/circuit';

/**
 * The Zustand store interface for circuit management.
 * Provides CRUD operations for circuits and their components.
 */
interface CircuitStore {
  // State
  /** All circuits keyed by their ID */
  circuits: Record<string, Circuit>;
  /** ID of the currently active circuit */
  activeCircuitId: string | null;

  // Circuit management actions
  /** Create a new circuit and return its ID */
  createCircuit: (name?: string) => string;
  /** Delete a circuit by ID */
  deleteCircuit: (id: string) => void;
  /** Set the active circuit */
  setActiveCircuit: (id: string) => void;
  /** Update a circuit's name */
  updateCircuitName: (id: string, name: string) => void;

  // Node manipulation actions
  /** Add a node to a circuit */
  addNode: (circuitId: string, node: CircuitNode) => void;
  /** Update a node in a circuit */
  updateNode: (
    circuitId: string,
    nodeId: string,
    updates: Partial<CircuitNode>
  ) => void;
  /** Delete a node from a circuit */
  deleteNode: (circuitId: string, nodeId: string) => void;

  // Edge manipulation actions
  /** Add an edge to a circuit */
  addEdge: (circuitId: string, edge: CircuitEdge) => void;
  /** Update an edge in a circuit */
  updateEdge: (
    circuitId: string,
    edgeId: string,
    updates: Partial<CircuitEdge>
  ) => void;
  /** Delete an edge from a circuit */
  deleteEdge: (circuitId: string, edgeId: string) => void;

  // Batch update actions (for React Flow integration)
  /** Sync all nodes from React Flow to the store */
  syncNodesFromFlow: (circuitId: string, nodes: CircuitNode[]) => void;
  /** Sync all edges from React Flow to the store */
  syncEdgesFromFlow: (circuitId: string, edges: CircuitEdge[]) => void;

  // Selectors
  /** Get the currently active circuit */
  getActiveCircuit: () => Circuit | null;
  /** Get a circuit by ID */
  getCircuitById: (id: string) => Circuit | undefined;
}

/**
 * Generate a unique ID for circuits.
 * Uses timestamp and crypto.randomUUID for uniqueness.
 */
function generateCircuitId(): string {
  const timestamp = Date.now().toString();
  const randomPart = crypto.randomUUID().substring(0, 8);
  return `circuit-${timestamp}-${randomPart}`;
}

/**
 * Create the Zustand store for circuit management.
 */
export const useCircuitStore = create<CircuitStore>((set, get) => ({
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

    set((state) => ({
      circuits: {
        ...state.circuits,
        [id]: circuit,
      },
      activeCircuitId: id,
    }));

    return id;
  },

  deleteCircuit: (id: string) => {
    set((state) => {
      const remainingCircuits = Object.fromEntries(
        Object.entries(state.circuits).filter(([key]) => key !== id)
      );
      const newActiveId =
        state.activeCircuitId === id
          ? Object.keys(remainingCircuits)[0] ?? null
          : state.activeCircuitId;

      return {
        circuits: remainingCircuits,
        activeCircuitId: newActiveId,
      };
    });
  },

  setActiveCircuit: (id: string) => {
    set({ activeCircuitId: id });
  },

  updateCircuitName: (id: string, name: string) => {
    set((state) => {
      const circuit = state.circuits[id];
      if (!circuit) return state;

      return {
        circuits: {
          ...state.circuits,
          [id]: {
            ...circuit,
            name,
            modifiedAt: Date.now(),
          },
        },
      };
    });
  },

  // Node manipulation actions
  addNode: (circuitId: string, node: CircuitNode) => {
    set((state) => {
      const circuit = state.circuits[circuitId];
      if (!circuit) return state;

      return {
        circuits: {
          ...state.circuits,
          [circuitId]: {
            ...circuit,
            nodes: [...circuit.nodes, node],
            modifiedAt: Date.now(),
          },
        },
      };
    });
  },

  updateNode: (circuitId: string, nodeId: string, updates: Partial<CircuitNode>) => {
    set((state) => {
      const circuit = state.circuits[circuitId];
      if (!circuit) return state;

      const nodeIndex = circuit.nodes.findIndex((n) => n.id === nodeId);
      if (nodeIndex === -1) return state;

      const updatedNodes = [...circuit.nodes];
      const existingNode = updatedNodes[nodeIndex];
      if (!existingNode) return state;

      updatedNodes[nodeIndex] = {
        ...existingNode,
        ...updates,
      } as CircuitNode;

      return {
        circuits: {
          ...state.circuits,
          [circuitId]: {
            ...circuit,
            nodes: updatedNodes,
            modifiedAt: Date.now(),
          },
        },
      };
    });
  },

  deleteNode: (circuitId: string, nodeId: string) => {
    set((state) => {
      const circuit = state.circuits[circuitId];
      if (!circuit) return state;

      // Remove the node
      const updatedNodes = circuit.nodes.filter((n) => n.id !== nodeId);

      // Remove all edges connected to this node
      const updatedEdges = circuit.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      );

      return {
        circuits: {
          ...state.circuits,
          [circuitId]: {
            ...circuit,
            nodes: updatedNodes,
            edges: updatedEdges,
            modifiedAt: Date.now(),
          },
        },
      };
    });
  },

  // Edge manipulation actions
  addEdge: (circuitId: string, edge: CircuitEdge) => {
    set((state) => {
      const circuit = state.circuits[circuitId];
      if (!circuit) return state;

      return {
        circuits: {
          ...state.circuits,
          [circuitId]: {
            ...circuit,
            edges: [...circuit.edges, edge],
            modifiedAt: Date.now(),
          },
        },
      };
    });
  },

  updateEdge: (circuitId: string, edgeId: string, updates: Partial<CircuitEdge>) => {
    set((state) => {
      const circuit = state.circuits[circuitId];
      if (!circuit) return state;

      const edgeIndex = circuit.edges.findIndex((e) => e.id === edgeId);
      if (edgeIndex === -1) return state;

      const updatedEdges = [...circuit.edges];
      const existingEdge = updatedEdges[edgeIndex];
      if (!existingEdge) return state;

      updatedEdges[edgeIndex] = {
        ...existingEdge,
        ...updates,
      } as CircuitEdge;

      return {
        circuits: {
          ...state.circuits,
          [circuitId]: {
            ...circuit,
            edges: updatedEdges,
            modifiedAt: Date.now(),
          },
        },
      };
    });
  },

  deleteEdge: (circuitId: string, edgeId: string) => {
    set((state) => {
      const circuit = state.circuits[circuitId];
      if (!circuit) return state;

      const updatedEdges = circuit.edges.filter((e) => e.id !== edgeId);

      return {
        circuits: {
          ...state.circuits,
          [circuitId]: {
            ...circuit,
            edges: updatedEdges,
            modifiedAt: Date.now(),
          },
        },
      };
    });
  },

  // Batch update actions (for React Flow integration)
  syncNodesFromFlow: (circuitId: string, nodes: CircuitNode[]) => {
    set((state) => {
      const circuit = state.circuits[circuitId];
      if (!circuit) return state;

      return {
        circuits: {
          ...state.circuits,
          [circuitId]: {
            ...circuit,
            nodes,
            modifiedAt: Date.now(),
          },
        },
      };
    });
  },

  syncEdgesFromFlow: (circuitId: string, edges: CircuitEdge[]) => {
    set((state) => {
      const circuit = state.circuits[circuitId];
      if (!circuit) return state;

      return {
        circuits: {
          ...state.circuits,
          [circuitId]: {
            ...circuit,
            edges,
            modifiedAt: Date.now(),
          },
        },
      };
    });
  },

  // Selectors
  getActiveCircuit: () => {
    const state = get();
    if (!state.activeCircuitId) return null;
    return state.circuits[state.activeCircuitId] ?? null;
  },

  getCircuitById: (id: string) => {
    return get().circuits[id];
  },
}));
