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

**CodeScene Full Health Threshold**: 
- **STRICT LIMIT: CC ≤ 7** (CodeScene ideal for full health)
- Warning threshold: CC > 5
- Critical threshold: CC > 7

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

**CodeScene Full Health Threshold**:
- **STRICT LIMIT: ≤ 40 lines per function** (CodeScene ideal for full health)
- Warning threshold: > 30 lines
- Critical threshold: > 40 lines
- Components/hooks: ≤ 60 lines (due to React boilerplate)

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

**CodeScene Full Health Threshold**:
- **STRICT LIMIT: 0 bumpy roads** (no nested conditionals with 2+ levels)
- **Maximum nesting depth: 2 levels** (including function body)
- Each "bump" (nested conditional block) increases cognitive load exponentially

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

## Refactoring Strategy for Full Health

When CodeScene flags a file, follow this systematic approach:

### Step 1: Measure Current State
- Check cyclomatic complexity (target: CC ≤ 7)
- Count lines per function (target: ≤ 40 lines)
- Identify bumpy roads (target: 0)
- Find code duplication (target: 0%)
- Count function parameters (target: ≤ 4)

### Step 2: Apply Refactoring Patterns (Priority Order)

1. **Eliminate bumpy roads FIRST** (highest impact on health)
   - Extract nested conditionals into helper functions
   - Use early returns and guard clauses
   - Flatten conditional logic

2. **Reduce cyclomatic complexity** (second priority)
   - Extract validation logic
   - Replace switch with lookup tables
   - Decompose complex conditions into named functions
   - Split functions at logical boundaries

3. **Reduce function length** (third priority)
   - Extract helper functions (pure functions first)
   - Extract custom hooks (for stateful logic)
   - Move related functions to separate files
   - Create modular directory structure

4. **Eliminate code duplication** (fourth priority)
   - Identify repeated patterns
   - Create generic helper functions
   - Use higher-order functions
   - Extract common logic into utilities

5. **Fix primitive obsession** (fifth priority)
   - Create branded types for IDs
   - Use parameter objects for related params
   - Define domain-specific types

### Step 3: Verify Improvements
- Re-run CodeScene diagnostics
- Ensure all metrics meet full health thresholds
- Verify no new issues introduced
- Check TypeScript compilation
- Run linting

### Step 4: Document Changes
- Add JSDoc comments with emojis
- Document extracted functions
- Update type definitions
- Add usage examples if needed

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

**Pattern 4: Early Returns (Guard Clauses)**
Use early returns to reduce nesting and improve readability:

```typescript
// ❌ Bad - Nested conditionals (CC = 5, nesting = 3)
function processNode(node: Node | undefined) {
  if (node) {
    if (node.isValid) {
      if (node.data) {
        return calculateValue(node.data);
      }
    }
  }
  return null;
}

// ✅ Good - Early returns (CC = 4, nesting = 1)
function processNode(node: Node | undefined) {
  if (!node) return null;
  if (!node.isValid) return null;
  if (!node.data) return null;
  
  return calculateValue(node.data);
}
```

**Pattern 5: Extract Validation Logic**
Move validation checks into separate functions:

```typescript
// ❌ Bad - Inline validation (CC = 8)
function updateCircuit(circuit: Circuit, updates: Updates) {
  if (!circuit) return null;
  if (!circuit.id) return null;
  if (!updates) return null;
  if (Object.keys(updates).length === 0) return null;
  if (circuit.isLocked) return null;
  
  // ... update logic
}

// ✅ Good - Extracted validation (CC = 2 + 5 = 7 total, but split)
function validateCircuitUpdate(circuit: Circuit | undefined, updates: Updates): boolean {
  if (!circuit) return false;
  if (!circuit.id) return false;
  if (!updates) return false;
  if (Object.keys(updates).length === 0) return false;
  if (circuit.isLocked) return false;
  return true;
}

function updateCircuit(circuit: Circuit, updates: Updates) {
  if (!validateCircuitUpdate(circuit, updates)) return null;
  
  // ... update logic (simple and focused)
}
```

**Pattern 6: Replace Switch with Lookup Tables**
Use object/map lookups instead of switch statements:

```typescript
// ❌ Bad - Switch statement (CC = 6)
function getNodeColor(type: NodeType): string {
  switch (type) {
    case 'resistor': return '#ff0000';
    case 'capacitor': return '#00ff00';
    case 'inductor': return '#0000ff';
    case 'voltage': return '#ffff00';
    case 'current': return '#ff00ff';
    default: return '#000000';
  }
}

// ✅ Good - Lookup table (CC = 1)
const NODE_COLORS: Record<NodeType, string> = {
  resistor: '#ff0000',
  capacitor: '#00ff00',
  inductor: '#0000ff',
  voltage: '#ffff00',
  current: '#ff00ff',
} as const;

function getNodeColor(type: NodeType): string {
  return NODE_COLORS[type] ?? '#000000';
}
```

**Pattern 7: Decompose Complex Conditions**
Extract complex boolean expressions into named functions:

```typescript
// ❌ Bad - Complex inline condition
if (node.type === 'resistor' && node.value > 0 && !node.isDisabled && circuit.isActive) {
  // ... logic
}

// ✅ Good - Named condition function
function isActiveResistor(node: Node, circuit: Circuit): boolean {
  return node.type === 'resistor' 
    && node.value > 0 
    && !node.isDisabled 
    && circuit.isActive;
}

if (isActiveResistor(node, circuit)) {
  // ... logic
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

### Example 1: connectionStore.ts Refactoring (Full Health Achieved)

**Before**: 
- CC=16 in `updateCursorPosition` (target: ≤7)
- CC=11 in `cleanWaypoints` (target: ≤7)
- Multiple bumpy roads
- 180+ lines

**Refactoring Steps**:
1. Extracted `determineDirection()` - Calculates movement direction (CC=2)
2. Extracted `isPerpendicularMovement()` - Checks perpendicular movement (CC=1)
3. Extracted `createTurnWaypoint()` - Creates turn waypoints (CC=1)
4. Extracted `shouldSkipWaypoint()` - Determines if waypoint should be skipped (CC=3)
5. Extracted `handleDuplicatePosition()` - Handles duplicate positions (CC=2)

**After**: 
- `updateCursorPosition`: CC=7 ✅
- `cleanWaypoints`: CC=5 ✅
- 0 bumpy roads ✅
- All functions ≤ 35 lines ✅

**Result**: Full health achieved - all metrics green

### Example 2: useApplyNodeChanges Hook Refactoring (Full Health Achieved)

**Before**: 
- 128 lines (target: ≤60 for hooks)
- CC=29 (target: ≤7)
- 4 bumpy roads
- Monolithic structure

**Refactoring Steps**:
1. Created modular directory structure
2. Extracted `calculateHelperLines.ts` - Pure alignment calculation (CC=6, 45 lines)
3. Extracted `handlePositionChange.ts` - Position change logic (CC=5, 38 lines)
4. Extracted `handleRemovalChange.ts` - Removal logic (CC=3, 25 lines)
5. Main hook became composition layer (CC=4, 52 lines)

**After**:
- All files ≤ 52 lines ✅
- All functions CC ≤ 6 ✅
- 0 bumpy roads ✅
- Highly testable ✅

**Result**: Full health achieved - all metrics green

### Example 3: Validation Function Refactoring (Full Health Achieved)

**Before**:
```typescript
// CC=12, 65 lines, 2 bumpy roads
function validateCircuit(circuit: Circuit): ValidationResult {
  const errors: string[] = [];
  
  if (!circuit.nodes || circuit.nodes.length === 0) {
    errors.push('Circuit must have at least one node');
  } else {
    for (const node of circuit.nodes) {
      if (!node.id) {
        errors.push('Node missing ID');
      }
      if (node.type === 'resistor') {
        if (!node.value || node.value <= 0) {
          errors.push(`Invalid resistor value: ${node.id}`);
        }
      }
      if (node.type === 'voltage') {
        if (!node.value) {
          errors.push(`Invalid voltage value: ${node.id}`);
        }
      }
    }
  }
  
  if (!circuit.edges || circuit.edges.length === 0) {
    errors.push('Circuit must have at least one connection');
  } else {
    for (const edge of circuit.edges) {
      if (!edge.source || !edge.target) {
        errors.push('Edge missing source or target');
      }
    }
  }
  
  return { isValid: errors.length === 0, errors };
}
```

**After** (Full Health):
```typescript
// Extracted validators (each CC ≤ 3, ≤ 15 lines)

function validateNodeId(node: Node): string | undefined {
  if (!node.id) return 'Node missing ID';
  return undefined;
}

function validateResistorValue(node: Node): string | undefined {
  if (node.type !== 'resistor') return undefined;
  if (!node.value || node.value <= 0) {
    return `Invalid resistor value: ${node.id}`;
  }
  return undefined;
}

function validateVoltageValue(node: Node): string | undefined {
  if (node.type !== 'voltage') return undefined;
  if (!node.value) return `Invalid voltage value: ${node.id}`;
  return undefined;
}

function validateNode(node: Node): string[] {
  return [
    validateNodeId(node),
    validateResistorValue(node),
    validateVoltageValue(node),
  ].filter((error): error is string => error !== undefined);
}

function validateNodes(nodes: Node[]): string[] {
  if (nodes.length === 0) {
    return ['Circuit must have at least one node'];
  }
  return nodes.flatMap(validateNode);
}

function validateEdge(edge: Edge): string | undefined {
  if (!edge.source || !edge.target) {
    return 'Edge missing source or target';
  }
  return undefined;
}

function validateEdges(edges: Edge[]): string[] {
  if (edges.length === 0) {
    return ['Circuit must have at least one connection'];
  }
  return edges
    .map(validateEdge)
    .filter((error): error is string => error !== undefined);
}

// Main function (CC=3, 12 lines)
function validateCircuit(circuit: Circuit): ValidationResult {
  const errors = [
    ...validateNodes(circuit.nodes ?? []),
    ...validateEdges(circuit.edges ?? []),
  ];
  
  return { isValid: errors.length === 0, errors };
}
```

**Metrics**:
- Main function: CC=3 (was 12) ✅
- Main function: 12 lines (was 65) ✅
- Bumpy roads: 0 (was 2) ✅
- All helper functions: CC ≤ 3 ✅
- All helper functions: ≤ 15 lines ✅

**Result**: Full health achieved - all metrics green

## Documentation Standards

### Emojis in Comments

**Guideline**: Use emojis in JSDoc comments to enhance readability and provide visual cues about function purpose.

**Benefits**:
- Improved code scanning and navigation
- Visual categorization of functions
- Enhanced developer experience
- Easier to identify function types at a glance

**Usage Pattern**:

```typescript
/**
 * ✅ Main validation function - use checkmark for validation/verification
 * 
 * Performs the following checks:
 * 1. 🔗 Graph connectivity - use link for connectivity
 * 2. 🔋 Power sources - use battery for electrical sources
 * 3. ⚠️ Error detection - use warning for error/contradiction detection
 */
export function validateGraph(graph: AnalysisGraph): ValidationResult {
  // Implementation
}

/**
 * 🔍 Search/traversal function - use magnifying glass for search operations
 */
function performBFS(startNodeId: string): Set<string> {
  // Implementation
}

/**
 * 🗺️ Data structure builder - use map for building graphs/structures
 */
function buildAdjacencyList(graph: AnalysisGraph): Map<string, string[]> {
  // Implementation
}

/**
 * 🌳 Tree operations - use tree emoji for spanning tree operations
 */
function getSelectedTree(graph: AnalysisGraph): SpanningTree | undefined {
  // Implementation
}
```

**Recommended Emoji Categories**:

| Category | Emoji | Usage |
|----------|-------|-------|
| Validation | ✅ | Validation, verification, checking functions |
| Connectivity | 🔗 | Graph connectivity, linking operations |
| Power/Electrical | 🔋 ⚡ | Electrical sources, circuit operations |
| Warnings/Errors | ⚠️ | Error detection, contradiction checking |
| Search | 🔍 | BFS, DFS, search algorithms |
| Data Structures | 🗺️ | Building graphs, maps, adjacency lists |
| Trees | 🌳 🌿 | Spanning trees, tree operations, twigs |
| Loops | 🔄 | Loop detection, circular operations |
| Cut-sets | ✂️ | Cut-set operations, partitioning |
| Paths | 🛤️ | Path finding, routing |
| Components | 🧩 | Component detection, grouping |
| Isolated | 🏝️ | Isolated nodes, disconnected parts |
| Generic/Core | 🚀 | Generic algorithms, core utilities |
| Building | 🏗️ | Initialization, construction |
| Bidirectional | ↔️ | Bidirectional operations |

**Rules**:
- Use one emoji per function comment (at the start of the first line)
- Choose emojis that clearly represent the function's purpose
- Be consistent across similar functions
- Don't overuse - only for function-level JSDoc comments
- Inline comments should remain emoji-free for clarity

## CodeScene Full Health Metrics (STRICT)

To achieve and maintain CodeScene full health status, ALL code must meet these strict thresholds:

### Critical Metrics (Zero Tolerance)
- **Cyclomatic Complexity: CC ≤ 7** (warning at CC > 5)
- **Function Length: ≤ 40 lines** (warning at > 30 lines)
- **Bumpy Roads: 0** (no nested conditionals 2+ levels deep)
- **Code Duplication: 0%** (no repeated code blocks)
- **Nesting Depth: ≤ 2 levels** (including function body)

### Additional Quality Metrics
- **Function Parameters: ≤ 4** (use parameter objects for more)
- **File Length: ≤ 300 lines** (split into modules if larger)
- **Primitive Obsession: 0** (use branded types for domain concepts)
- **String-Heavy Arguments: 0** (use parameter objects)

### Refactoring Triggers

**Immediate refactoring required when:**
- Any function exceeds CC of 7
- Any function exceeds 40 lines
- Any bumpy road detected (nested conditionals)
- Code duplication detected
- More than 4 function parameters

**Refactoring approach:**
1. Extract helper functions (pure functions first)
2. Extract custom hooks (for stateful logic)
3. Use parameter objects (for multiple related params)
4. Create modular directory structure (for complex features)
5. Apply early returns (to reduce nesting)
6. Use guard clauses (to flatten conditionals)

## Quick Reference: Full Health Checklist

### Before Committing Code
- [ ] All functions ≤ 40 lines (warning at > 30)
- [ ] All functions CC ≤ 7 (warning at CC > 5)
- [ ] Zero bumpy roads (no nested conditionals 2+ levels)
- [ ] Zero code duplication
- [ ] Maximum 4 function parameters
- [ ] All files ≤ 300 lines
- [ ] Nesting depth ≤ 2 levels
- [ ] No nested ternary operators
- [ ] Branded types for all IDs
- [ ] Parameter objects for related params
- [ ] JSDoc comments with emojis
- [ ] Early returns and guard clauses used
- [ ] Complex conditions extracted to named functions
- [ ] Switch statements replaced with lookup tables (where appropriate)

### Refactoring Priority (When Issues Found)
1. **Eliminate bumpy roads** (highest impact)
2. **Reduce cyclomatic complexity** (CC > 7)
3. **Reduce function length** (> 40 lines)
4. **Eliminate code duplication**
5. **Fix primitive obsession**

### Common Techniques for Full Health
- **Early returns** - Reduce nesting depth
- **Guard clauses** - Flatten conditional logic
- **Extract validation** - Separate validation from business logic
- **Lookup tables** - Replace switch statements
- **Named conditions** - Extract complex boolean expressions
- **Helper functions** - Break down large functions
- **Parameter objects** - Group related parameters
- **Branded types** - Eliminate primitive obsession
- **Modular structure** - Split large files into directories

### Red Flags (Immediate Refactoring Required)
- ⛔ Function > 40 lines
- ⛔ CC > 7
- ⛔ Nested conditionals (bumpy road)
- ⛔ Code duplication detected
- ⛔ More than 4 function parameters
- ⛔ Nested ternary operators
- ⛔ Nesting depth > 2 levels
- ⛔ File > 300 lines

## Summary

- **Use branded types** for IDs and domain concepts (eliminate primitive obsession)
- **Use parameter objects** to reduce string parameters (max 4 params)
- **Extract helpers** to eliminate code duplication (0% duplication)
- **Keep functions tiny** (≤ 40 lines, warning at > 30)
- **Keep complexity minimal** (CC ≤ 7, warning at CC > 5)
- **Eliminate ALL bumpy roads** (0 nested conditionals, max 2 nesting levels)
- **Use modular structure** for complex features (files ≤ 300 lines)
- **Compose functionality** from focused, single-responsibility pieces
- **Never use nested ternaries** - extract into if/else or functions
- **Consolidate duplicate patterns** into generic helpers
- **Use emojis in JSDoc comments** to enhance readability and navigation
- **Apply early returns** to reduce nesting depth
- **Use guard clauses** to flatten conditional logic
- **Extract validation logic** into separate functions
- **Replace switch with lookup tables** where appropriate
- **Decompose complex conditions** into named functions
