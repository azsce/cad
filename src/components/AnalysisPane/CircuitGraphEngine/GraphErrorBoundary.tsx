/**
 * 🛡️ Error Boundary for Circuit Graph Renderer
 * 
 * Catches rendering errors in the CircuitGraphRenderer and displays
 * a fallback UI with retry functionality.
 */

import { Component, type ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";
import { logger } from "../../../utils/logger";

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 🛡️ GraphErrorBoundary - Catches and handles graph rendering errors
 */
export class GraphErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    logger.error(
      { caller: "GraphErrorBoundary" },
      "Graph rendering error",
      { error, errorInfo }
    );
  }

  /**
   * 🔄 Handle retry button click
   */
  handleRetry = (): void => {
    const { onRetry } = this.props;
    
    // Reset error state
    this.setState({ hasError: false, error: null });
    
    // Call optional retry callback
    onRetry?.();
  };

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    return hasError ? (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          p: 3,
          textAlign: "center",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <Typography variant="h6" gutterBottom color="error">
          Graph Visualization Unavailable
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {error?.message || "An error occurred while rendering the graph"}
        </Typography>
        <Button variant="contained" onClick={this.handleRetry} size="small">
          Retry
        </Button>
      </Box>
    ) : (
      <>{children}</>
    );
  }
}
