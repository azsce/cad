/**
 * 📊 Matrix to HTML table converter with square brackets.
 *
 * Converts matrices to HTML tables with row/column headers and square bracket styling,
 * using KaTeX for all numerical values.
 */

import type { Matrix } from "mathjs";

// Branded types to eliminate primitive obsession
type RowLabel = string & { readonly __brand: "RowLabel" };
type ColumnLabel = string & { readonly __brand: "ColumnLabel" };
type ValueLabel = string & { readonly __brand: "ValueLabel" };
type HtmlString = string & { readonly __brand: "HtmlString" };
type MatrixData = Matrix & { readonly __brand: "MatrixData" };

// Parameter objects to reduce string-heavy arguments
type MatrixTableParams = {
  matrix: MatrixData;
  rowHeaders: RowLabel[];
  colHeaders: ColumnLabel[];
  rowLabel: RowLabel;
};

type VectorTableParams = {
  vector: MatrixData;
  rowHeaders: RowLabel[];
  rowLabel: RowLabel;
  valueLabel: ValueLabel;
};

type DiagonalTableParams = {
  matrix: MatrixData;
  rowHeaders: RowLabel[];
  rowLabel: RowLabel;
  valueLabel: ValueLabel;
};

/**
 * 🏷️ Creates a row label.
 */
export function createRowLabel(label: string): RowLabel {
  return label as RowLabel;
}

/**
 * 🏷️ Creates a column label.
 */
export function createColumnLabel(label: string): ColumnLabel {
  return label as ColumnLabel;
}

/**
 * 🏷️ Creates a value label.
 */
export function createValueLabel(label: string): ValueLabel {
  return label as ValueLabel;
}

/**
 * 🏷️ Creates row labels from string array.
 */
export function createRowLabels(labels: string[]): RowLabel[] {
  return labels.map(createRowLabel);
}

/**
 * 🏷️ Creates column labels from string array.
 */
export function createColumnLabels(labels: string[]): ColumnLabel[] {
  return labels.map(createColumnLabel);
}

/**
 * Converts a matrix to an HTML table with square brackets and headers.
 */
export function matrixToTableWithBrackets(params: MatrixTableParams): HtmlString {
  const matrixData = params.matrix.valueOf() as MatrixArray;
  
  // Build column headers row (outside brackets)
  const colHeaderCells = params.colHeaders
    .map(header => `<th style="${HEADER_CELL_STYLE}"><span class="math math-inline">${header}</span></th>`)
    .join("");
  
  // Build matrix value rows (inside brackets)
  const matrixValueRows = matrixData
    .map(row => {
      const valueCells = row
        .map(value => {
          const formattedValue = formatMatrixValue(createNumericValue(value));
          return `<td style="${VALUE_CELL_STYLE}"><span class="math math-inline">${formattedValue}</span></td>`;
        })
        .join("");
      return `<tr>${valueCells}</tr>`;
    })
    .join("");
  
  // Build row headers column (outside brackets)
  const rowHeaderCells = params.rowHeaders
    .map(header => `<tr><td style="${BODY_CELL_STYLE}">${header}</td></tr>`)
    .join("");
  
  return `<div style="display: inline-block; margin: 20px 0;">
<table style="${TABLE_STYLE}">
<thead>
<tr>
<th style="${HEADER_CELL_STYLE}">${params.rowLabel}</th>
<th colspan="${String(params.colHeaders.length)}" style="padding: 0;">
<table style="${TABLE_STYLE}; width: 100%;">
<tr>${colHeaderCells}</tr>
</table>
</th>
</tr>
</thead>
<tbody>
<tr>
<td style="padding: 0; vertical-align: middle;">
<table style="${TABLE_STYLE}">
${rowHeaderCells}
</table>
</td>
<td style="padding: 0; position: relative;">
<div style="${WRAPPER_DIV_STYLE}">
${createLeftBracket()}
${createRightBracket()}
<table style="${TABLE_STYLE}">
${matrixValueRows}
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>` as HtmlString;
}

/**
 * Converts a vector to an HTML table with square brackets and headers.
 */
export function matrixToVectorTable(params: VectorTableParams): HtmlString {
  const vectorData = params.vector.valueOf() as MatrixArray;
  const values = vectorData.map(row => row[FIRST_COLUMN_INDEX] ?? DEFAULT_FALLBACK_VALUE);
  
  // Build value rows (inside brackets)
  const valueRows = values
    .map(value => {
      const formattedValue = formatMatrixValue(createNumericValue(value));
      return `<tr><td style="${VALUE_CELL_STYLE}"><span class="math math-inline">${formattedValue}</span></td></tr>`;
    })
    .join("");
  
  // Build row headers column (outside brackets)
  const rowHeaderCells = params.rowHeaders
    .map(header => `<tr><td style="${BODY_CELL_STYLE}">${header}</td></tr>`)
    .join("");
  
  return `<div style="display: inline-block; margin: 20px 0;">
<table style="${TABLE_STYLE}">
<thead>
<tr>
<th style="${HEADER_CELL_STYLE}">${params.rowLabel}</th>
<th style="${HEADER_CELL_STYLE}"><span class="math math-inline">${params.valueLabel}</span></th>
</tr>
</thead>
<tbody>
<tr>
<td style="padding: 0; vertical-align: middle;">
<table style="${TABLE_STYLE}">
${rowHeaderCells}
</table>
</td>
<td style="padding: 0; position: relative;">
<div style="${WRAPPER_DIV_STYLE}">
${createLeftBracket()}
${createRightBracket()}
<table style="${TABLE_STYLE}">
${valueRows}
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>` as HtmlString;
}

/**
 * Converts a diagonal matrix to a simplified table showing only diagonal values.
 */
export function matrixToDiagonalTable(params: DiagonalTableParams): HtmlString {
  const matrixData = params.matrix.valueOf() as MatrixArray;
  const diagonalValues = matrixData.map((row, index) => row[index] ?? DEFAULT_FALLBACK_VALUE);
  
  // Build value rows (inside brackets)
  const valueRows = diagonalValues
    .map(value => {
      const formattedValue = formatMatrixValue(createNumericValue(value));
      return `<tr><td style="${VALUE_CELL_STYLE}"><span class="math math-inline">${formattedValue}</span></td></tr>`;
    })
    .join("");
  
  // Build row headers column (outside brackets)
  const rowHeaderCells = params.rowHeaders
    .map(header => `<tr><td style="${BODY_CELL_STYLE}">${header}</td></tr>`)
    .join("");
  
  return `<div style="display: inline-block; margin: 20px 0;">
<table style="${TABLE_STYLE}">
<thead>
<tr>
<th style="${HEADER_CELL_STYLE}">${params.rowLabel}</th>
<th style="${HEADER_CELL_STYLE}"><span class="math math-inline">${params.valueLabel}</span></th>
</tr>
</thead>
<tbody>
<tr>
<td style="padding: 0; vertical-align: middle;">
<table style="${TABLE_STYLE}">
${rowHeaderCells}
</table>
</td>
<td style="padding: 0; position: relative;">
<div style="${WRAPPER_DIV_STYLE}">
${createLeftBracket()}
${createRightBracket()}
<table style="${TABLE_STYLE}">
${valueRows}
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>` as HtmlString;
}

type MatrixArray = number[][];
type NumericValue = number & { readonly __brand: "NumericValue" };

/**
 * 🏷️ Creates a numeric value.
 */
function createNumericValue(value: number): NumericValue {
  return value as NumericValue;
}

type HtmlBracket = string & { readonly __brand: "HtmlBracket" };
type CssStyle = string & { readonly __brand: "CssStyle" };

const LEFT_BRACKET_STYLE = "position: absolute; left: 0; top: 0; bottom: 0; width: 10px; border: 2px solid #333; border-right: none; border-radius: 4px 0 0 4px;" as CssStyle;
const RIGHT_BRACKET_STYLE = "position: absolute; right: 0; top: 0; bottom: 0; width: 10px; border: 2px solid #333; border-left: none; border-radius: 0 4px 4px 0;" as CssStyle;
const HEADER_CELL_STYLE = "text-align: center; padding: 8px; font-weight: bold;" as CssStyle;
const BODY_CELL_STYLE = "text-align: center; padding: 8px; font-weight: bold;" as CssStyle;
const VALUE_CELL_STYLE = "text-align: center; padding: 8px;" as CssStyle;
const WRAPPER_DIV_STYLE = "display: inline-block; position: relative; padding: 0 20px; margin: 20px 0;" as CssStyle;
const TABLE_STYLE = "border-collapse: collapse; margin: 0;" as CssStyle;

/**
 * 🏗️ Creates left bracket HTML.
 */
function createLeftBracket(): HtmlBracket {
  return `<div style="${LEFT_BRACKET_STYLE}"></div>` as HtmlBracket;
}

/**
 * 🏗️ Creates right bracket HTML.
 */
function createRightBracket(): HtmlBracket {
  return `<div style="${RIGHT_BRACKET_STYLE}"></div>` as HtmlBracket;
}



type FormattedValue = string & { readonly __brand: "FormattedValue" };

const ZERO_STRING = "0" as FormattedValue;
const ONE_STRING = "1" as FormattedValue;
const NEGATIVE_ONE_STRING = "-1" as FormattedValue;
const DECIMAL_POINT = ".";
const ZERO_CHAR = "0";

const ROUNDING_PRECISION = 1000;
const SCIENTIFIC_NOTATION_THRESHOLD_HIGH = 1000;
const SCIENTIFIC_NOTATION_THRESHOLD_LOW = 0.01;
const ZERO_THRESHOLD = 0.001;
const DECIMAL_PLACES = 3;
const EXPONENTIAL_PRECISION = 2;
const LOWERCASE_A_CODE_POINT = 97;

const ZERO_VALUE = 0;
const ONE_VALUE = 1;
const NEGATIVE_ONE_VALUE = -1;
const FIRST_COLUMN_INDEX = 0;
const DEFAULT_FALLBACK_VALUE = 0;
const LABEL_START_OFFSET = 1;
const REMOVE_LAST_CHAR_OFFSET = -1;

/**
 * Formats a matrix value for display in KaTeX.
 */
function formatMatrixValue(value: NumericValue): FormattedValue {
  if (isSpecialValue(value)) {
    return formatSpecialValue(value);
  }

  const rounded = Math.round(value * ROUNDING_PRECISION) / ROUNDING_PRECISION;

  if (shouldUseScientificNotation(rounded)) {
    return rounded.toExponential(EXPONENTIAL_PRECISION) as FormattedValue;
  }

  return formatDecimalValue(rounded);
}

/**
 * ✅ Checks if value is a special case (0, 1, -1).
 */
function isSpecialValue(value: NumericValue): boolean {
  return value === ZERO_VALUE || value === ONE_VALUE || value === NEGATIVE_ONE_VALUE;
}

/**
 * 🔢 Formats special values (0, 1, -1).
 */
function formatSpecialValue(value: NumericValue): FormattedValue {
  if (value === ZERO_VALUE) return ZERO_STRING;
  if (value === ONE_VALUE) return ONE_STRING;
  return NEGATIVE_ONE_STRING;
}

/**
 * 🔬 Checks if scientific notation should be used.
 */
function shouldUseScientificNotation(rounded: number): boolean {
  const absValue = Math.abs(rounded);
  return absValue >= SCIENTIFIC_NOTATION_THRESHOLD_HIGH || 
         (absValue < SCIENTIFIC_NOTATION_THRESHOLD_LOW && rounded !== ZERO_VALUE);
}

/**
 * 📏 Formats decimal value with trailing zeros removed.
 */
function formatDecimalValue(rounded: number): FormattedValue {
  if (Math.abs(rounded) < ZERO_THRESHOLD) return ZERO_STRING;
  if (Number.isInteger(rounded)) return String(rounded) as FormattedValue;

  const fixed = rounded.toFixed(DECIMAL_PLACES);
  return removeTrailingZeros(fixed);
}

/**
 * ✂️ Removes trailing zeros from decimal string.
 */
function removeTrailingZeros(fixed: string): FormattedValue {
  if (!fixed.includes(DECIMAL_POINT)) {
    return fixed as FormattedValue;
  }

  let result = fixed;
  while (result.endsWith(ZERO_CHAR)) {
    result = result.slice(ZERO_VALUE, REMOVE_LAST_CHAR_OFFSET);
  }

  if (result.endsWith(DECIMAL_POINT)) {
    result = result.slice(ZERO_VALUE, REMOVE_LAST_CHAR_OFFSET);
  }

  return result as FormattedValue;
}

type BranchCount = number & { readonly __brand: "BranchCount" };
type NodeCount = number & { readonly __brand: "NodeCount" };

/**
 * 🏷️ Creates a branch count.
 */
export function createBranchCount(count: number): BranchCount {
  return count as BranchCount;
}

/**
 * 🏷️ Creates a node count.
 */
export function createNodeCount(count: number): NodeCount {
  return count as NodeCount;
}

/**
 * Gets branch labels (a, b, c, ...) for a graph as column labels.
 */
export function getBranchLabels(numBranches: BranchCount): ColumnLabel[] {
  const labels = Array.from({ length: numBranches }, (_, i) => 
    String.fromCodePoint(LOWERCASE_A_CODE_POINT + i)
  );
  return createColumnLabels(labels);
}

export enum ReferenceNodeInclusion {
  EXCLUDE = "EXCLUDE",
  INCLUDE = "INCLUDE",
}

type NodeLabelOptions = {
  numNodes: NodeCount;
  referenceNodeInclusion: ReferenceNodeInclusion;
};

/**
 * Gets node labels (1, 2, 3, ...) for a graph as row labels.
 */
export function getNodeLabels(options: NodeLabelOptions): RowLabel[] {
  const shouldExclude = options.referenceNodeInclusion === ReferenceNodeInclusion.EXCLUDE;
  const count = shouldExclude ? options.numNodes - ONE_VALUE : options.numNodes;
  const labels = Array.from({ length: count }, (_, i) => String(i + LABEL_START_OFFSET));
  return createRowLabels(labels);
}

/**
 * 🏷️ Creates matrix data from Matrix.
 */
export function createMatrixData(matrix: Matrix): MatrixData {
  return matrix as MatrixData;
}
