/**
 * 🚨 Calculation Error Dialog Component
 *
 * Displays calculation errors in a modal dialog with technical details.
 * Includes collapsible stack trace and copy functionality.
 */

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Collapse,
  IconButton,
  Alert,
  Snackbar,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon, ContentCopy as ContentCopyIcon } from "@mui/icons-material";
import { logger } from "../../utils/logger";

/**
 * Props for CalculationErrorDialog component.
 */
export interface CalculationErrorDialogProps {
  /** Whether the dialog is open */
  readonly open: boolean;
  /** Error message to display */
  readonly errorMessage: string;
  /** Optional technical details or stack trace */
  readonly technicalDetails?: string;
  /** Callback when dialog is closed */
  readonly onClose: () => void;
}

/**
 * 📋 Generate error report text for clipboard
 */
function generateErrorReport(errorMessage: string, technicalDetails?: string): string {
  const errorReport = [
    "Circuit Analysis Error Report",
    "============================",
    "",
    "Error Message:",
    errorMessage,
    "",
  ];

  if (technicalDetails) {
    errorReport.push("Technical Details:", technicalDetails, "");
  }

  errorReport.push("Timestamp:", new Date().toISOString());

  return errorReport.join("\n");
}

/**
 * 💡 Error suggestions component
 */
function ErrorSuggestions() {
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The circuit analysis calculation encountered an error. This may be due to:
      </Typography>

      <Box component="ul" sx={{ pl: 3, mt: 1, mb: 2 }}>
        <Typography component="li" variant="body2" color="text.secondary">
          Singular matrix (circuit has no unique solution)
        </Typography>
        <Typography component="li" variant="body2" color="text.secondary">
          Numerical instability (extreme component values)
        </Typography>
        <Typography component="li" variant="body2" color="text.secondary">
          Invalid circuit topology
        </Typography>
      </Box>
    </>
  );
}

/**
 * 🔽 Technical details section with collapsible content
 */
function TechnicalDetailsSection({
  technicalDetails,
  showDetails,
  onToggle,
}: {
  readonly technicalDetails: string;
  readonly showDetails: boolean;
  readonly onToggle: () => void;
}) {
  const detailsButtonStyle = useMemo(
    () => ({
      transform: showDetails ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.3s",
    }),
    [showDetails]
  );

  const technicalDetailsBoxStyle = useMemo(
    () => ({
      mt: 2,
      p: 2,
      bgcolor: "grey.900",
      color: "grey.100",
      borderRadius: 1,
      fontFamily: "monospace",
      fontSize: "0.875rem",
      overflow: "auto",
      maxHeight: "300px",
    }),
    []
  );

  return (
    <Box>
      <Button
        onClick={onToggle}
        startIcon={
          <IconButton size="small" sx={detailsButtonStyle}>
            <ExpandMoreIcon />
          </IconButton>
        }
        sx={{ mb: 1 }}
      >
        {showDetails ? "Hide" : "Show"} Technical Details
      </Button>

      <Collapse in={showDetails}>
        <Box sx={technicalDetailsBoxStyle}>
          <Typography variant="body2" component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {technicalDetails}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * 🚨 CalculationErrorDialog - Shows calculation errors with technical details
 *
 * Features:
 * - Modal dialog for calculation errors
 * - Error message and technical details
 * - Collapsible stack trace section
 * - "Copy Error" button for bug reports
 * - "Close" button to dismiss
 */
export function CalculationErrorDialog({ open, errorMessage, technicalDetails, onClose }: CalculationErrorDialogProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  /**
   * 📋 Copy error details to clipboard
   */
  const handleCopyError = useCallback(() => {
    const reportText = generateErrorReport(errorMessage, technicalDetails);

    navigator.clipboard
      .writeText(reportText)
      .then(() => {
        logger.info({ caller: "CalculationErrorDialog" }, "Error report copied to clipboard");
        setShowCopySuccess(true);
      })
      .catch((err: unknown) => {
        logger.error({ caller: "CalculationErrorDialog" }, "Failed to copy error report", err);
      });
  }, [errorMessage, technicalDetails]);

  /**
   * 🔽 Toggle technical details visibility
   */
  const handleToggleDetails = useCallback(() => {
    setShowDetails(prev => !prev);
  }, []);

  /**
   * ❌ Close the dialog
   */
  const handleClose = useCallback(() => {
    setShowDetails(false);
    onClose();
  }, [onClose]);

  /**
   * 🔔 Close the success snackbar
   */
  const handleCloseSnackbar = useCallback(() => {
    setShowCopySuccess(false);
  }, []);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        aria-labelledby="calculation-error-dialog-title"
      >
        <DialogTitle id="calculation-error-dialog-title">Calculation Error</DialogTitle>

        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              {errorMessage}
            </Typography>
          </Alert>

          <ErrorSuggestions />

          {technicalDetails && (
            <TechnicalDetailsSection
              technicalDetails={technicalDetails}
              showDetails={showDetails}
              onToggle={handleToggleDetails}
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCopyError} startIcon={<ContentCopyIcon />} color="inherit">
            Copy Error
          </Button>
          <Button onClick={handleClose} variant="contained" autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showCopySuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message="Error report copied to clipboard"
      />
    </>
  );
}
