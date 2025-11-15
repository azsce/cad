/**
 * 📝 Equation formatting utilities.
 * Provides helpers for formatting mathematical equations in LaTeX.
 */

/**
 * Formats a matrix equation in LaTeX.
 * 
 * @param leftSide - Left side of the equation (e.g., "Y_{node}")
 * @param rightSide - Right side of the equation (e.g., "A Y_B A^T")
 * @returns Formatted LaTeX equation
 * 
 * @example
 * ```typescript
 * formatMatrixEquation("Y_{node}", "A Y_B A^T");
 * // Returns: "Y_{node} = A Y_B A^T"
 * ```
 */
export function formatMatrixEquation(leftSide: string, rightSide: string): string {
  return `${leftSide} = ${rightSide}`;
}

/**
 * Formats a vector equation in LaTeX.
 * 
 * @param leftSide - Left side of the equation
 * @param rightSide - Right side of the equation
 * @returns Formatted LaTeX equation
 */
export function formatVectorEquation(leftSide: string, rightSide: string): string {
  return `${leftSide} = ${rightSide}`;
}

/**
 * Formats a system of linear equations in LaTeX.
 * 
 * @param matrixName - Name of the system matrix (e.g., "Y_{node}")
 * @param vectorName - Name of the unknown vector (e.g., "E_N")
 * @param rhsName - Name of the right-hand side vector (e.g., "I_{node}")
 * @returns Formatted LaTeX equation
 * 
 * @example
 * ```typescript
 * formatSystemEquation("Y_{node}", "E_N", "I_{node}");
 * // Returns: "Y_{node} E_N = I_{node}"
 * ```
 */
export function formatSystemEquation(
  matrixName: string,
  vectorName: string,
  rhsName: string
): string {
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
