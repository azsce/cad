/**
 * CalculationContext definition.
 * Separated from the provider for Fast Refresh compatibility.
 */

import { createContext } from "react";
import type { CalculationResult } from "../../types/analysis";

/**
 * State provided by the CalculationContext.
 */
export interface CalculationContextState {
  /** The calculation result, or null if no calculation has been performed */
  result: CalculationResult | null;
  /** Whether calculation is currently in progress */
  isCalculating: boolean;
  /** Error message if calculation failed */
  error: string | null;
  /** Function to trigger analysis calculation */
  runAnalysis: (method: "nodal" | "loop" | "both") => void;
}

/**
 * Default context state.
 */
const DEFAULT_STATE: CalculationContextState = {
  result: null,
  isCalculating: false,
  error: null,
  runAnalysis: () => {
    throw new Error("CalculationContext not initialized");
  },
};

/**
 * React Context for calculation state.
 */
export const CalculationContext = createContext<CalculationContextState>(DEFAULT_STATE);
