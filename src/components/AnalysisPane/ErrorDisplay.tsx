/**
 * ⚠️ Error Display Component
 *
 * Displays validation errors and warnings with helpful suggestions.
 * Uses MUI Alert component with different severity levels.
 */

import { useMemo } from "react";
import { Box, Alert, AlertTitle, Typography, List, ListItem, ListItemText } from "@mui/material";
import type { ValidationResult } from "../../types/analysis";

/**
 * Props for ErrorDisplay component.
 */
export interface ErrorDisplayProps {
  /** Validation result containing errors and warnings */
  readonly validation: ValidationResult;
}

/**
 * 💡 Get helpful suggestion for fixing a specific error
 */
function getSuggestionForError(error: string): string {
  if (error.includes("disconnected") || error.includes("isolated")) {
    return "Connect all components with wires to form a complete circuit.";
  }
  if (error.includes("source")) {
    return "Add at least one voltage source or current source to power the circuit.";
  }
  if (error.includes("voltage") && error.includes("loop")) {
    return "Remove one of the voltage sources or add a resistor to break the loop.";
  }
  if (error.includes("current") && error.includes("cut-set")) {
    return "Ensure current sources are not the only components in a cut-set.";
  }
  return "Review the circuit topology and ensure all connections are valid.";
}

/**
 * ⚠️ ErrorDisplay - Shows validation errors and warnings
 *
 * Features:
 * - Red banner for errors (severity="error")
 * - Yellow banner for warnings (severity="warning")
 * - Bullet point list of issues
 * - Helpful suggestions for fixing errors
 */
export function ErrorDisplay({ validation }: ErrorDisplayProps) {
  const containerStyle = useMemo(
    () => ({
      p: 3,
      height: "100%",
      overflow: "auto",
      display: "flex",
      flexDirection: "column" as const,
      gap: 2,
    }),
    []
  );

  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <Box sx={containerStyle}>
      {hasErrors && (
        <Alert severity="error" variant="filled">
          <AlertTitle>Validation Errors</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            The circuit cannot be analyzed due to the following issues:
          </Typography>
          <List dense sx={{ pl: 2 }}>
            {validation.errors.map(error => (
              <ListItem key={error} sx={{ display: "list-item", listStyleType: "disc", pl: 0 }}>
                <ListItemText
                  primary={error}
                  secondary={getSuggestionForError(error)}
                  slotProps={{
                    primary: { variant: "body2", fontWeight: "medium" },
                    secondary: {
                      variant: "caption",
                      sx: { color: "inherit", opacity: 0.9 },
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {hasWarnings && (
        <Alert severity="warning" variant="filled">
          <AlertTitle>Warnings</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            The circuit can be analyzed, but consider the following:
          </Typography>
          <List dense sx={{ pl: 2 }}>
            {validation.warnings.map(warning => (
              <ListItem key={warning} sx={{ display: "list-item", listStyleType: "disc", pl: 0 }}>
                <ListItemText
                  primary={warning}
                  slotProps={{
                    primary: { variant: "body2" },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {!hasErrors && !hasWarnings && (
        <Alert severity="info" variant="outlined">
          <AlertTitle>No Issues Found</AlertTitle>
          <Typography variant="body2">
            The circuit passed all validation checks. Click "Run Analysis" to begin calculation.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
