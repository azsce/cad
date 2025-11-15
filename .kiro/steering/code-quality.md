# Code Quality Standards

## CodeScene Best Practices

This project uses CodeScene for code quality analysis. Follow these guidelines to avoid common issues:

### Primitive Obsession

**Problem**: Using primitive types (strings, numbers) instead of creating proper types or value objects.

**Solution**: Use branded types for IDs and important domain concepts.

```typescript
// ❌ Bad - Primitive obsession
function updateUser(userId: string, name: string) { }
function updatePost(postId: string, title: string) { }
// Easy to mix up userId and postId

// ✅ Good - Branded types
type UserId = string & { readonly __brand: 'UserId' };
type PostId = string & { readonly __brand: 'PostId' };

function createUserId(id: string): UserId {
  return id as UserId;
}

function updateUser(userId: UserId, name: string) { }
function updatePost(postId: PostId, title: string) { }
// Compiler prevents mixing up IDs
```

**Benefits**:
- Type safety at compile time
- Self-documenting code
- Prevents accidental ID mixing
- No runtime overhead

### String Heavy Function Arguments

**Problem**: Functions with many string parameters are error-prone and hard to maintain.

**Solution**: Group related parameters into parameter objects.

```typescript
// ❌ Bad - Too many string parameters
function updateNode(
  circuitId: string,
  nodeId: string,
  updates: Partial<Node>
) { }

// ✅ Good - Parameter object
interface NodeOperationParams {
  circuitId: CircuitId;
  nodeId: NodeId;
}

function updateNode(
  params: NodeOperationParams,
  updates: Partial<Node>
) { }
```

**Benefits**:
- Clearer intent
- Easier to extend
- Better IDE support
- Reduced parameter count

### Code Duplication

**Problem**: Repeated code patterns across multiple functions.

**Solution**: Extract common patterns into helper functions.

```typescript
// ❌ Bad - Duplicated update pattern
function updateCircuitName(id: string, name: string) {
  set((state) => ({
    circuits: {
      ...state.circuits,
      [id]: {
        ...state.circuits[id],
        name,
        modifiedAt: Date.now(),
      },
    },
  }));
}

function updateCircuitNodes(id: string, nodes: Node[]) {
  set((state) => ({
    circuits: {
      ...state.circuits,
      [id]: {
        ...state.circuits[id],
        nodes,
        modifiedAt: Date.now(),
      },
    },
  }));
}

// ✅ Good - Extracted helper
function updateCircuit(
  state: State,
  circuitId: CircuitId,
  updates: Partial<Circuit>
): State {
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

function updateCircuitName(id: CircuitId, name: string) {
  set((state) => updateCircuit(state, id, { name }));
}

function updateCircuitNodes(id: CircuitId, nodes: Node[]) {
  set((state) => updateCircuit(state, id, { nodes }));
}
```

### Complex Method (High Cyclomatic Complexity)

**Problem**: Functions with too many branches (if/else, switch, loops) are hard to understand and test.

**Threshold**: Keep cyclomatic complexity below 15 (ideally below 10).

**Solution**: Extract logic into smaller, focused functions or hooks.

```typescript
// ❌ Bad - Complex component (CC = 24)
export function CircuitFlowProvider({ circuitId, children }) {
  // 200+ lines of logic
  // Multiple useCallback hooks
  // Many conditional branches
  // Hard to test and maintain
}

// ✅ Good - Extracted into focused hooks
export function CircuitFlowProvider({ circuitId, children }) {
  const { nodes, edges, setNodes, setEdges } = useCircuitSync(circuitId);
  const { addNode, deleteNodes, updateNodeData } = useNodeOperations({ circuitId, setNodes });
  const { addEdge, deleteEdges, updateEdge } = useEdgeOperations({ circuitId, setEdges });
  const { onPaneClick, onPaneMouseMove, startConnection, onConnect } = useConnectionHandlers({
    screenToFlowPosition,
    addEdge,
  });
  
  // Component is now a composition layer
  // Each hook has single responsibility
  // Easy to test and maintain
}
```

### Large Method (Too Many Lines)

**Problem**: Functions with too many lines are hard to understand and maintain.

**Threshold**: Keep functions under 100 lines (ideally under 50).

**Solution**: Extract related logic into separate functions or hooks.

```typescript
// ❌ Bad - 262 lines in one component
export function CircuitFlowProvider() {
  // State declarations
  // Effect hooks
  // Event handlers
  // CRUD operations
  // Helper functions
  // Context value
  // Return JSX
}

// ✅ Good - Modular structure
// helpers.ts - Pure functions
export function convertNodesToFlow(nodes: CircuitNode[]): Node[] { }

// useCircuitSync.ts - State management
export function useCircuitSync(circuitId: CircuitId) { }

// useNodeOperations.ts - Node CRUD
export function useNodeOperations({ circuitId, setNodes }) { }

// CircuitFlowProvider.tsx - Composition (95 lines)
export function CircuitFlowProvider({ circuitId, children }) {
  // Compose functionality from hooks
  // Clean and readable
}
```

### Bumpy Road Ahead (Nested Conditionals)

**Problem**: Functions with multiple chunks of nested conditional logic (2+ levels deep) are hard to understand and maintain.

**Threshold**: Minimize nested conditionals - each "bump" increases cognitive load.

**Solution**: Extract nested logic into separate, well-named functions.

```typescript
// ❌ Bad - Bumpy road with nested conditionals
function checkNodeAlignment(nodeABounds, nodeB, currentResult) {
  const nodeBBounds = calculateNodeBounds(nodeB);
  const result = { ...currentResult };
  
  // First bump - nested conditional
  if (result.vertical === undefined) {
    const verticalLine = checkVerticalAlignment(nodeABounds, nodeBBounds);
    if (verticalLine !== undefined) {
      result.vertical = verticalLine;
    }
  }
  
  // Second bump - nested conditional
  if (result.horizontal === undefined) {
    const horizontalLine = checkHorizontalAlignment(nodeABounds, nodeBBounds);
    if (horizontalLine !== undefined) {
      result.horizontal = horizontalLine;
    }
  }
  
  return result;
}

// ✅ Good - Extracted helper eliminates nesting
function updateAlignment(
  currentValue: number | undefined,
  checkFn: (a: NodeBounds, b: NodeBounds) => number | undefined,
  nodeABounds: NodeBounds,
  nodeBBounds: NodeBounds
): number | undefined {
  if (currentValue !== undefined) {
    return currentValue;
  }
  return checkFn(nodeABounds, nodeBBounds);
}

function checkNodeAlignment(nodeABounds, nodeB, currentResult) {
  const nodeBBounds = calculateNodeBounds(nodeB);
  
  const vertical = updateAlignment(
    currentResult.vertical,
    checkVerticalAlignment,
    nodeABounds,
    nodeBBounds
  );
  
  const horizontal = updateAlignment(
    currentResult.horizontal,
    checkHorizontalAlignment,
    nodeABounds,
    nodeBBounds
  );
  
  // Build result object with only defined values
  const result: HelperLines = {};
  if (vertical !== undefined) result.vertical = vertical;
  if (horizontal !== undefined) result.horizontal = horizontal;
  
  return result;
}
```

**Benefits**:
- Reduced cognitive complexity
- Each function has a single, clear purpose
- Easier to test individual pieces
- Better code reusability

## Refactoring Strategy

When CodeScene flags a file:

1. **Identify the concerns**: What different responsibilities does the code have?
2. **Extract helpers**: Move pure functions to separate files
3. **Extract hooks**: Move stateful logic to custom hooks
4. **Extract components**: Split large components into smaller ones
5. **Use composition**: Combine extracted pieces in a clean way
6. **Eliminate bumpy roads**: Extract nested conditionals into focused helper functions
7. **Reduce complexity**: Break down functions with high cyclomatic complexity (CC > 10)

### Specific Refactoring Patterns

**Pattern 1: Extract Conditional Logic**
When you have nested if statements, extract the inner logic into a helper function:

```typescript
// Before: Nested conditionals (bumpy road)
if (condition1) {
  const value = computeValue();
  if (value !== undefined) {
    result.field = value;
  }
}

// After: Extracted helper
function updateField(currentValue, computeFn) {
  if (currentValue !== undefined) return currentValue;
  return computeFn();
}

const field = updateField(result.field, computeValue);
if (field !== undefined) result.field = field;
```

**Pattern 2: Replace Nested Ternaries**
Never use nested ternary operators - extract into functions:

```typescript
// ❌ Bad - Nested ternary
const value = a ? b : c ? d : e;

// ✅ Good - Extracted function
function getValue() {
  if (a) return b;
  if (c) return d;
  return e;
}
const value = getValue();
```

**Pattern 3: Consolidate Duplicate Logic**
When multiple functions have similar patterns, create a generic helper:

```typescript
// Before: Duplicate patterns
function updateVertical(current, nodeA, nodeB) {
  if (current !== undefined) return current;
  return checkVerticalAlignment(nodeA, nodeB);
}

function updateHorizontal(current, nodeA, nodeB) {
  if (current !== undefined) return current;
  return checkHorizontalAlignment(nodeA, nodeB);
}

// After: Generic helper
function updateAlignment(current, checkFn, nodeA, nodeB) {
  if (current !== undefined) return current;
  return checkFn(nodeA, nodeB);
}
```

## File Organization

For complex features, use a directory structure:

### Example 1: Context with Multiple Concerns
```
src/contexts/CircuitFlowContext/
├── index.ts                      # Public exports
├── CircuitFlowProvider.tsx       # Main component (composition)
├── helpers.ts                    # Pure utility functions
├── useCircuitSync.ts            # State synchronization hook
├── useNodeOperations.ts         # Node CRUD hook
├── useEdgeOperations.ts         # Edge CRUD hook
├── useConnectionHandlers.ts     # Connection event handlers
└── useFlowChangeHandlers.ts     # React Flow change handlers
```

### Example 2: Hook with Complex Logic
```
src/hooks/useApplyNodeChanges/
├── index.ts                      # Public exports
├── useApplyNodeChanges.ts       # Main hook (composition)
├── calculateHelperLines.ts      # Alignment calculation logic
├── handlePositionChange.ts      # Position change handler
└── handleRemovalChange.ts       # Removal change handler
```

### Example 3: Store with Helper Functions
```
src/store/connectionStore.ts     # Main store with extracted helpers at top
```

**Benefits**:
- Each file has a single, clear purpose
- Easy to locate specific functionality
- Testable in isolation
- Reusable across the codebase
- Reduced cyclomatic complexity per file
- Better code organization and discoverability

## Testing Considerations

Extracted code is easier to test:

```typescript
// Pure functions - Easy to test
describe('convertNodesToFlow', () => {
  it('converts store nodes to flow format', () => {
    const storeNodes = [{ id: '1', type: 'resistor', ... }];
    const flowNodes = convertNodesToFlow(storeNodes);
    expect(flowNodes).toEqual([{ id: '1', type: 'resistor', ... }]);
  });
});

// Custom hooks - Test with renderHook
describe('useNodeOperations', () => {
  it('adds node to state and store', () => {
    const { result } = renderHook(() => useNodeOperations({ ... }));
    act(() => result.current.addNode(mockNode));
    expect(mockSetNodes).toHaveBeenCalled();
  });
});
```

## Real-World Examples

### Example: connectionStore.ts Refactoring

**Before**: CC=16 in `updateCursorPosition`, CC=11 in `cleanWaypoints`, multiple bumpy roads

**After**: Extracted helper functions reduced complexity:
- `determineDirection()` - Calculates movement direction
- `isPerpendicularMovement()` - Checks perpendicular movement
- `createTurnWaypoint()` - Creates turn waypoints
- `shouldSkipWaypoint()` - Determines if waypoint should be skipped
- `handleDuplicatePosition()` - Handles duplicate positions

**Result**: CC reduced to 7 and 5 respectively, all bumpy roads eliminated

### Example: useApplyNodeChanges Hook Refactoring

**Before**: 128 lines, CC=29, multiple bumpy roads

**After**: Split into modular directory:
- `calculateHelperLines.ts` - Pure alignment calculation (CC < 10)
- `handlePositionChange.ts` - Position change logic
- `handleRemovalChange.ts` - Removal logic
- `useApplyNodeChanges.ts` - Main composition hook

**Result**: All files under 100 lines, CC < 10, no bumpy roads, highly testable

## Summary

- **Use branded types** for IDs and domain concepts
- **Use parameter objects** to reduce string parameters
- **Extract helpers** to eliminate code duplication
- **Keep functions small** (< 100 lines, ideally < 50)
- **Keep complexity low** (CC < 15, ideally < 10)
- **Eliminate bumpy roads** by extracting nested conditionals
- **Use modular structure** for complex features
- **Compose functionality** from focused, single-responsibility pieces
- **Never use nested ternaries** - extract into if/else or functions
- **Consolidate duplicate patterns** into generic helpers
