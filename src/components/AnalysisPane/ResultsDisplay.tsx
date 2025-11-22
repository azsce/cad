/**
 * 📈 Results Display Component
 *
 * Displays analysis results with:
 * - Markdown formatting with react-markdown
 * - LaTeX equation rendering with KaTeX
 * - MUI styling for tables and typography
 * - Interactive features (copy, print, clickable references)
 * - Collapsible sections for long reports
 *
 * cspell:ignore Katex
 */

import { useMemo, useCallback, useState } from "react";
import { Box, Typography, IconButton, Tooltip, Paper, Divider, Snackbar, Alert } from "@mui/material";
import { ContentCopy as CopyIcon, Print as PrintIcon } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import { usePresentation } from "../../contexts/PresentationContext";
import type { GraphVisualizationData } from "../../contexts/PresentationContext/context";
import { logger } from "../../utils/logger";

/**
 * 📋 Sticky header with action buttons
 */
function ResultsHeader() {
  const { markdownOutput } = usePresentation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const headerStyle = useMemo(
    () => ({
      position: "sticky" as const,
      top: 0,
      zIndex: 10,
      bgcolor: "background.paper",
      borderBottom: 1,
      borderColor: "divider",
      p: 2,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }),
    []
  );

  const buttonGroupStyle = useMemo(
    () => ({
      display: "flex",
      gap: 1,
    }),
    []
  );

  /**
   * 📋 Copy all content to clipboard
   */
  const handleCopyAll = useCallback(() => {
    const caller = "handleCopyAll";
    logger.debug({ caller }, "Copying all content to clipboard");

    navigator.clipboard
      .writeText(markdownOutput)
      .then(() => {
        setSnackbarMessage("Report copied to clipboard");
        setSnackbarOpen(true);
        logger.info({ caller }, "Content copied successfully");
      })
      .catch((err: unknown) => {
        logger.error({ caller }, "Failed to copy content", err);
        setSnackbarMessage("Failed to copy content");
        setSnackbarOpen(true);
      });
  }, [markdownOutput]);

  /**
   * 🖨️ Print the report
   */
  const handlePrint = useCallback(() => {
    const caller = "handlePrint";
    logger.debug({ caller }, "Opening print dialog");
    globalThis.print();
  }, []);

  /**
   * 🔒 Close snackbar
   */
  const handleCloseSnackbar = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  return (
    <>
      <Box sx={headerStyle}>
        <Typography variant="h6">Analysis Results</Typography>
        <Box sx={buttonGroupStyle}>
          <Tooltip title="Copy entire report">
            <IconButton onClick={handleCopyAll} size="small" color="primary">
              <CopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print report">
            <IconButton onClick={handlePrint} size="small" color="primary">
              <PrintIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

/**
 * 🔍 Extract loop index from reference ID
 */
function extractLoopIndex(referenceId: string): number | null {
  const loopRegex = /loop-(\d+)/;
  const loopMatch = loopRegex.exec(referenceId);
  return loopMatch?.[1] ? Number.parseInt(loopMatch[1], 10) : null;
}

/**
 * 🔍 Extract cut-set index from reference ID
 */
function extractCutsetIndex(referenceId: string): number | null {
  const cutsetRegex = /cutset-(\d+)/;
  const cutsetMatch = cutsetRegex.exec(referenceId);
  return cutsetMatch?.[1] ? Number.parseInt(cutsetMatch[1], 10) : null;
}

/**
 * 🔍 Generic highlight function for loops and cut-sets
 */
function highlightElement(
  index: number,
  visualizationData: GraphVisualizationData,
  setHighlightedElements: (ids: string[]) => void,
  type: "loop" | "cutset"
): boolean {
  const caller = `highlight${type === "loop" ? "Loop" : "Cutset"}`;
  const element =
    type === "loop" ? visualizationData.loopDefinitions?.[index] : visualizationData.cutSetDefinitions?.[index];

  if (!element) {
    return false;
  }

  setHighlightedElements(element.branchIds);
  logger.info({ caller }, `Highlighted ${type}`, {
    [`${type}Index`]: index,
    branchIds: element.branchIds,
  });
  return true;
}

/**
 * 🎨 Custom markdown components with MUI styling
 */
function useMarkdownComponents() {
  const { setHighlightedElements, visualizationData } = usePresentation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  /**
   * 📋 Copy equation to clipboard
   */
  const handleCopyEquation = useCallback((equation: string) => {
    const caller = "handleCopyEquation";
    logger.debug({ caller }, "Copying equation to clipboard");

    navigator.clipboard
      .writeText(equation)
      .then(() => {
        setSnackbarOpen(true);
        logger.info({ caller }, "Equation copied successfully");
      })
      .catch((err: unknown) => {
        logger.error({ caller }, "Failed to copy equation", err);
      });
  }, []);

  /**
   * 🔍 Handle click on loop/cut-set reference
   */
  const handleReferenceClick = useCallback(
    (referenceId: string) => {
      const caller = "handleReferenceClick";
      logger.debug({ caller }, "Clicked on reference", { referenceId });

      // Try to highlight loop
      const loopIndex = extractLoopIndex(referenceId);
      if (loopIndex === null || !highlightElement(loopIndex, visualizationData, setHighlightedElements, "loop")) {
        // Try to highlight cut-set if loop highlighting failed
        const cutsetIndex = extractCutsetIndex(referenceId);
        if (cutsetIndex !== null) {
          highlightElement(cutsetIndex, visualizationData, setHighlightedElements, "cutset");
        }
      }
    },
    [visualizationData, setHighlightedElements]
  );

  /**
   * 🔒 Close snackbar
   */
  const handleCloseSnackbar = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  return useMemo(
    () => ({
      components: {
        // Headers with MUI Typography
        h1: ({ children }: { children?: React.ReactNode }) => (
          <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 3, mb: 2 }}>
            {children}
          </Typography>
        ),
        h2: ({ children }: { children?: React.ReactNode }) => (
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2.5, mb: 1.5 }}>
            {children}
          </Typography>
        ),
        h3: ({ children }: { children?: React.ReactNode }) => (
          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2, mb: 1 }}>
            {children}
          </Typography>
        ),
        // Paragraphs with proper spacing
        p: ({ children }: { children?: React.ReactNode }) => (
          <Typography variant="body1" component="p" sx={{ mb: 2 }}>
            {children}
          </Typography>
        ),
        // Code blocks with copy button
        code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) => {
          if (inline) {
            return (
              <Typography
                component="code"
                sx={{
                  bgcolor: "action.hover",
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  fontFamily: "monospace",
                  fontSize: "0.9em",
                }}
              >
                {children}
              </Typography>
            );
          }

          const codeText = typeof children === "string" ? children : "";
          return (
            <Box sx={{ position: "relative", mb: 2 }}>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  bgcolor: "action.hover",
                  fontFamily: "monospace",
                  fontSize: "0.9em",
                  overflow: "auto",
                }}
              >
                <pre style={{ margin: 0 }}>{children}</pre>
              </Paper>
              <Tooltip title="Copy equation">
                <IconButton
                  size="small"
                  onClick={() => {
                    handleCopyEquation(codeText);
                  }}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                  }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
        // Links with click handling for references
        a: ({ href, children }: { href?: string | undefined; children?: React.ReactNode }) => {
          const isReference = href?.startsWith("#loop-") || href?.startsWith("#cutset-");

          if (isReference && href) {
            return (
              <Typography
                component="span"
                onClick={() => {
                  handleReferenceClick(href.substring(1));
                }}
                sx={{
                  color: "primary.main",
                  cursor: "pointer",
                  textDecoration: "underline",
                  "&:hover": {
                    color: "primary.dark",
                  },
                }}
              >
                {children}
              </Typography>
            );
          }

          return (
            <Typography
              component="a"
              href={href ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: "primary.main",
                textDecoration: "underline",
              }}
            >
              {children}
            </Typography>
          );
        },
        // Lists with proper spacing
        ul: ({ children }: { children?: React.ReactNode }) => (
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            {children}
          </Box>
        ),
        ol: ({ children }: { children?: React.ReactNode }) => (
          <Box component="ol" sx={{ pl: 3, mb: 2 }}>
            {children}
          </Box>
        ),
        li: ({ children }: { children?: React.ReactNode }) => (
          <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
            {children}
          </Typography>
        ),
        // Horizontal rule
        hr: () => <Divider sx={{ my: 3 }} />,
        // Blockquote
        blockquote: ({ children }: { children?: React.ReactNode }) => (
          <Paper
            elevation={0}
            sx={{
              pl: 2,
              py: 1,
              my: 2,
              borderLeft: 4,
              borderColor: "primary.main",
              bgcolor: "action.hover",
            }}
          >
            {children}
          </Paper>
        ),
      },
      snackbar: (
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={2000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleCloseSnackbar} severity="success" variant="filled">
            Equation copied to clipboard
          </Alert>
        </Snackbar>
      ),
    }),
    [handleCopyEquation, handleReferenceClick, snackbarOpen, handleCloseSnackbar]
  );
}

/**
 * 📈 Main Results Display Component
 */
export function ResultsDisplay() {
  const { markdownOutput } = usePresentation();
  const { components, snackbar } = useMarkdownComponents();

  const containerStyle = useMemo(
    () => ({
      height: "100%",
      overflow: "auto",
      bgcolor: "background.default",
    }),
    []
  );

  const contentStyle = useMemo(
    () => ({
      p: 3,
      maxWidth: "900px",
      mx: "auto",
    }),
    []
  );

  const emptyStateStyle = useMemo(
    () => ({
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: "text.secondary",
    }),
    []
  );

  // Show empty state if no markdown output
  if (!markdownOutput) {
    return (
      <Box sx={containerStyle}>
        <ResultsHeader />
        <Box sx={emptyStateStyle}>
          <Typography variant="h6" gutterBottom>
            No Results Yet
          </Typography>
          <Typography variant="body2">Click "Run Analysis" to see the step-by-step solution</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={containerStyle}>
      <ResultsHeader />
      <Box sx={contentStyle}>
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]} components={components}>
          {markdownOutput}
        </ReactMarkdown>
      </Box>
      {snackbar}
    </Box>
  );
}
