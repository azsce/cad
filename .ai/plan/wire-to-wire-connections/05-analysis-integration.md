# Phase 5: Analysis Integration

## Overview

Integrate junctions into the circuit analysis system by implementing junction collapse (finding direct component-to-component connections) and updating graph transformation and validation logic.

## Tasks

### Task 5.1: Implement Connection Tree Traversal

**File**: `src/utils/connectionTraversal.ts`

```typescript
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
 * Find all component terminals connected to a starting terminal through wires and junctions.
 * Uses BFS to traverse the connection graph.
 * 
 * @param startTerminal - Starting point (component terminal)
 * @param nodes - All circuit nodes
 * @param edges - All circuit edges
 * @returns Array of connected component terminals (excluding junctions)
 */
export function findConnectedTerminals(
  startTerminal: Terminal,
  nodes: CircuitNode[],
  edges: CircuitEdge[]
): Terminal[] {
  const visited = new Set<string>();
  const connectedTerminals: Terminal[] = [];
  const queue: Terminal[] = [startTerminal];

  // Helper to create unique key for terminal
  const terminalKey = (terminal: Terminal): string => 
    `${terminal.nodeId}-${terminal.handleId}`;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const key = terminalKey(current);
    if (visited.has(key)) continue;
    visited.add(key);

    // Find all edges connected to this terminal
    const connectedEdges = edges.filter(edge =>
      (edge.source === current.nodeId && edge.sourceHandle === current.handleId) ||
      (edge.target === current.nodeId && edge.targetHandle === current.handleId)
    );

    for (const edge of connectedEdges) {
      // Get the other end of the edge
      const otherEnd: Terminal = 
        edge.source === current.nodeId && edge.sourceHandle === current.handleId
          ? { nodeId: edge.target, handleId: edge.targetHandle }
          : { nodeId: edge.source, handleId: edge.sourceHandle };

      // Find the node at the other end
      const otherNode = nodes.find(n => n.id === otherEnd.nodeId);
      if (!otherNode) continue;

      if (otherNode.type === 'junction') {
        // Junction - continue traversing through it
        queue.push(otherEnd);
      } else {
        // Component terminal - add to results
        const otherKey = terminalKey(otherEnd);
        if (!visited.has(otherKey)) {
          connectedTerminals.push(otherEnd);
          queue.push(otherEnd); // Continue traversing from this terminal
        }
      }
    }
  }

  logger.debug({ caller: 'connectionTraversal' }, 'Found connected terminals', {
    startTerminal,
    connectedCount: connectedTerminals.length,
  });

  return connectedTerminals;
}

/**
 * Group all terminals into connected sets (electrical nodes).
 * Each set represents terminals that are electrically connected through wires/junctions.
 * 
 * @param nodes - All circuit nodes
 * @param edges - All circuit edges
 * @returns Array of terminal sets, each representing an electrical node
 */
export function groupTerminalsIntoElectricalNodes(
  nodes: CircuitNode[],
  edges: CircuitEdge[]
): Terminal[][] {
  const allTerminals: Terminal[] = [];
  const visited = new Set<string>();

  // Collect all component terminals (exclude junctions)
  nodes.forEach(node => {
    if (node.type === 'junction') return;

    // Get handles for this component type
    const handles = getHandlesForNodeType(node.type);
    handles.forEach(handleId => {
      allTerminals.push({ nodeId: node.id, handleId });
    });
  });

  const electricalNodes: Terminal[][] = [];

  // For each unvisited terminal, find all connected terminals
  allTerminals.forEach(terminal => {
    const key = `${terminal.nodeId}-${terminal.handleId}`;
    if (visited.has(key)) return;

    // Find all terminals connected to this one
    const connectedSet = findConnectedTerminals(terminal, nodes, edges);
    
    // Mark all as visited
    visited.add(key);
    connectedSet.forEach(t => {
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
 * Check if two terminals are electrically connected (through wires/junctions).
 */
export function areTerminalsConnected(
  terminal1: Terminal,
  terminal2: Terminal,
  nodes: CircuitNode[],
  edges: CircuitEdge[]
): boolean {
  const connected = findConnectedTerminals(terminal1, nodes, edges);
  return connected.some(
    t => t.nodeId === terminal2.nodeId && t.handleId === terminal2.handleId
  );
}
```

**Verification**:
- BFS traversal works correctly
- Junctions are skipped, only component terminals returned
- All connected terminals found

---

### Task 5.2: Update Graph Transformation

**File**: `src/contexts/ValidationContext/graphTransformation.ts`

```typescript
import { groupTerminalsIntoElectricalNodes } from '../../utils/connectionTraversal';
import type { Terminal } from '../../utils/connectionTraversal';

/**
 * Transform circuit to analysis graph.
 * Junctions are collapsed - only component-to-component connections matter.
 */
export function transformCircuitToGraph(circuit: Circuit): AnalysisGraph {
  logger.debug({ caller: 'graphTransformation' }, 'Transforming circuit to graph', {
    nodeCount: circuit.nodes.length,
    edgeCount: circuit.edges.length,
  });

  // Group terminals into electrical nodes (collapse junctions)
  const electricalNodeSets = groupTerminalsIntoElectricalNodes(
    circuit.nodes,
    circuit.edges
  );

  // Create electrical nodes
  const electricalNodes: ElectricalNode[] = electricalNodeSets.map((terminalSet, index) => {
    const nodeId = `node-${index}`;
    
    return {
      id: nodeId,
      connectedBranchIds: [], // Will be populated when creating branches
      terminals: terminalSet, // Store terminals for reference
    };
  });

  // Create branches (component connections)
  const branches: Branch[] = [];
  const componentNodes = circuit.nodes.filter(n => n.type !== 'junction');

  componentNodes.forEach(node => {
    // For each component, create branches based on its type
    if (node.type === 'resistor') {
      const leftTerminal: Terminal = { nodeId: node.id, handleId: 'left' };
      const rightTerminal: Terminal = { nodeId: node.id, handleId: 'right' };

      // Find which electrical nodes these terminals belong to
      const leftNodeIndex = electricalNodeSets.findIndex(set =>
        set.some(t => t.nodeId === leftTerminal.nodeId && t.handleId === leftTerminal.handleId)
      );
      const rightNodeIndex = electricalNodeSets.findIndex(set =>
        set.some(t => t.nodeId === rightTerminal.nodeId && t.handleId === rightTerminal.handleId)
      );

      if (leftNodeIndex === -1 || rightNodeIndex === -1) {
        logger.warn({ caller: 'graphTransformation' }, 'Component terminal not in any electrical node', {
          nodeId: node.id,
        });
        return;
      }

      const branch: Branch = {
        id: `branch-${node.id}`,
        type: 'resistor',
        value: node.data.value,
        fromNodeId: electricalNodes[leftNodeIndex]!.id,
        toNodeId: electricalNodes[rightNodeIndex]!.id,
        componentNodeId: node.id, // Reference to original component
      };

      branches.push(branch);
      electricalNodes[leftNodeIndex]!.connectedBranchIds.push(branch.id);
      electricalNodes[rightNodeIndex]!.connectedBranchIds.push(branch.id);
    }
    // Similar logic for voltageSource, currentSource, ground
    // ... (implement for other component types)
  });

  // Find reference node (ground)
  const groundNode = circuit.nodes.find(n => n.type === 'ground');
  let referenceNodeId = electricalNodes[0]?.id ?? 'node-0';

  if (groundNode) {
    const groundTerminal: Terminal = { nodeId: groundNode.id, handleId: 'top' };
    const groundNodeIndex = electricalNodeSets.findIndex(set =>
      set.some(t => t.nodeId === groundTerminal.nodeId && t.handleId === groundTerminal.handleId)
    );
    if (groundNodeIndex !== -1) {
      referenceNodeId = electricalNodes[groundNodeIndex]!.id;
    }
  }

  logger.debug({ caller: 'graphTransformation' }, 'Graph transformation complete', {
    electricalNodeCount: electricalNodes.length,
    branchCount: branches.length,
    referenceNodeId,
  });

  return {
    nodes: electricalNodes,
    branches,
    referenceNodeId,
    allSpanningTrees: [], // Will be computed later
    selectedTreeId: '',
  };
}
```

**Key Changes**:
- Use `groupTerminalsIntoElectricalNodes` to collapse junctions
- Each electrical node contains multiple terminals (from different components)
- Branches connect electrical nodes, not individual component nodes
- Junctions are completely abstracted away in analysis

**Verification**:
- Junctions are collapsed correctly
- Electrical nodes represent connected terminals
- Branches connect correct electrical nodes

---

### Task 5.3: Update Validation Rules

**File**: `src/contexts/ValidationContext/validation.ts`

```typescript
/**
 * Validate circuit for analysis.
 * Junctions are allowed and handled by graph transformation.
 */
export function validateCircuit(circuit: Circuit): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for isolated junctions (no connections)
  const junctions = circuit.nodes.filter(n => n.type === 'junction');
  junctions.forEach(junction => {
    const connectedEdges = circuit.edges.filter(
      e => e.source === junction.id || e.target === junction.id
    );

    if (connectedEdges.length === 0) {
      warnings.push(`Junction ${junction.id} has no connections`);
    } else if (connectedEdges.length === 1) {
      warnings.push(`Junction ${junction.id} has only one connection`);
    }
  });

  // Check for isolated components (not connected to anything)
  const components = circuit.nodes.filter(n => n.type !== 'junction');
  components.forEach(component => {
    const connectedEdges = circuit.edges.filter(
      e => e.source === component.id || e.target === component.id
    );

    if (connectedEdges.length === 0) {
      errors.push(`Component ${component.id} is not connected`);
    }
  });

  // Check for at least one source (voltage or current)
  const hasSources = circuit.nodes.some(
    n => n.type === 'voltageSource' || n.type === 'currentSource'
  );
  if (!hasSources) {
    errors.push('Circuit must have at least one voltage or current source');
  }

  // Check for at least one ground
  const hasGround = circuit.nodes.some(n => n.type === 'ground');
  if (!hasGround) {
    errors.push('Circuit must have a ground node');
  }

  // Check graph connectivity (after junction collapse)
  try {
    const graph = transformCircuitToGraph(circuit);
    const isConnected = checkGraphConnectivity(graph);
    
    if (!isConnected) {
      errors.push('Circuit is not fully connected');
    }
  } catch (error) {
    errors.push(`Graph transformation failed: ${error}`);
  }

  return {
    isValid: errors.length === 0,
    isSolvable: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if graph is fully connected using BFS.
 */
function checkGraphConnectivity(graph: AnalysisGraph): boolean {
  if (graph.nodes.length === 0) return false;
  if (graph.nodes.length === 1) return true;

  const visited = new Set<string>();
  const queue = [graph.nodes[0]!.id];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;
    visited.add(currentId);

    const currentNode = graph.nodes.find(n => n.id === currentId);
    if (!currentNode) continue;

    // Find all connected nodes through branches
    currentNode.connectedBranchIds.forEach(branchId => {
      const branch = graph.branches.find(b => b.id === branchId);
      if (!branch) return;

      const otherNodeId = branch.fromNodeId === currentId 
        ? branch.toNodeId 
        : branch.fromNodeId;
      
      if (!visited.has(otherNodeId)) {
        queue.push(otherNodeId);
      }
    });
  }

  return visited.size === graph.nodes.length;
}
```

**Verification**:
- Isolated junctions generate warnings
- Isolated components generate errors
- Graph connectivity check works with collapsed junctions

---

### Task 5.4: Add Connection Traversal Tests

**File**: `src/utils/connectionTraversal.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';
import { findConnectedTerminals, groupTerminalsIntoElectricalNodes, areTerminalsConnected } from './connectionTraversal';
import type { CircuitNode, CircuitEdge, Terminal } from '../types/circuit';
import { createNodeId, createEdgeId } from '../types/identifiers';

describe('connectionTraversal', () => {
  describe('findConnectedTerminals', () => {
    it('should find terminals connected through junction', () => {
      const nodes: CircuitNode[] = [
        {
          id: createNodeId('r1'),
          type: 'resistor',
          position: { x: 0, y: 0 },
          data: { value: 100 },
        },
        {
          id: createNodeId('j1'),
          type: 'junction',
          position: { x: 50, y: 0 },
          data: {},
        },
        {
          id: createNodeId('r2'),
          type: 'resistor',
          position: { x: 100, y: 0 },
          data: { value: 200 },
        },
      ];

      const edges: CircuitEdge[] = [
        {
          id: createEdgeId('e1'),
          source: createNodeId('r1'),
          sourceHandle: 'right',
          target: createNodeId('j1'),
          targetHandle: 'center',
        },
        {
          id: createEdgeId('e2'),
          source: createNodeId('j1'),
          sourceHandle: 'center',
          target: createNodeId('r2'),
          targetHandle: 'left',
        },
      ];

      const startTerminal: Terminal = {
        nodeId: createNodeId('r1'),
        handleId: 'right',
      };

      const connected = findConnectedTerminals(startTerminal, nodes, edges);

      expect(connected).toHaveLength(1);
      expect(connected[0]?.nodeId).toBe(createNodeId('r2'));
      expect(connected[0]?.handleId).toBe('left');
    });

    it('should handle multiple junctions in path', () => {
      // Test with R1 -> J1 -> J2 -> R2
      // Should find R2 from R1
    });
  });

  describe('groupTerminalsIntoElectricalNodes', () => {
    it('should group connected terminals', () => {
      // Test grouping with junctions
    });
  });

  describe('areTerminalsConnected', () => {
    it('should return true for connected terminals', () => {
      // Test connection check
    });

    it('should return false for disconnected terminals', () => {
      // Test disconnection check
    });
  });
});
```

**Verification**:
- All tests pass
- Edge cases handled
- Complex junction paths work

---

### Task 5.5: Update Analysis Context

**File**: `src/contexts/ValidationContext/ValidationProvider.tsx`

Ensure the ValidationProvider uses the updated graph transformation:

```typescript
// The existing ValidationProvider should automatically use the updated
// transformCircuitToGraph function. No changes needed unless there are
// specific integration issues.

// Verify that:
// 1. Graph transformation is called with circuit data
// 2. Junctions are properly collapsed
// 3. Validation results include junction warnings
```

**Verification**:
- Analysis runs with junctions in circuit
- Junctions are collapsed in analysis graph
- Validation warnings appear for isolated junctions

---

## Testing Checklist

### Unit Tests
- [ ] findConnectedTerminals works correctly
- [ ] groupTerminalsIntoElectricalNodes groups terminals
- [ ] areTerminalsConnected checks connectivity
- [ ] Graph transformation collapses junctions
- [ ] Validation detects isolated junctions

### Integration Tests
- [ ] Circuit with junctions can be analyzed
- [ ] Analysis results are correct
- [ ] Junctions don't appear in analysis graph
- [ ] Electrical nodes represent connected terminals
- [ ] Validation warnings for isolated junctions

### Visual Tests
- [ ] Analysis pane shows correct results
- [ ] Graph visualization doesn't show junctions
- [ ] Component connections are correct

## Acceptance Criteria

- ✅ Connection traversal algorithm implemented
- ✅ Junctions collapsed in graph transformation
- ✅ Electrical nodes represent connected terminals
- ✅ Validation handles junctions correctly
- ✅ Analysis works with complex junction networks
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No console errors

## Next Phase

Proceed to **Phase 6: Polish & Testing** for final refinements and comprehensive testing.
