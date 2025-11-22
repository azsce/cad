/**
 * ConnectionModeIndicator component - shows status when in connection mode
 */

import { memo } from "react";
import { Paper, Typography, Fade, useTheme } from "@mui/material";

interface ConnectionModeIndicatorProps {
  isConnecting: boolean;
}

export const ConnectionModeIndicator = memo(({ isConnecting }: ConnectionModeIndicatorProps) => {
  const theme = useTheme();

  return (
    <Fade in={isConnecting}>
      <Paper
        elevation={3}
        sx={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          px: 3,
          py: 1.5,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          borderRadius: 2,
          zIndex: 1000,
          pointerEvents: "none",
        }}
      >
        <Typography variant="body2" fontWeight="medium">
          Connection Mode - Click to add waypoints, click handle to connect, ESC to cancel
        </Typography>
      </Paper>
    </Fade>
  );
});

ConnectionModeIndicator.displayName = "ConnectionModeIndicator";
