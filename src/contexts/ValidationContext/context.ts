/**
 * ValidationContext definition.
 * Separated from the provider for Fast Refresh compatibility.
 */

import { createContext } from "react";
import type { AnalysisGraph, ValidationResult } from "../../types/analysis";

/**
 * State provided by the ValidationContext.
 */
export interface ValidationContextState {
  /** The transformed analysis graph, or null if no circuit or transformation failed */
  analysisGraph: AnalysisGraph | null;
  /** Validation result with errors and warnings */
  validation: ValidationResult;
  /** Whether validation is currently in progress */
  isValidating: boolean;
  /** Error message if transformation or validation failed */
  error: string | null;
}

/**
 * Default validation result for empty/invalid circuits.
 */
export const DEFAULT_VALIDATION: ValidationResult = {
  isValid: false,
  isSolvable: false,
  errors: [],
  warnings: [],
};

/**
 * Default context state.
 */
const DEFAULT_STATE: ValidationContextState = {
  analysisGraph: null,
  validation: DEFAULT_VALIDATION,
  isValidating: false,
  error: null,
};

/**
 * React Context for validation state.
 */
export const ValidationContext = createContext<ValidationContextState>(DEFAULT_STATE);
