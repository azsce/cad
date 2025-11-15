# React Patterns and Best Practices

## React Flow Integration Pattern

### Independent State Management

When integrating React Flow with a state management library (Zustand, Redux, etc.), maintain React Flow's state independently to avoid render loops:

**Strategy:**
1. Create a context that holds nodes/edges in local state
2. Initialize from store ONLY on mount
3. Provide functions that update BOTH local state AND store
4. Batch position updates - only sync to store when dragging stops

**Implementation:**
```typescript
// Context manages independent state
const [nodes, setNodes] = useState<Node[]>([]);

// Initialize from store only once
useEffect(() => {
  const circuit = store.getState().circuits[circuitId];
  setNodes(circuit.nodes.map(convertToFlowNode));
}, [circuitId]);

// Update function modifies both local state and store
const addNode = (node) => {
  setNodes(current => [...current, node]); // Local state
  store.addNode(circuitId, node);          // Store
};

// Batch position updates
const onNodesChange = (changes) => {
  const hasDragEnd = changes.some(c => c.type === 'position' && c.dragging === false);
  
  setNodes(current => applyNodeChanges(changes, current));
  
  if (hasDragEnd) {
    // Only sync positions to store when dragging stops
    flushPositionUpdates();
  }
};
```

**Benefits:**
- No infinite loops from store updates triggering React Flow updates
- Better performance - position updates don't hit the store on every frame
- Clear separation of concerns - React Flow manages UI state, store manages data model

## Avoiding Infinite Render Loops

### Problem: Callback Dependencies Causing Re-render Cycles

When using `useCallback` or `useMemo` with dependencies that are themselves derived from state (like memoized values or store selectors), you can create infinite render loops:

**Bad Pattern:**
```typescript
const nodes = useMemo(() => storeNodes.map(...), [storeNodes]);
const edges = useMemo(() => storeEdges.map(...), [storeEdges]);

const onNodesChange = useCallback((changes) => {
  const updated = applyChanges(changes, nodes); // Uses nodes
  syncToStore(updated);
}, [nodes, syncToStore]); // nodes in deps causes recreation on every store update
```

**Why it fails:**
1. Store updates → `storeNodes` changes
2. `nodes` memo recomputes → new reference
3. `onNodesChange` recreates (because `nodes` is in deps)
4. React Flow detects handler change → triggers internal updates
5. More re-renders → cycle continues

### Solution: Access Latest State Directly

Instead of including memoized values in callback dependencies, access the latest state directly inside the callback:

**Good Pattern:**
```typescript
const nodes = useMemo(() => storeNodes.map(...), [storeNodes]);
const edges = useMemo(() => storeEdges.map(...), [storeEdges]);

const onNodesChange = useCallback((changes) => {
  // Get fresh state directly from store
  const currentNodes = useStore.getState().nodes;
  const updated = applyChanges(changes, currentNodes);
  syncToStore(updated);
}, [syncToStore]); // Only stable functions in deps
```

### Key Principles

1. **Stable Dependencies Only**: Callbacks passed to third-party libraries (React Flow, etc.) should only depend on:
   - Stable identifiers (IDs, not full objects)
   - Store action functions (already stable)
   - Other stable callbacks

2. **Access Fresh State Inside**: When you need current state in a callback, read it directly from the store using `getState()` rather than closing over memoized values

3. **Separate Display from Logic**: 
   - Use memoized values for rendering (`nodes`, `edges`)
   - Use direct store access for event handlers (`onNodesChange`, `onEdgesChange`)

4. **Watch for These Patterns**:
   - Callbacks with memoized arrays/objects in dependencies
   - Callbacks with store-derived objects in dependencies
   - useEffect with frequently-changing dependencies that trigger state updates

### Example: React Flow Integration

```typescript
// ✅ Good: Memoized for rendering
const nodes = useMemo(() => 
  circuitNodes.map(node => ({ ...node })), 
  [circuitNodes]
);

// ✅ Good: Stable dependencies only
const onNodesChange = useCallback((changes) => {
  if (!activeCircuitId) return;
  
  // Get fresh state directly
  const currentNodes = useStore.getState().circuits[activeCircuitId]?.nodes ?? [];
  const flowNodes = currentNodes.map(n => ({ ...n }));
  const updated = applyNodeChanges(changes, flowNodes);
  
  syncNodesFromFlow(activeCircuitId, updated);
}, [activeCircuitId, syncNodesFromFlow]);

// ❌ Bad: nodes in dependencies
const onNodesChange = useCallback((changes) => {
  const updated = applyNodeChanges(changes, nodes);
  syncNodesFromFlow(activeCircuitId, updated);
}, [nodes, activeCircuitId, syncNodesFromFlow]); // nodes causes infinite loop
```

## Zustand Store Integration

### Direct State Access

Zustand provides `getState()` for accessing current state outside of React render cycle:

```typescript
// Inside a callback
const currentState = useMyStore.getState();
const value = currentState.someValue;
```

### Selective Subscriptions

Use selector functions to subscribe only to needed state:

```typescript
// ✅ Good: Only re-renders when count changes
const count = useStore(state => state.count);

// ❌ Bad: Re-renders on any store change
const store = useStore();
const count = store.count;
```

### Stable Action Functions

Store actions are already stable and don't need to be in dependency arrays, but include them for clarity:

```typescript
const addItem = useStore(state => state.addItem);

const handleAdd = useCallback(() => {
  addItem(newItem);
}, [addItem]); // addItem is stable, but include for clarity
```
