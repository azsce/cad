/**
 * 🔄 Loading Spinner Component
 *
 * Displays a centered loading spinner with message during analysis.
 * Uses MUI CircularProgress component.
 */

import { useMemo } from "react";
import { Box, CircularProgress, Typography, LinearProgress } from "@mui/material";

/**
 * Props for LoadingSpinner component.
 */
export interface LoadingSpinnerProps {
  /** Optional message to display below spinner */
  readonly message?: string;
  /** Optional progress percentage (0-100) */
  readonly progress?: number;
}

/**
 * 🔄 LoadingSpinner - Shows loading state during analysis
 *
 * Features:
 * - Centered circular progress indicator
 * - Customizable message
 * - Optional progress percentage
 * - Smooth animations
 */
export function LoadingSpinner({ message = "Analyzing circuit...", progress }: LoadingSpinnerProps) {
  const containerStyle = useMemo(
    () => ({
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      gap: 2,
      p: 3,
    }),
    []
  );

  const progressContainerStyle = useMemo(
    () => ({
      width: "100%",
      maxWidth: "400px",
      mt: 1,
    }),
    []
  );

  const hasProgress = typeof progress === "number" && progress >= 0 && progress <= 100;

  return (
    <Box sx={containerStyle}>
      {hasProgress ? (
        <CircularProgress variant="determinate" value={progress} size={64} thickness={4} />
      ) : (
        <CircularProgress size={64} thickness={4} />
      )}

      <Typography variant="body1" color="text.secondary" align="center">
        {message}
      </Typography>

      {hasProgress && (
        <Box sx={progressContainerStyle}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: "block", mt: 0.5 }}>
            {Math.round(progress)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
}
