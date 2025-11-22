---
inclusion: always
---

# React Patterns and Best Practices

## React Flow Integration Pattern

### Independent State Management

When integrating React Flow with state management (Zustand, Redux, etc.), maintain React Flow's state independently to avoid render loops:

**Strategy:**
1. Create a context that holds nodes/edges in local state
2. Initialize from store ONLY on mount
3. Provide functions that update BOTH local state AND store
4. Batch position updates - only sync to store when dragging stops

**Benefits:**
- No infinite loops from store updates triggering React Flow updates
- Better performance - position updates don't hit the store on every frame
- Clear separation of concerns - React Flow manages UI state, store manages data model

## Avoiding Infinite Render Loops

### Problem: Callback Dependencies Causing Re-render Cycles

When using `useCallback` or `useMemo` with dependencies that are themselves derived from state (like memoized values or store selectors), you can create infinite render loops.

**Why it fails:**
1. Store updates → `storeNodes` changes
2. `nodes` memo recomputes → new reference
3. `onNodesChange` recreates (because `nodes` is in deps)
4. React Flow detects handler change → triggers internal updates
5. More re-renders → cycle continues

### Solution: Access Latest State Directly

Instead of including memoized values in callback dependencies, access the latest state directly inside the callback using `getState()`.

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

## Zustand Store Integration

### Direct State Access

Zustand provides `getState()` for accessing current state outside of React render cycle.

### Selective Subscriptions

Use selector functions to subscribe only to needed state: `const count = useStore(state => state.count)`

### Stable Action Functions

Store actions are already stable and don't need to be in dependency arrays, but include them for clarity.
