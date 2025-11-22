/**
 * 📐 Matrix to LaTeX conversion utility.
 * Converts mathjs Matrix objects to LaTeX pmatrix format for rendering.
 */

import type { Matrix } from "mathjs";

/**
 * Converts a mathjs Matrix to LaTeX pmatrix format.
 *
 * @param matrix - The matrix to convert
 * @returns LaTeX string in pmatrix format
 *
 * @example
 * ```typescript
 * const matrix = math.matrix([[1, 2], [3, 4]]);
 * const latex = matrixToLatex(matrix);
 * // Returns: "\begin{pmatrix} 1.000 & 2.000 \\ 3.000 & 4.000 \end{pmatrix}"
 * ```
 */
export function matrixToLatex(matrix: Matrix): string {
  const data = matrix.valueOf() as number[][];

  // Handle empty matrix
  if (data.length === 0) {
    return String.raw`\begin{pmatrix} \end{pmatrix}`;
  }

  // Format each row
  const rows = data.map(row => {
    // Round each value to 3 decimal places and join with &
    return row.map(val => formatValue(val)).join(" & ");
  });

  // Join rows with \\
  const content = rows.join(String.raw` \\ `);

  return String.raw`\begin{pmatrix} ${content} \end{pmatrix}`;
}

/**
 * 🔢 Formats a numeric value for LaTeX display.
 * Rounds to 3 decimal places and handles special cases.
 *
 * @param value - The numeric value to format
 * @returns Formatted string
 */
export function formatValue(value: number): string {
  // Handle special cases
  if (!Number.isFinite(value)) {
    return String.raw`\infty`;
  }

  if (Math.abs(value) < 1e-10) {
    return "0";
  }

  // Round to 3 decimal places and remove trailing zeros/decimal point
  return Number.parseFloat(value.toFixed(3)).toString();
}
