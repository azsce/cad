/**
 * Utilities for traversing connection trees through junctions.
 * Used to find all component terminals connected through wires and junctions.
 */

import { logger } from './logger';
import type { CircuitNode, CircuitEdge } from '../types/circuit';
import type { NodeId } from '../types/identifiers';

/**
 * Terminal reference (component node + handle)
 */
export interface Terminal {
  nodeId: NodeId;
  handleId: string;
}

/**
 * Helper to create unique key for terminal
 */
function terminalKey(terminal: Terminal): string {
  return `${terminal.nodeId}-${terminal.handleId}`;
}

/**
 * Get the other end of an edge given one terminal
 */
function getOtherEnd(edge: CircuitEdge, current: Terminal): Terminal {
  if (edge.source === current.nodeId && edge.sourceHandle === current.handleId) {
    return { nodeId: edge.target, handleId: edge.targetHandle };
  }
  return { nodeId: edge.source, handleId: edge.sourceHandle };
}

/**
 * Find edges connected to a terminal
 */
function findConnectedEdges(terminal: Terminal, edges: CircuitEdge[]): CircuitEdge[] {
  return edges.filter(
    (edge) =>
      (edge.source === terminal.nodeId && edge.sourceHandle === terminal.handleId) ||
      (edge.target === terminal.nodeId && edge.targetHandle === terminal.handleId)
  );
}

interface ProcessTerminalParams {
  otherEnd: Terminal;
  otherNode: CircuitNode;
  visited: Set<string>;
  connectedTerminals: Terminal[];
  queue: Terminal[];
}

/**
 * 🔄 Check if terminal should be added to results
 */
function shouldAddTerminal(terminal: Terminal, visited: Set<string>): boolean {
  const key = terminalKey(terminal);
  return !visited.has(key);
}

/**
 * 🔄 Process a terminal during BFS traversal
 */
function processTerminal(params: ProcessTerminalParams): void {
  const { otherEnd, otherNode, visited, connectedTerminals, queue } = params;
  
  if (otherNode.type === 'junction') {
    queue.push(otherEnd);
    return;
  }
  
  // Component terminal - add to results if not visited
  if (shouldAddTerminal(otherEnd, visited)) {
    connectedTerminals.push(otherEnd);
    queue.push(otherEnd);
  }
}

interface TraversalContext {
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  visited: Set<string>;
  connectedTerminals: Terminal[];
  queue: Terminal[];
}

/**
 * 🔄 Process a single edge during BFS traversal
 */
function processEdge(
  edge: CircuitEdge,
  current: Terminal,
  context: TraversalContext
): void {
  const otherEnd = getOtherEnd(edge, current);
  const otherNode = context.nodes.find((n) => n.id === otherEnd.nodeId);
  
  if (!otherNode) return;
  
  processTerminal({
    otherEnd,
    otherNode,
    visited: context.visited,
    connectedTerminals: context.connectedTerminals,
    queue: context.queue,
  });
}

/**
 * 🔄 Process current terminal in BFS queue
 */
function processCurrentTerminal(
  current: Terminal,
  context: TraversalContext
): void {
  const key = terminalKey(current);
  if (context.visited.has(key)) return;
  context.visited.add(key);

  const connectedEdges = findConnectedEdges(current, context.edges);

  connectedEdges.forEach((edge) => {
    processEdge(edge, current, context);
  });
}

/**
 * 🔍 Find all component terminals connected to a starting terminal through wires and junctions.
 * Uses BFS to traverse the connection graph.
 */
export function findConnectedTerminals(
  startTerminal: Terminal,
  nodes: CircuitNode[],
  edges: CircuitEdge[]
): Terminal[] {
  const visited = new Set<string>();
  const connectedTerminals: Terminal[] = [];
  const queue: Terminal[] = [startTerminal];

  const context: TraversalContext = {
    nodes,
    edges,
    visited,
    connectedTerminals,
    queue,
  };

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    processCurrentTerminal(current, context);
  }

  logger.debug({ caller: 'connectionTraversal' }, 'Found connected terminals', {
    startTerminal,
    connectedCount: connectedTerminals.length,
  });

  return connectedTerminals;
}

/**
 * 🗺️ Group all terminals into connected sets (electrical nodes).
 * Each set represents terminals that are electrically connected through wires/junctions.
 */
export function groupTerminalsIntoElectricalNodes(
  nodes: CircuitNode[],
  edges: CircuitEdge[]
): Terminal[][] {
  const allTerminals: Terminal[] = [];
  const visited = new Set<string>();

  // Collect all component terminals (exclude junctions)
  nodes.forEach((node) => {
    if (node.type === 'junction') return;

    // Get handles for this component type
    const handles = getHandlesForNodeType(node.type);
    handles.forEach((handleId) => {
      allTerminals.push({ nodeId: node.id, handleId });
    });
  });

  const electricalNodes: Terminal[][] = [];

  // For each unvisited terminal, find all connected terminals
  allTerminals.forEach((terminal) => {
    const key = `${terminal.nodeId}-${terminal.handleId}`;
    if (visited.has(key)) return;

    // Find all terminals connected to this one
    const connectedSet = findConnectedTerminals(terminal, nodes, edges);

    // Mark all as visited
    visited.add(key);
    connectedSet.forEach((t) => {
      visited.add(`${t.nodeId}-${t.handleId}`);
    });

    // Add this terminal to the set
    const fullSet = [terminal, ...connectedSet];
    electricalNodes.push(fullSet);
  });

  logger.debug({ caller: 'connectionTraversal' }, 'Grouped terminals into electrical nodes', {
    totalTerminals: allTerminals.length,
    electricalNodeCount: electricalNodes.length,
  });

  return electricalNodes;
}

/**
 * Get handle IDs for a node type.
 */
function getHandlesForNodeType(nodeType: string): string[] {
  switch (nodeType) {
    case 'resistor':
    case 'voltageSource':
    case 'currentSource':
      return ['left', 'right'];
    case 'ground':
      return ['top'];
    case 'junction':
      return ['center'];
    default:
      logger.warn({ caller: 'connectionTraversal' }, 'Unknown node type', { nodeType });
      return [];
  }
}

/**
 * ✅ Check if two terminals are electrically connected (through wires/junctions).
 */
export function areTerminalsConnected(
  terminal1: Terminal,
  terminal2: Terminal,
  nodes: CircuitNode[],
  edges: CircuitEdge[]
): boolean {
  const connected = findConnectedTerminals(terminal1, nodes, edges);
  return connected.some((t) => t.nodeId === terminal2.nodeId && t.handleId === terminal2.handleId);
}
