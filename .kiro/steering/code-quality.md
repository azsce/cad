---
inclusion: always
---

# Code Quality Standards

## CodeScene Best Practices

This project uses CodeScene for code quality analysis. Follow these guidelines to avoid common issues:

### Primitive Obsession

**Problem**: Using primitive types (strings, numbers) instead of creating proper types or value objects.

**Solution**: Use branded types for IDs and important domain concepts.

```typescript
type UserId = string & { readonly __brand: "UserId" };
function createUserId(id: string): UserId { return id as UserId; }
```

**Benefits**: Type safety at compile time, self-documenting code, prevents accidental ID mixing, no runtime overhead.

### String Heavy Function Arguments

**Problem**: Functions with many string parameters are error-prone and hard to maintain.

**Solution**: Group related parameters into parameter objects (max 4 parameters).

**Benefits**: Clearer intent, easier to extend, better IDE support, reduced parameter count.

### Code Duplication

**Problem**: Repeated code patterns across multiple functions.

**Solution**: Extract common patterns into helper functions (0% duplication target).

### Complex Method (High Cyclomatic Complexity)

**Problem**: Functions with too many branches (if/else, switch, loops) are hard to understand and test.

**CodeScene Full Health Threshold**:
- **STRICT LIMIT: CC ≤ 7** (warning at CC > 5)

**Solution**: Extract logic into smaller, focused functions or hooks.

### Large Method (Too Many Lines)

**Problem**: Functions with too many lines are hard to understand and maintain.

**CodeScene Full Health Threshold**:
- **STRICT LIMIT: ≤ 40 lines per function** (warning at > 30 lines)
- Components/hooks: ≤ 60 lines (due to React boilerplate)

**Solution**: Extract related logic into separate functions or hooks.

### Bumpy Road Ahead (Nested Conditionals)

**Problem**: Functions with multiple chunks of nested conditional logic (2+ levels deep) are hard to understand and maintain.

**CodeScene Full Health Threshold**:
- **STRICT LIMIT: 0 bumpy roads** (no nested conditionals with 2+ levels)
- **Maximum nesting depth: 2 levels** (including function body)

**Solution**: Extract nested logic into separate, well-named functions.

**Benefits**: Reduced cognitive complexity, single clear purpose per function, easier to test, better code reusability.

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
- Run CodeScene analysis (`bun codescene`) for final verification

### Step 4: Document Changes

- Add JSDoc comments with emojis
- Document extracted functions
- Update type definitions

### Specific Refactoring Patterns

**Pattern 1: Early Returns (Guard Clauses)**
Use early returns to reduce nesting and improve readability.

**Pattern 2: Replace Nested Ternaries**
Never use nested ternary operators - extract into functions.

**Pattern 3: Consolidate Duplicate Logic**
When multiple functions have similar patterns, create a generic helper.

**Pattern 4: Extract Validation Logic**
Move validation checks into separate functions.

**Pattern 5: Replace Switch with Lookup Tables**
Use object/map lookups instead of switch statements.

**Pattern 6: Decompose Complex Conditions**
Extract complex boolean expressions into named functions.

## File Organization

For complex features, use a directory structure:

### Context with Multiple Concerns
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

**Benefits**: Single clear purpose per file, easy to locate functionality, testable in isolation, reusable across codebase, reduced cyclomatic complexity per file, better code organization.

## Documentation Standards

### Emojis in Comments

**Guideline**: Use emojis in JSDoc comments to enhance readability and provide visual cues about function purpose.

**Benefits**: Improved code scanning and navigation, visual categorization of functions, enhanced developer experience, easier to identify function types at a glance.

**Recommended Emoji Categories**:

| Category         | Emoji | Usage                                        |
| ---------------- | ----- | -------------------------------------------- |
| Validation       | ✅    | Validation, verification, checking functions |
| Connectivity     | 🔗    | Graph connectivity, linking operations       |
| Power/Electrical | 🔋 ⚡ | Electrical sources, circuit operations       |
| Warnings/Errors  | ⚠️    | Error detection, contradiction checking      |
| Search           | 🔍    | BFS, DFS, search algorithms                  |
| Data Structures  | 🗺️    | Building graphs, maps, adjacency lists       |
| Trees            | 🌳 🌿 | Spanning trees, tree operations, twigs       |
| Loops            | 🔄    | Loop detection, circular operations          |
| Cut-sets         | ✂️    | Cut-set operations, partitioning             |
| Paths            | 🛤️    | Path finding, routing                        |
| Components       | 🧩    | Component detection, grouping                |
| Isolated         | 🏝️    | Isolated nodes, disconnected parts           |
| Generic/Core     | 🚀    | Generic algorithms, core utilities           |
| Building         | 🏗️    | Initialization, construction                 |
| Bidirectional    | ↔️    | Bidirectional operations                     |

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
