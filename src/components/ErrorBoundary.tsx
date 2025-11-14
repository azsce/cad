import { Component, type ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

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
    console.error('Error caught by boundary:', error, errorInfo);
  }

  componentDidMount() {
    // Catch uncaught errors (like ReferenceError)
    window.addEventListener('error', this.handleWindowError);
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  handleWindowError = (event: ErrorEvent) => {
    // Ignore ResizeObserver errors (known React Flow issue, harmless)
    if (event.message?.includes('ResizeObserver')) {
      return;
    }
    
    console.error('Uncaught error:', event.error);
    this.setState({
      hasError: true,
      error: event.error || new Error(event.message),
    });
    event.preventDefault();
  };

  handlePromiseRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason);
    this.setState({
      hasError: true,
      error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
    });
    event.preventDefault();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button variant="contained" onClick={() => { window.location.reload(); }}>
            Reload Application
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
