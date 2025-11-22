/**
 * ValidationProvider - Validates circuit structure and transforms to analysis graph.
 *
 * This provider:
 * - Accepts Circuit from Zustand store as input
 * - Automatically re-runs validation when active circuit changes
 * - Calls createAnalysisGraph() and validateGraph()
 * - Provides ValidationContextState with analysisGraph, validation, and isValidating
 */

import React, { useEffect, useState, useMemo } from "react";
import type { Circuit } from "../../types/circuit";
import type { AnalysisGraph, ValidationResult } from "../../types/analysis";
import { createAnalysisGraph } from "../../analysis/utils/graphTransformer";
import { validateGraph } from "../../analysis/utils/validation";
import { logger } from "../../utils/logger";
import { ValidationContext, DEFAULT_VALIDATION } from "./context";
import type { ValidationContextState } from "./context";

/**
 * Props for ValidationProvider.
 */
export interface ValidationProviderProps {
  /** The circuit to validate (from Zustand store) */
  readonly circuit: Circuit | null;
  /** Child components */
  readonly children: React.ReactNode;
}

/**
 * ✅ ValidationProvider - Provides validation state to child components.
 *
 * Automatically validates the circuit whenever it changes and provides:
 * - Transformed analysis graph
 * - Validation results (errors, warnings)
 * - Loading state
 * - Error state
 */
export function ValidationProvider({ circuit, children }: ValidationProviderProps): React.ReactElement {
  const [analysisGraph, setAnalysisGraph] = useState<AnalysisGraph | null>(null);
  const [validation, setValidation] = useState<ValidationResult>(DEFAULT_VALIDATION);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute validation state from circuit
  useEffect(() => {
    // Reset state if no circuit
    if (!circuit) {
      logger.debug({ caller: "ValidationProvider" }, "No circuit provided, resetting state");
      return;
    }

    logger.info({ caller: "ValidationProvider" }, "Starting validation", {
      circuitId: circuit.id,
      circuitName: circuit.name,
      nodes: circuit.nodes,
      edges: circuit.edges,
    });

    // Perform validation synchronously (it's fast enough)
    const performValidation = (): void => {
      setIsValidating(true);
      setError(null);

      try {
        // Step 1: Transform circuit to analysis graph
        logger.debug({ caller: "ValidationProvider" }, "Transforming circuit to analysis graph");
        const graph = createAnalysisGraph(circuit);

        logger.debug({ caller: "ValidationProvider" }, "Analysis graph created", {
          nodeCount: graph.nodes.length,
          branchCount: graph.branches.length,
          treeCount: graph.allSpanningTrees.length,
        });

        // Step 2: Validate the graph
        logger.debug({ caller: "ValidationProvider" }, "Validating analysis graph");
        const validationResult = validateGraph(graph);

        logger.info({ caller: "ValidationProvider" }, "Validation complete", {
          isValid: validationResult.isValid,
          isSolvable: validationResult.isSolvable,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
        });

        // Update state with results
        setAnalysisGraph(graph);
        setValidation(validationResult);
        setIsValidating(false);
      } catch (err) {
        // Handle errors gracefully
        const errorMessage = err instanceof Error ? err.message : "Unknown error during validation";

        logger.error({ caller: "ValidationProvider" }, "Validation failed with error", err);

        setAnalysisGraph(null);
        setValidation({
          isValid: false,
          isSolvable: false,
          errors: [errorMessage],
          warnings: [],
        });
        setError(errorMessage);
        setIsValidating(false);
      }
    };

    performValidation();
  }, [circuit]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ValidationContextState>(
    () => ({
      analysisGraph,
      validation,
      isValidating,
      error,
    }),
    [analysisGraph, validation, isValidating, error]
  );

  return <ValidationContext.Provider value={contextValue}>{children}</ValidationContext.Provider>;
}
