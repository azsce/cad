# ValidationContext

The ValidationContext provides circuit validation and graph transformation functionality for the circuit analysis application.

## Overview

This context layer:

- Accepts a `Circuit` from the Zustand store as input
- Automatically re-runs validation when the active circuit changes
- Transforms the circuit to an `AnalysisGraph` using `createAnalysisGraph()`
- Validates the graph using `validateGraph()`
- Provides validation state to child components

## Usage

### Basic Setup

```tsx
import { ValidationProvider, useValidation } from "@/contexts/ValidationContext";
import { useCircuitStore } from "@/store/circuitStore";

function AnalysisPaneWrapper() {
  const activeCircuit = useCircuitStore(state => state.getActiveCircuit());

  return (
    <ValidationProvider circuit={activeCircuit}>
      <AnalysisPane />
    </ValidationProvider>
  );
}
```

### Consuming Validation State

```tsx
import { useValidation } from "@/contexts/ValidationContext";

function AnalysisPane() {
  const { analysisGraph, validation, isValidating, error } = useValidation();

  if (isValidating) {
    return <LoadingSpinner message="Validating circuit..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (!validation.isValid) {
    return <ValidationErrors errors={validation.errors} warnings={validation.warnings} />;
  }

  // Circuit is valid, proceed with analysis
  return <AnalysisView graph={analysisGraph} />;
}
```

## API

### ValidationProvider Props

```typescript
interface ValidationProviderProps {
  /** The circuit to validate (from Zustand store) */
  readonly circuit: Circuit | null;
  /** Child components */
  readonly children: React.ReactNode;
}
```

### ValidationContextState

```typescript
interface ValidationContextState {
  /** The transformed analysis graph, or null if no circuit or transformation failed */
  analysisGraph: AnalysisGraph | null;
  /** Validation result with errors and warnings */
  validation: ValidationResult;
  /** Whether validation is currently in progress */
  isValidating: boolean;
  /** Error message if transformation or validation failed */
  error: string | null;
}
```

### ValidationResult

```typescript
interface ValidationResult {
  /** Whether the circuit structure is valid */
  isValid: boolean;
  /** Whether the circuit can be mathematically solved */
  isSolvable: boolean;
  /** List of error messages (blocking issues) */
  errors: string[];
  /** List of warning messages (non-blocking issues) */
  warnings: string[];
}
```

## Validation Checks

The context performs the following validation checks:

1. **Graph Connectivity**: Ensures all components are connected (no isolated nodes)
2. **Source Presence**: Verifies at least one voltage or current source exists
3. **Voltage-Source-Only Loops**: Detects loops containing only voltage sources (KVL contradiction)
4. **Current-Source-Only Cut-Sets**: Detects cut-sets containing only current sources (KCL contradiction)

## Error Handling

The context handles errors gracefully:

- Wraps validation in try-catch to prevent crashes
- Sets error state on failure
- Logs errors using the logger utility
- Provides detailed error messages to the UI

## Performance

- Validation runs automatically when the circuit changes
- Validation is synchronous and fast (typically < 10ms for small circuits)
- Uses React's `useMemo` to prevent unnecessary re-renders
- Only re-validates when the circuit reference changes

## Next Steps

After validation, the `AnalysisGraph` can be passed to:

- **CalculationContext**: For performing nodal or loop analysis
- **GraphVisualization**: For displaying the circuit topology
- **TreeSelector**: For choosing different spanning trees
