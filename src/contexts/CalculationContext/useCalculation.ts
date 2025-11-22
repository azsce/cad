/**
 * Hook for consuming CalculationContext.
 * Provides access to calculation state in child components.
 */

import { useContext } from "react";
import { CalculationContext } from "./context";
import type { CalculationContextState } from "./context";

/**
 * 🧮 Hook to access calculation context state.
 *
 * Must be used within a CalculationProvider.
 *
 * @returns Calculation context state
 * @throws Error if used outside CalculationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { result, isCalculating, error, runAnalysis } = useCalculation();
 *
 *   const handleRunAnalysis = () => {
 *     runAnalysis('nodal');
 *   };
 *
 *   if (isCalculating) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (error) {
 *     return <ErrorDisplay error={error} />;
 *   }
 *
 *   if (result) {
 *     return <ResultsDisplay result={result} />;
 *   }
 *
 *   return <button onClick={handleRunAnalysis}>Run Analysis</button>;
 * }
 * ```
 */
export function useCalculation(): CalculationContextState {
  const context = useContext(CalculationContext);

  // Context will always have a value due to default state
  return context;
}
