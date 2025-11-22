/**
 * Hook for consuming ValidationContext.
 * Provides access to validation state in child components.
 */

import { useContext } from "react";
import { ValidationContext } from "./context";
import type { ValidationContextState } from "./context";

/**
 * 🔍 Hook to access validation context state.
 *
 * Must be used within a ValidationProvider.
 *
 * @returns Validation context state
 * @throws Error if used outside ValidationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { analysisGraph, validation, isValidating } = useValidation();
 *
 *   if (isValidating) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!validation.isValid) {
 *     return <ErrorDisplay errors={validation.errors} />;
 *   }
 *
 *   return <AnalysisView graph={analysisGraph} />;
 * }
 * ```
 */
export function useValidation(): ValidationContextState {
  const context = useContext(ValidationContext);

  // Context will always have a value due to default state
  return context;
}
