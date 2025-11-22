/**
 * 📝 Equation formatting utilities for circuit analysis.
 *
 * Provides helpers for formatting mathematical equations in LaTeX notation
 *
 * Standard notation used:
 * - Matrices: Capital letters with subscript (e.g., Z_B, Y_B, A, B, C)
 * - Vectors: Capital letters with subscript (e.g., V_B, J_B, I_L, E_B, I_B)
 * - Subscripts: _B (branch), _L (loop), _T (tree/twig), _N (node)
 */

/**
 * Formats a matrix equation in LaTeX.
 *
 * @param leftSide - Left side of the equation (e.g., "Z_{loop}")
 * @param rightSide - Right side of the equation (e.g., "B \\cdot Z_B \\cdot B^T")
 * @returns Formatted LaTeX equation
 *
 * @example
 * ```typescript
 * formatMatrixEquation("Z_{loop}", "B \\cdot Z_B \\cdot B^T");
 * // Returns: "Z_{loop} = B \\cdot Z_B \\cdot B^T"
 * ```
 */
export function formatMatrixEquation(leftSide: string, rightSide: string): string {
  return `${leftSide} = ${rightSide}`;
}

/**
 * Formats a vector equation in LaTeX.
 *
 * @param leftSide - Left side of the equation (e.g., "J_B")
 * @param rightSide - Right side of the equation (e.g., "B^T \\cdot I_L")
 * @returns Formatted LaTeX equation
 *
 * @example
 * ```typescript
 * formatVectorEquation("J_B", "B^T \\cdot I_L");
 * // Returns: "J_B = B^T \\cdot I_L"
 * ```
 */
export function formatVectorEquation(leftSide: string, rightSide: string): string {
  return `${leftSide} = ${rightSide}`;
}

/**
 * Formats a system of linear equations in LaTeX.
 *
 * @param matrixName - Name of the system matrix (e.g., "Z_{loop}")
 * @param vectorName - Name of the unknown vector (e.g., "I_L")
 * @param rhsName - Name of the right-hand side vector (e.g., "E_{loop}")
 * @returns Formatted LaTeX equation
 *
 * @example
 * ```typescript
 * formatSystemEquation("Z_{loop}", "I_L", "E_{loop}");
 * // Returns: "Z_{loop} I_L = E_{loop}"
 * ```
 */
export function formatSystemEquation(matrixName: string, vectorName: string, rhsName: string): string {
  return `${matrixName} ${vectorName} = ${rhsName}`;
}

/**
 * Wraps an equation in LaTeX display math mode.
 *
 * @param equation - The equation to wrap
 * @returns Equation wrapped in $$ delimiters
 */
export function wrapInDisplayMath(equation: string): string {
  return `$$${equation}$$`;
}

/**
 * Wraps an equation in LaTeX inline math mode.
 *
 * @param equation - The equation to wrap
 * @returns Equation wrapped in $ delimiters
 */
export function wrapInInlineMath(equation: string): string {
  return `$${equation}$`;
}
