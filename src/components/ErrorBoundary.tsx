import { Component, type ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";
import { logger } from "../utils/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    logger.error({ caller: "ErrorBoundary" }, "Error caught by boundary", { error, errorInfo });
  }

  componentDidMount() {
    // Catch uncaught errors (like ReferenceError)
    globalThis.addEventListener("error", this.handleWindowError);

    // Catch unhandled promise rejections
    globalThis.addEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  componentWillUnmount() {
    globalThis.removeEventListener("error", this.handleWindowError);
    globalThis.removeEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  handleWindowError = (event: ErrorEvent): void => {
    // Ignore ResizeObserver errors (known React Flow issue, harmless)
    if (event.message.includes("ResizeObserver")) {
      return;
    }

    const errorValue: unknown = event.error;
    logger.error({ caller: "ErrorBoundary" }, "Uncaught error", { error: errorValue });
    const errorObj = errorValue instanceof Error ? errorValue : new Error(event.message);
    this.setState({
      hasError: true,
      error: errorObj,
    });
    event.preventDefault();
  };

  handlePromiseRejection = (event: PromiseRejectionEvent): void => {
    const reasonValue: unknown = event.reason;
    logger.error({ caller: "ErrorBoundary" }, "Unhandled promise rejection", { reason: reasonValue });
    this.setState({
      hasError: true,
      error: reasonValue instanceof Error ? reasonValue : new Error(String(reasonValue)),
    });
    event.preventDefault();
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
          height: "100vh",
          p: 4,
          textAlign: "center",
        }}
      >
        <Typography variant="h4" gutterBottom>
          Something went wrong
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {error?.message || "An unexpected error occurred"}
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            globalThis.location.reload();
          }}
        >
          Reload Application
        </Button>
      </Box>
    ) : (
      <>{children}</>
    );
  }
}
