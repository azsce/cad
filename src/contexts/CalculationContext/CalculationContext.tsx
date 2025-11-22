/**
 * CalculationProvider - Performs mathematical analysis on validated circuits.
 *
 * - Nodal Analysis (Cut-Set Method): Solves for node voltages E_N using A and Y_B
 * - Loop Analysis (Tie-Set Method): Solves for loop currents I_L using B and Z_B
 *
 * This provider:
 * - Accepts AnalysisGraph from ValidationContext
 * - Provides runAnalysis() function for on-demand calculation
 * - Checks validation.isSolvable before proceeding
 * - Calls appropriate analysis method (nodal, loop, or both)
 * - Provides CalculationContextState with result, isCalculating, error, and runAnalysis
 */

import React, { useState, useCallback, useMemo } from "react";
import type { AnalysisGraph, CalculationResult, AnalysisStep } from "../../types/analysis";
import { logger } from "../../utils/logger";
import { CalculationContext } from "./context";
import type { CalculationContextState } from "./context";
import {
  buildIncidenceMatrix,
  buildBranchAdmittanceMatrix,
  buildBranchVoltageSourceVector,
  buildBranchCurrentSourceVector,
  solveNodalEquations,
} from "../../analysis/utils/nodalAnalysis";
import { solveLoopEquations } from "../../analysis/utils/loopAnalysis";

/**
 * Props for CalculationProvider.
 */
export interface CalculationProviderProps {
  /** The validated analysis graph (from ValidationContext) */
  readonly analysisGraph: AnalysisGraph | null;
  /** Whether the circuit is solvable (from ValidationContext) */
  readonly isSolvable: boolean;
  /** Child components */
  readonly children: React.ReactNode;
}

/**
 * 🧮 Performs nodal analysis on the graph.
 *
 * Cut-Set Analysis:
 * Uses incidence matrix A and admittance matrix Y_B to solve for node voltages E_N.
 */
function performNodalAnalysis(graph: AnalysisGraph): CalculationResult {
  const caller = "performNodalAnalysis";
  logger.info({ caller }, "Starting nodal analysis (cut-set method)");

  const steps: AnalysisStep[] = [];

  // Build input matrices
  const A = buildIncidenceMatrix(graph);
  steps.push({
    title: "Reduced Incidence Matrix (A)",
    description:
      "Node-branch incidence matrix with reference node row omitted. " +
      "A[i][j] = +1 if branch j leaves node i, -1 if it enters, 0 otherwise.",
    matrix: A,
  });

  const YB = buildBranchAdmittanceMatrix(graph);
  steps.push({
    title: "Branch Admittance Matrix (Y_B)",
    description: "Diagonal matrix of branch admittances. Y_B[i][i] = 1/R for resistors, 0 for sources.",
    matrix: YB,
  });

  const EB = buildBranchVoltageSourceVector(graph);
  const IB = buildBranchCurrentSourceVector(graph);
  steps.push(
    {
      title: "Branch Voltage Source Vector (E_B)",
      description: "Vector of branch voltage sources. E_B[i] = voltage for voltage sources, 0 otherwise.",
      matrix: EB,
    },
    {
      title: "Branch Current Source Vector (I_B)",
      description: "Vector of branch current sources. I_B[i] = current for current sources, 0 otherwise.",
      matrix: IB,
    }
  );

  // Solve nodal equations
  const solution = solveNodalEquations(A, YB, EB, IB);

  // Check for errors
  if (solution.error) {
    throw new Error(solution.error);
  }

  // Combine all steps
  const allSteps = [...steps, ...solution.steps];

  logger.info({ caller }, "Nodal analysis completed successfully");

  return {
    method: "nodal",
    incidenceMatrix: A,
    branchAdmittanceMatrix: YB,
    branchVoltageSources: EB,
    branchCurrentSources: IB,
    systemMatrix: solution.systemMatrix,
    systemVector: solution.systemVector,
    nodeVoltages: solution.nodeVoltages,
    branchVoltages: solution.branchVoltages,
    branchCurrents: solution.branchCurrents,
    steps: allSteps,
  };
}

/**
 * 🔄 Performs loop analysis on the graph.
 *
 * Loop Analysis:
 * Uses tie-set matrix B and impedance matrix Z_B to solve for loop currents I_L.
 */
function performLoopAnalysis(graph: AnalysisGraph): CalculationResult {
  const caller = "performLoopAnalysis";
  logger.info({ caller }, "Starting loop analysis (tie-set method)");

  // Solve loop equations (this builds all matrices internally)
  const solution = solveLoopEquations(graph);

  logger.info({ caller }, "Loop analysis completed successfully");

  return {
    method: "loop",
    loopCurrents: solution.loopCurrents,
    branchVoltages: solution.branchVoltages,
    branchCurrents: solution.branchCurrents,
    steps: solution.steps,
  };
}

/**
 * ✅ CalculationProvider - Provides calculation state to child components.
 *
 * Performs mathematical analysis on-demand when runAnalysis() is called.
 * Provides:
 * - Calculation results (matrices, vectors, solutions)
 * - Loading state
 * - Error state
 * - runAnalysis function to trigger calculation
 */
export function CalculationProvider({
  analysisGraph,
  isSolvable,
  children,
}: CalculationProviderProps): React.ReactElement {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 🚀 Runs analysis calculation based on the selected method.
   *
   * This function is called on-demand when the user clicks "Run Analysis".
   * It does NOT run automatically when the circuit changes.
   */
  const runAnalysis = useCallback(
    (method: "nodal" | "loop" | "both"): void => {
      const caller = "runAnalysis";

      // Validate preconditions
      if (!analysisGraph) {
        const errorMsg = "No analysis graph available";
        logger.warn({ caller }, errorMsg);
        setError(errorMsg);
        return;
      }

      if (!isSolvable) {
        const errorMsg = "Circuit is not solvable. Please fix validation errors first.";
        logger.warn({ caller }, errorMsg);
        setError(errorMsg);
        return;
      }

      logger.info({ caller }, "Starting analysis calculation", { method, graphNodeCount: analysisGraph.nodes.length });

      setIsCalculating(true);
      setError(null);
      setResult(null);

      try {
        let calculationResult: CalculationResult;

        if (method === "nodal") {
          calculationResult = performNodalAnalysis(analysisGraph);
        } else if (method === "loop") {
          calculationResult = performLoopAnalysis(analysisGraph);
        } else {
          // 'both' method - run nodal first, then loop
          // For now, we'll just run nodal (can be extended later)
          logger.info({ caller }, "Running both methods - starting with nodal");
          calculationResult = performNodalAnalysis(analysisGraph);
        }

        setResult(calculationResult);
        setIsCalculating(false);

        logger.info({ caller }, "Analysis calculation completed successfully", {
          method,
          stepCount: calculationResult.steps.length,
        });
      } catch (err) {
        // Handle errors gracefully
        const errorMessage = err instanceof Error ? err.message : "Unknown error during calculation";

        logger.error({ caller }, "Calculation failed with error", err);

        setResult(null);
        setError(errorMessage);
        setIsCalculating(false);
      }
    },
    [analysisGraph, isSolvable]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<CalculationContextState>(
    () => ({
      result,
      isCalculating,
      error,
      runAnalysis,
    }),
    [result, isCalculating, error, runAnalysis]
  );

  return <CalculationContext.Provider value={contextValue}>{children}</CalculationContext.Provider>;
}
