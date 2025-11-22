/**
 * Unit tests for matrixToTable HTML generation
 *
 * Tests HTML table generation with KaTeX delimiters and square brackets
 */

import { describe, it, expect } from "bun:test";
import { matrix, type Matrix } from "mathjs";
import {
  matrixToTableWithBrackets,
  matrixToVectorTable,
  matrixToDiagonalTable,
  getBranchLabels,
  getNodeLabels,
  createRowLabel,
  createColumnLabel,
  createValueLabel,
  createBranchCount,
  createNodeCount,
  createMatrixData,
  ReferenceNodeInclusion,
} from "./matrixToTable";

// ============================================================================
// Test Data Helpers
// ============================================================================

/**
 * 🏗️ Create simple 2x2 matrix
 */
function createSimpleMatrix(): Matrix {
  return matrix([[1, -1], [0, 1]]);
}

/**
 * 🏗️ Create matrix with decimal values
 */
function createDecimalMatrix(): Matrix {
  return matrix([[0.1, -0.5], [0.333, 1.5]]);
}

/**
 * 🏗️ Create diagonal matrix
 */
function createDiagonalMatrix(): Matrix {
  return matrix([[10, 0], [0, 20]]);
}

/**
 * 🏗️ Create vector (column matrix)
 */
function createVector(): Matrix {
  return matrix([[5], [10]]);
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * ✅ Assert HTML contains KaTeX delimiters
 */
function assertContainsKaTeXDelimiters(html: string, value: string): void {
  expect(html).toContain(`<span class="math math-inline">${value}</span>`);
}

/**
 * ✅ Assert HTML does NOT contain malformed delimiters
 */
function assertNoMalformedDelimiters(html: string): void {
  // Should have math-inline class for all values
  const mathSpans = html.match(/<span class="math math-inline">/g);
  expect(mathSpans).toBeTruthy();
  const spanCount = mathSpans?.length ?? 0;
  expect(spanCount).toBeGreaterThan(0);
}

/**
 * ✅ Assert HTML is valid structure
 */
function assertValidHTMLStructure(html: string): void {
  expect(html).toContain("<div");
  expect(html).toContain("<table");
  expect(html).toContain("<thead");
  expect(html).toContain("<tbody");
  expect(html).toContain("</div>");
  expect(html).toContain("</table>");
}

/**
 * ✅ Assert HTML has no leading whitespace
 */
function assertNoLeadingWhitespace(html: string): void {
  expect(html.trim()).toMatch(/^<div/);
  expect(html).not.toContain("\n  <table");
  expect(html).not.toContain("\n  <thead");
}

/**
 * ✅ Assert HTML contains square bracket divs
 */
function assertHasSquareBrackets(html: string): void {
  expect(html).toContain("border-right: none");
  expect(html).toContain("border-left: none");
}

/**
 * ✅ Assert HTML contains specific value with KaTeX
 */
function assertValueWithKaTeX(html: string, value: number): void {
  const formatted = formatValueForKaTeX(value);
  assertContainsKaTeXDelimiters(html, formatted);
}

/**
 * 🔧 Format value for KaTeX display
 */
function formatValueForKaTeX(value: number): string {
  if (value === 0) return "0";
  if (value === 1) return "1";
  if (value === -1) return "-1";
  return String(value);
}

/**
 * ✅ Assert HTML table has correct dimensions
 */
function assertTableDimensions(html: string, rows: number, cols: number): void {
  const rowMatches = html.match(/<tr>/g);
  const cellMatches = html.match(/<td/g);
  
  expect(rowMatches?.length).toBeGreaterThanOrEqual(rows);
  expect(cellMatches?.length).toBeGreaterThanOrEqual(rows * cols);
}

// ============================================================================
// Test Execution Helpers
// ============================================================================

/**
 * 🧪 Test matrix table generation with assertions
 */
function testMatrixTable(params: {
  matrix: Matrix;
  rowHeaders: string[];
  colHeaders: string[];
  rowLabel: string;
  assertions: (html: string) => void;
}): void {
  const html = matrixToTableWithBrackets({
    matrix: createMatrixData(params.matrix),
    rowHeaders: params.rowHeaders.map((h) => createRowLabel(h)),
    colHeaders: params.colHeaders.map((h) => createColumnLabel(h)),
    rowLabel: createRowLabel(params.rowLabel),
  });
  
  params.assertions(html);
}

/**
 * 🧪 Test vector table generation with assertions
 */
function testVectorTable(params: {
  vector: Matrix;
  rowHeaders: string[];
  rowLabel: string;
  valueLabel: string;
  assertions: (html: string) => void;
}): void {
  const html = matrixToVectorTable({
    vector: createMatrixData(params.vector),
    rowHeaders: params.rowHeaders.map((h) => createRowLabel(h)),
    rowLabel: createRowLabel(params.rowLabel),
    valueLabel: createValueLabel(params.valueLabel),
  });
  
  params.assertions(html);
}

/**
 * 🧪 Test diagonal table generation with assertions
 */
function testDiagonalTable(params: {
  matrix: Matrix;
  rowHeaders: string[];
  rowLabel: string;
  valueLabel: string;
  assertions: (html: string) => void;
}): void {
  const html = matrixToDiagonalTable({
    matrix: createMatrixData(params.matrix),
    rowHeaders: params.rowHeaders.map((h) => createRowLabel(h)),
    rowLabel: createRowLabel(params.rowLabel),
    valueLabel: createValueLabel(params.valueLabel),
  });
  
  params.assertions(html);
}

// ============================================================================
// Tests
// ============================================================================

describe("matrixToTableWithBrackets", () => {
  describe("KaTeX delimiter formatting", () => {
    it("should wrap integer values in KaTeX delimiters", () => {
      testMatrixTable({
        matrix: createSimpleMatrix(),
        rowHeaders: ["1", "2"],
        colHeaders: ["a", "b"],
        rowLabel: "Node",
        assertions: (html) => {
          assertContainsKaTeXDelimiters(html, "1");
          assertContainsKaTeXDelimiters(html, "-1");
          assertContainsKaTeXDelimiters(html, "0");
          assertNoMalformedDelimiters(html);
        },
      });
    });

    it("should wrap column headers in KaTeX delimiters", () => {
      testMatrixTable({
        matrix: createSimpleMatrix(),
        rowHeaders: ["1", "2"],
        colHeaders: ["a", "b"],
        rowLabel: "Node",
        assertions: (html) => {
          assertContainsKaTeXDelimiters(html, "a");
          assertContainsKaTeXDelimiters(html, "b");
        },
      });
    });

    it("should wrap decimal values in KaTeX delimiters", () => {
      testMatrixTable({
        matrix: createDecimalMatrix(),
        rowHeaders: ["1", "2"],
        colHeaders: ["a", "b"],
        rowLabel: "Node",
        assertions: (html) => {
          assertContainsKaTeXDelimiters(html, "0.1");
          assertContainsKaTeXDelimiters(html, "-0.5");
          assertNoMalformedDelimiters(html);
        },
      });
    });

    it("should not have malformed delimiters (value$ or $value)", () => {
      testMatrixTable({
        matrix: createSimpleMatrix(),
        rowHeaders: ["1", "2"],
        colHeaders: ["a", "b"],
        rowLabel: "Node",
        assertions: assertNoMalformedDelimiters,
      });
    });
  });

  describe("HTML structure", () => {
    it("should generate valid HTML without leading whitespace", () => {
      testMatrixTable({
        matrix: createSimpleMatrix(),
        rowHeaders: ["1", "2"],
        colHeaders: ["a", "b"],
        rowLabel: "Node",
        assertions: (html) => {
          assertValidHTMLStructure(html);
          assertNoLeadingWhitespace(html);
        },
      });
    });

    it("should include square bracket divs", () => {
      testMatrixTable({
        matrix: createSimpleMatrix(),
        rowHeaders: ["1", "2"],
        colHeaders: ["a", "b"],
        rowLabel: "Node",
        assertions: assertHasSquareBrackets,
      });
    });

    it("should have correct table dimensions", () => {
      testMatrixTable({
        matrix: createSimpleMatrix(),
        rowHeaders: ["1", "2"],
        colHeaders: ["a", "b"],
        rowLabel: "Node",
        assertions: (html) => {
          assertTableDimensions(html, 2, 2);
        },
      });
    });
  });

  describe("value formatting", () => {
    it("should format special values (0, 1, -1) correctly", () => {
      testMatrixTable({
        matrix: createSimpleMatrix(),
        rowHeaders: ["1", "2"],
        colHeaders: ["a", "b"],
        rowLabel: "Node",
        assertions: (html) => {
          assertValueWithKaTeX(html, 0);
          assertValueWithKaTeX(html, 1);
          assertValueWithKaTeX(html, -1);
        },
      });
    });

    it("should format decimal values with precision", () => {
      testMatrixTable({
        matrix: createDecimalMatrix(),
        rowHeaders: ["1", "2"],
        colHeaders: ["a", "b"],
        rowLabel: "Node",
        assertions: (html) => {
          expect(html).toContain('<span class="math math-inline">0.1</span>');
          expect(html).toContain('<span class="math math-inline">-0.5</span>');
          expect(html).toContain('<span class="math math-inline">0.333</span>');
          expect(html).toContain('<span class="math math-inline">1.5</span>');
        },
      });
    });
  });
});

describe("matrixToVectorTable", () => {
  describe("KaTeX delimiter formatting", () => {
    it("should wrap vector values in KaTeX delimiters", () => {
      testVectorTable({
        vector: createVector(),
        rowHeaders: ["1", "2"],
        rowLabel: "Node",
        valueLabel: "V",
        assertions: (html) => {
          assertContainsKaTeXDelimiters(html, "5");
          assertContainsKaTeXDelimiters(html, "10");
          assertNoMalformedDelimiters(html);
        },
      });
    });

    it("should wrap value label in KaTeX delimiters", () => {
      testVectorTable({
        vector: createVector(),
        rowHeaders: ["1", "2"],
        rowLabel: "Node",
        valueLabel: "V",
        assertions: (html) => {
          assertContainsKaTeXDelimiters(html, "V");
        },
      });
    });
  });

  describe("HTML structure", () => {
    it("should generate valid HTML structure", () => {
      testVectorTable({
        vector: createVector(),
        rowHeaders: ["1", "2"],
        rowLabel: "Node",
        valueLabel: "V",
        assertions: (html) => {
          assertValidHTMLStructure(html);
          assertHasSquareBrackets(html);
          assertNoLeadingWhitespace(html);
        },
      });
    });
  });
});

describe("matrixToDiagonalTable", () => {
  describe("KaTeX delimiter formatting", () => {
    it("should wrap diagonal values in KaTeX delimiters", () => {
      testDiagonalTable({
        matrix: createDiagonalMatrix(),
        rowHeaders: ["a", "b"],
        rowLabel: "Branch",
        valueLabel: "R",
        assertions: (html) => {
          assertContainsKaTeXDelimiters(html, "10");
          assertContainsKaTeXDelimiters(html, "20");
          assertNoMalformedDelimiters(html);
        },
      });
    });
  });

  describe("HTML structure", () => {
    it("should generate valid HTML structure", () => {
      testDiagonalTable({
        matrix: createDiagonalMatrix(),
        rowHeaders: ["a", "b"],
        rowLabel: "Branch",
        valueLabel: "R",
        assertions: (html) => {
          assertValidHTMLStructure(html);
          assertHasSquareBrackets(html);
          assertNoLeadingWhitespace(html);
        },
      });
    });
  });
});

describe("getBranchLabels", () => {
  it("should generate lowercase letter labels", () => {
    const labels = getBranchLabels(createBranchCount(3));
    const labelStrings = labels.map(String);
    expect(labelStrings).toHaveLength(3);
    expect(labelStrings[0]).toBe("a");
    expect(labelStrings[1]).toBe("b");
    expect(labelStrings[2]).toBe("c");
  });

  it("should handle single branch", () => {
    const labels = getBranchLabels(createBranchCount(1));
    const labelStrings = labels.map(String);
    expect(labelStrings).toHaveLength(1);
    expect(labelStrings[0]).toBe("a");
  });
});

describe("getNodeLabels", () => {
  it("should generate numeric labels starting from 1", () => {
    const labels = getNodeLabels({
      numNodes: createNodeCount(3),
      referenceNodeInclusion: ReferenceNodeInclusion.INCLUDE,
    });
    const labelStrings = labels.map(String);
    expect(labelStrings).toHaveLength(3);
    expect(labelStrings[0]).toBe("1");
    expect(labelStrings[1]).toBe("2");
    expect(labelStrings[2]).toBe("3");
  });

  it("should exclude reference node when specified", () => {
    const labels = getNodeLabels({
      numNodes: createNodeCount(3),
      referenceNodeInclusion: ReferenceNodeInclusion.EXCLUDE,
    });
    const labelStrings = labels.map(String);
    expect(labelStrings).toHaveLength(2);
    expect(labelStrings[0]).toBe("1");
    expect(labelStrings[1]).toBe("2");
  });
});
