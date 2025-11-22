/**
 * 📭 Empty State Component
 *
 * Displays a friendly message when no circuit is selected.
 * Uses MUI Box with centered content and icon.
 */

import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { AccountTree as CircuitIcon } from "@mui/icons-material";

/**
 * Props for EmptyState component.
 */
export interface EmptyStateProps {
  /** Optional custom message to display */
  readonly message?: string;
}

/**
 * 📭 EmptyState - Shows when no circuit is selected
 *
 * Features:
 * - Centered content with icon
 * - Friendly message
 * - Subtle styling
 */
export function EmptyState({ message = "Select or create a circuit to begin" }: EmptyStateProps) {
  const containerStyle = useMemo(
    () => ({
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      gap: 2,
      p: 4,
      color: "text.secondary",
    }),
    []
  );

  const iconStyle = useMemo(
    () => ({
      fontSize: 80,
      opacity: 0.3,
      mb: 1,
    }),
    []
  );

  return (
    <Box sx={containerStyle}>
      <CircuitIcon sx={iconStyle} />
      <Typography variant="h6" color="text.secondary" align="center" sx={{ fontWeight: 400 }}>
        {message}
      </Typography>
      <Typography variant="body2" color="text.disabled" align="center" sx={{ maxWidth: 400 }}>
        Use the circuit manager on the left to create a new circuit or select an existing one. Then use the editor to
        design your circuit and run analysis.
      </Typography>
    </Box>
  );
}
