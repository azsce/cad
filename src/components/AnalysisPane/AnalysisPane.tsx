/**
 * 📊 Analysis Pane Component
 * 
 * Main analysis pane with vertical split layout:
 * - Top section (40%): AnalysisControls + GraphVisualization
 * - Bottom section (60%): ErrorDisplay / LoadingSpinner / ResultsDisplay
 * 
 * Consumes ValidationContext, CalculationContext, and PresentationContext.
 */

import { useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useValidation } from '../../contexts/ValidationContext';
import { useCalculation } from '../../contexts/CalculationContext';
import { usePresentation } from '../../contexts/PresentationContext';
import { AnalysisControls } from './AnalysisControls';

/**
 * 🔄 Loading spinner component shown during calculation
 */
function LoadingSpinner() {
  const loadingStyle = useMemo(
    () => ({
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 2,
    }),
    []
  );

  return (
    <Box sx={loadingStyle}>
      <CircularProgress size={48} />
      <Typography variant="body1" color="text.secondary">
        Analyzing circuit...
      </Typography>
    </Box>
  );
}

/**
 * ⚠️ Error display component shown when validation fails
 */
function ErrorDisplay() {
  const { validation } = useValidation();

  const errorStyle = useMemo(
    () => ({
      p: 3,
      height: '100%',
      overflow: 'auto',
    }),
    []
  );

  const errorBoxStyle = useMemo(
    () => ({
      p: 2,
      mb: 2,
      bgcolor: 'error.main',
      color: 'error.contrastText',
      borderRadius: 1,
    }),
    []
  );

  const warningBoxStyle = useMemo(
    () => ({
      p: 2,
      mb: 2,
      bgcolor: 'warning.main',
      color: 'warning.contrastText',
      borderRadius: 1,
    }),
    []
  );

  return (
    <Box sx={errorStyle}>
      {validation.errors.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Validation Errors
          </Typography>
          {validation.errors.map((error, index) => (
            <Box key={index} sx={errorBoxStyle}>
              <Typography variant="body2">{error}</Typography>
            </Box>
          ))}
        </Box>
      )}
      {validation.warnings.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Warnings
          </Typography>
          {validation.warnings.map((warning, index) => (
            <Box key={index} sx={warningBoxStyle}>
              <Typography variant="body2">{warning}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

/**
 * 📈 Results display component (placeholder for now)
 */
function ResultsDisplay() {
  const { markdownOutput } = usePresentation();

  const resultsStyle = useMemo(
    () => ({
      p: 3,
      height: '100%',
      overflow: 'auto',
    }),
    []
  );

  return (
    <Box sx={resultsStyle}>
      <Typography variant="h6" gutterBottom>
        Analysis Results
      </Typography>
      {markdownOutput ? (
        <Box>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
            {markdownOutput}
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Click "Run Analysis" to see results
        </Typography>
      )}
    </Box>
  );
}



/**
 * 🗺️ Graph visualization component (placeholder for now)
 */
function GraphVisualization() {
  const graphStyle = useMemo(
    () => ({
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.paper',
      color: 'text.secondary',
    }),
    []
  );

  return (
    <Box sx={graphStyle}>
      <Typography variant="body2">
        Graph visualization will appear here
      </Typography>
    </Box>
  );
}

/**
 * 📊 Main Analysis Pane component
 */
export function AnalysisPane() {
  const { validation, isValidating } = useValidation();
  const { isCalculating } = useCalculation();

  const topSectionStyle = useMemo(
    () => ({
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    }),
    []
  );

  const bottomSectionStyle = useMemo(
    () => ({
      height: '100%',
      overflow: 'hidden',
      bgcolor: 'background.default',
    }),
    []
  );

  const resizeHandleStyle = useMemo(
    () => ({
      height: '4px',
      bgcolor: 'divider',
      cursor: 'row-resize',
      '&:hover': {
        bgcolor: 'primary.main',
      },
      '&[data-resize-handle-active]': {
        bgcolor: 'primary.main',
      },
    }),
    []
  );

  // Determine what to show in the bottom section
  const renderBottomSection = () => {
    if (isValidating || isCalculating) {
      return <LoadingSpinner />;
    }

    if (!validation.isValid) {
      return <ErrorDisplay />;
    }

    return <ResultsDisplay />;
  };

  return (
    <PanelGroup direction="vertical">
      <Panel defaultSize={40} minSize={20} maxSize={60}>
        <Box sx={topSectionStyle}>
          <AnalysisControls />
          <GraphVisualization />
        </Box>
      </Panel>

      <PanelResizeHandle>
        <Box sx={resizeHandleStyle} />
      </PanelResizeHandle>

      <Panel defaultSize={60} minSize={40} maxSize={80}>
        <Box sx={bottomSectionStyle}>
          {renderBottomSection()}
        </Box>
      </Panel>
    </PanelGroup>
  );
}
