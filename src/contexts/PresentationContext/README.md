# PresentationContext

The PresentationContext is the third and final layer of the analysis pipeline. It formats calculation results into human-readable presentations with LaTeX equations and generates visualization data for interactive graph displays.

## Purpose

- **Automatic Presentation Generation**: Runs automatically when calculation results are available
- **Markdown Report**: Generates comprehensive step-by-step analysis reports with LaTeX formatting
- **Visualization Data**: Extracts loop/cut-set definitions and branch results for graph visualization
- **Interactive Controls**: Provides functions to control visualization mode and element highlighting

## Architecture

```
CalculationContext (result)
    ↓
PresentationProvider
    ├─ generateMarkdownReport() → Markdown output
    └─ generateVisualizationData() → Graph visualization data
    ↓
PresentationContext
    ├─ markdownOutput (string)
    ├─ visualizationData (GraphVisualizationData)
    ├─ setVisualizationMode()
    └─ setHighlightedElements()
```

## Files

- **`context.ts`**: Context definition and types
- **`PresentationContext.tsx`**: Main provider component
- **`usePresentation.ts`**: Hook for consuming context
- **`generateVisualizationData.ts`**: Helper for extracting visualization data
- **`index.ts`**: Public exports

## Usage

### Basic Setup

```tsx
import { PresentationProvider, usePresentation } from '@/contexts/PresentationContext';

function AnalysisPaneWrapper() {
  const { result } = useCalculation();
  const { analysisGraph } = useValidation();
  const activeCircuit = useCircuitStore(state => state.getActiveCircuit());

  return (
    <PresentationProvider
      result={result}
      analysisGraph={analysisGraph}
      circuitName={activeCircuit?.name ?? 'Untitled Circuit'}
    >
      <AnalysisPane />
    </PresentationProvider>
  );
}
```

### Consuming Context

```tsx
function ResultsDisplay() {
  const { markdownOutput, isGenerating } = usePresentation();

  if (isGenerating) {
    return <LoadingSpinner />;
  }

  return <ReactMarkdown>{markdownOutput}</ReactMarkdown>;
}
```

### Visualization Controls

```tsx
function AnalysisControls() {
  const { visualizationData, setVisualizationMode, setHighlightedElements } = usePresentation();

  const handleModeChange = (mode: VisualizationMode) => {
    setVisualizationMode(mode);
  };

  const handleLoopClick = (loopIndex: number) => {
    const loop = visualizationData.loopDefinitions?.[loopIndex];
    if (loop) {
      setHighlightedElements(loop.branchIds);
    }
  };

  return (
    <Tabs value={visualizationData.mode} onChange={(_, mode) => handleModeChange(mode)}>
      <Tab value="graph" label="Graph" />
      <Tab value="tree" label="Tree" />
      <Tab value="loops" label="Loops" />
      <Tab value="cutsets" label="Cut-Sets" />
      <Tab value="results" label="Results" />
    </Tabs>
  );
}
```

## Data Structures

### GraphVisualizationData

```typescript
interface GraphVisualizationData {
  mode: 'graph' | 'tree' | 'loops' | 'cutsets' | 'results';
  highlightedElements: string[];
  loopDefinitions?: LoopDefinition[];
  cutSetDefinitions?: CutSetDefinition[];
  branchResults?: Map<string, { current: number; voltage: number }>;
}
```

### LoopDefinition

```typescript
interface LoopDefinition {
  id: string;
  branchIds: string[];
  direction: Map<string, 'forward' | 'reverse'>;
  color: string;
  equation: string;
}
```

### CutSetDefinition

```typescript
interface CutSetDefinition {
  id: string;
  branchIds: string[];
  direction: Map<string, 'forward' | 'reverse'>;
  color: string;
  equation: string;
}
```

## Visualization Modes

1. **Graph Mode**: Basic circuit topology view
2. **Tree Mode**: Highlights spanning tree (twigs vs links)
3. **Loops Mode**: Shows fundamental loops with color coding
4. **Cut-Sets Mode**: Shows fundamental cut-sets with color coding
5. **Results Mode**: Displays branch voltages and currents on graph

## Color Palettes

### Loop Colors
- Loop 0: Red (#E74C3C)
- Loop 1: Purple (#9B59B6)
- Loop 2: Orange (#F39C12)
- Loop 3: Turquoise (#1ABC9C)
- Loop 4: Blue (#3498DB)
- Loop 5: Dark Orange (#E67E22)
- Loop 6: Green (#2ECC71)
- Loop 7: Yellow (#F1C40F)

### Cut-Set Colors
- Cut-Set 0: Blue (#3498DB)
- Cut-Set 1: Orange (#E67E22)
- Cut-Set 2: Green (#2ECC71)
- Cut-Set 3: Purple (#9B59B6)
- Cut-Set 4: Red (#E74C3C)
- Cut-Set 5: Turquoise (#1ABC9C)
- Cut-Set 6: Yellow-Orange (#F39C12)
- Cut-Set 7: Dark Gray (#34495E)

## Trigger Behavior

The PresentationContext automatically generates presentation when:
- A new calculation result is available
- The analysis graph changes
- The circuit name changes

This is **lightweight** (string formatting) and provides immediate updates without blocking the UI.

## Error Handling

If presentation generation fails:
- Error message is displayed in markdown output
- Visualization data is reset to default state
- Error is logged with full details

## Performance

Presentation generation is fast because:
- No expensive matrix operations (already done in CalculationContext)
- Simple string formatting and data extraction
- Memoized context value prevents unnecessary re-renders
- Visualization data is generated once per calculation

## Integration with Analysis Pipeline

```
ValidationContext (automatic)
    ↓
CalculationContext (on-demand via runAnalysis)
    ↓
PresentationContext (automatic) ← You are here
    ↓
UI Components (AnalysisPane, ResultsDisplay, GraphVisualization)
```

## Testing

Test the PresentationContext by:
1. Verifying markdown report generation with known circuits
2. Checking loop/cut-set extraction from matrices
3. Validating color assignments
4. Testing visualization mode switching
5. Verifying element highlighting

## Dependencies

- `generateMarkdownReport` from `@/analysis/utils/reportGenerator`
- `generateVisualizationData` helper function
- `getLoopColor` and `getCutSetColor` from report generator
- `logger` utility for debugging

## Next Steps

After implementing PresentationContext:
1. Create AnalysisPaneWrapper component (Task 17)
2. Build AnalysisControls toolbar (Task 18)
3. Implement Cytoscape graph visualization (Task 19)
4. Create ResultsDisplay component (Task 22)
