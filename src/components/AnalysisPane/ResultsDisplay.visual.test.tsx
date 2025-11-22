/**
 * Visual regression tests for ResultsDisplay HTML table rendering
 *
 * Tests that HTML tables with KaTeX and square brackets render correctly
 * in the markdown output.
 */

// Setup DOM environment for React component testing
import { Window } from "happy-dom";

const window = new Window();
const document = window.document;

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
globalThis.window = window as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
globalThis.document = document as any;

import { describe, it, expect } from "bun:test";
import { render } from "@testing-library/react";
import { ResultsDisplay } from "./ResultsDisplay";
import { PresentationContext } from "../../contexts/PresentationContext";

// ============================================================================
// Test Data Helpers
// ============================================================================

/**
 * 🏗️ Create markdown with HTML table
 */
function createMarkdownWithTable(tableHTML: string): string {
  return `## Test Matrix\n\n${tableHTML}\n\n## End`;
}

/**
 * 🏗️ Create simple HTML table with KaTeX
 */
function createSimpleHTMLTable(): string {
  return `<div style="display: inline-block; position: relative; padding: 0 20px;">
<div style="position: absolute; left: 0; top: 0; bottom: 0; width: 10px; border: 2px solid #333; border-right: none;"></div>
<div style="position: absolute; right: 0; top: 0; bottom: 0; width: 10px; border: 2px solid #333; border-left: none;"></div>
<table style="border-collapse: collapse;">
<thead>
<tr><th>Node</th><th>$a$</th><th>$b$</th></tr>
</thead>
<tbody>
<tr><td>**1**</td><td>$-1$</td><td>$1$</td></tr>
<tr><td>**2**</td><td>$0$</td><td>$-1$</td></tr>
</tbody>
</table>
</div>`;
}

/**
 * 🏗️ Create markdown with multiple tables
 */
function createMarkdownWithMultipleTables(): string {
  const table1 = createSimpleHTMLTable();
  const table2 = `<div style="display: inline-block;">
<table>
<tr><th>Branch</th><th>$R$</th></tr>
<tr><td>**a**</td><td>$10$</td></tr>
<tr><td>**b**</td><td>$20$</td></tr>
</table>
</div>`;
  
  return `## Matrix A\n\n${table1}\n\n## Matrix R\n\n${table2}`;
}

// ============================================================================
// Rendering Helpers
// ============================================================================

/**
 * 🎨 Render ResultsDisplay with markdown
 */
function renderWithMarkdown(markdown: string): ReturnType<typeof render> {
  return render(
    <PresentationContext.Provider
      value={{
        markdownOutput: markdown,
        isGenerating: false,
        visualizationData: {
          mode: "results" as const,
          highlightedElements: [],
          loopDefinitions: [],
          cutSetDefinitions: [],
        },
        setVisualizationMode: () => {},
        setHighlightedElements: () => {},
      }}
    >
      <ResultsDisplay />
    </PresentationContext.Provider>
  );
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * ✅ Assert HTML table is rendered (not escaped)
 */
function assertHTMLTableRendered(container: Element): void {
  const table = container.querySelector("table");
  expect(table).toBeTruthy();
}

/**
 * ✅ Assert no escaped HTML in output
 */
function assertNoEscapedHTML(container: Element): void {
  const text = container.textContent;
  expect(text).not.toContain("&lt;table&gt;");
  expect(text).not.toContain("&lt;div&gt;");
  expect(text).not.toContain("&lt;tr&gt;");
  expect(text).not.toContain("&lt;td&gt;");
}

/**
 * ✅ Assert KaTeX delimiters are present (KaTeX will process them)
 */
function assertKaTeXDelimitersPresent(container: Element): void {
  const html = container.innerHTML;
  // Check for KaTeX delimiters in the HTML
  expect(html).toMatch(/\$-?\d+\$/);
}

/**
 * ✅ Assert square brackets are present
 */
function assertSquareBracketsPresent(container: Element): void {
  const bracketDivs = container.querySelectorAll('div[style*="border"]');
  expect(bracketDivs.length).toBeGreaterThan(0);
}

/**
 * ✅ Assert table is not wrapped in pre tags
 */
function assertTableNotInPre(container: Element): void {
  const preElements = container.querySelectorAll("pre");
  const tableInPre = Array.from(preElements).some((pre) => pre.querySelector("table") !== null);
  expect(tableInPre).toBe(false);
}

/**
 * ✅ Assert table has correct structure
 */
function assertTableStructure(container: Element, expectedRows: number): void {
  const table = container.querySelector("table");
  expect(table).toBeTruthy();
  
  const rows = table?.querySelectorAll("tr");
  expect(rows?.length).toBeGreaterThanOrEqual(expectedRows);
}

/**
 * ✅ Assert specific KaTeX delimiter is present
 */
function assertKaTeXDelimiter(container: Element, value: string): void {
  const html = container.innerHTML;
  expect(html).toContain(`$${value}$`);
}

/**
 * ✅ Assert complete HTML table rendering
 */
function assertCompleteTableRendering(container: Element): void {
  assertHTMLTableRendered(container);
  assertNoEscapedHTML(container);
  assertKaTeXDelimitersPresent(container);
  assertTableNotInPre(container);
}

// ============================================================================
// Test Execution Helpers
// ============================================================================

/**
 * 🧪 Test HTML table rendering with assertions
 */
function testHTMLTableRendering(params: {
  markdown: string;
  assertions: (container: Element) => void;
}): void {
  const { container } = renderWithMarkdown(params.markdown);
  params.assertions(container);
}

// ============================================================================
// Tests
// ============================================================================

describe("ResultsDisplay HTML Table Rendering", () => {
  describe("HTML parsing", () => {
    it("should render HTML tables from markdown", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: assertHTMLTableRendered,
      });
    });

    it("should not escape HTML entities", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: assertNoEscapedHTML,
      });
    });

    it("should not wrap HTML tables in pre tags", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: assertTableNotInPre,
      });
    });
  });

  describe("KaTeX delimiters", () => {
    it("should have KaTeX delimiters in table cells", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: assertKaTeXDelimitersPresent,
      });
    });

    it("should have KaTeX delimiters for negative values", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: (container) => {
          assertKaTeXDelimiter(container, "-1");
        },
      });
    });

    it("should have KaTeX delimiters for zero", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: (container) => {
          assertKaTeXDelimiter(container, "0");
        },
      });
    });

    it("should have KaTeX delimiters for column headers", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: (container) => {
          assertKaTeXDelimiter(container, "a");
          assertKaTeXDelimiter(container, "b");
        },
      });
    });
  });

  describe("square brackets", () => {
    it("should render square brackets with CSS", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: assertSquareBracketsPresent,
      });
    });

    it("should have bracket divs with border styles", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: (container) => {
          // Check that bracket divs are present in the HTML
          // Browser may expand "border-right: none" to "border-style: solid none solid solid"
          const html = container.innerHTML;
          expect(html).toMatch(/border.*none/);
          expect(html).toContain("position: absolute");
        },
      });
    });
  });

  describe("table structure", () => {
    it("should render table with thead and tbody", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: (container) => {
          const thead = container.querySelector("thead");
          const tbody = container.querySelector("tbody");
          expect(thead).toBeTruthy();
          expect(tbody).toBeTruthy();
        },
      });
    });

    it("should render correct number of rows", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: (container) => {
          assertTableStructure(container, 3);
        },
      });
    });

    it("should render table cells with values", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: (container) => {
          const cells = container.querySelectorAll("td");
          expect(cells.length).toBeGreaterThan(0);
        },
      });
    });
  });

  describe("multiple tables", () => {
    it("should render multiple HTML tables", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithMultipleTables(),
        assertions: (container) => {
          const tables = container.querySelectorAll("table");
          expect(tables.length).toBeGreaterThanOrEqual(2);
        },
      });
    });

    it("should have KaTeX delimiters in all tables", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithMultipleTables(),
        assertions: (container) => {
          const html = container.innerHTML;
          const delimiterMatches = html.match(/\$[^$]+\$/g);
          expect(delimiterMatches?.length).toBeGreaterThan(5);
        },
      });
    });
  });

  describe("complete rendering", () => {
    it("should render complete HTML table with all features", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: assertCompleteTableRendering,
      });
    });

    it("should handle empty markdown gracefully", () => {
      testHTMLTableRendering({
        markdown: "",
        assertions: (container) => {
          expect(container.textContent).toContain("No Results Yet");
        },
      });
    });

    it("should render markdown headings alongside HTML tables", () => {
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(createSimpleHTMLTable()),
        assertions: (container) => {
          const heading = container.querySelector("h2");
          expect(heading).toBeTruthy();
          expect(heading?.textContent).toContain("Test Matrix");
        },
      });
    });
  });

  describe("edge cases", () => {
    it("should handle table without square brackets", () => {
      const simpleTable = `<table><tr><td>$1$</td></tr></table>`;
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(simpleTable),
        assertions: (container) => {
          assertHTMLTableRendered(container);
          assertKaTeXDelimitersPresent(container);
        },
      });
    });

    it("should handle nested divs in table", () => {
      const nestedTable = `<div><div><table><tr><td>$1$</td></tr></table></div></div>`;
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(nestedTable),
        assertions: assertHTMLTableRendered,
      });
    });

    it("should handle table with inline styles", () => {
      const styledTable = `<table style="border: 1px solid black;"><tr><td style="padding: 10px;">$1$</td></tr></table>`;
      testHTMLTableRendering({
        markdown: createMarkdownWithTable(styledTable),
        assertions: (container) => {
          const table = container.querySelector("table");
          expect(table?.getAttribute("style")).toContain("border");
        },
      });
    });
  });
});
