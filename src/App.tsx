import { useMemo, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Box } from '@mui/material';
import { CircuitManagerPane } from './components/CircuitManager/CircuitManagerPane';
import { CircuitEditorPane } from './components/CircuitEditor/CircuitEditorPane';
import { AnalysisPaneWrapper } from './components/AnalysisPane/AnalysisPaneWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useUIStore } from './store/uiStore';
import './App.css';
import { ThemeProvider } from './contexts/ThemeProvider';

function isValidPanelSizes(sizes: number[]): sizes is [number, number, number] {
  return (
    sizes.length === 3 &&
    sizes[0] !== undefined &&
    sizes[1] !== undefined &&
    sizes[2] !== undefined
  );
}

interface PanelState {
  isLeftCollapsed: boolean;
  isRightExpanded: boolean;
  isRightCollapsed: boolean;
}

interface PanelSizeConfig {
  size: number;
  minSize: number;
  maxSize: number;
  collapsible: boolean;
}

function calculateLeftPanelConfig(
  state: PanelState,
  defaultSize: number
): PanelSizeConfig {
  if (state.isRightExpanded) {
    return { size: 0, minSize: 0, maxSize: 0, collapsible: true };
  }
  
  if (state.isLeftCollapsed) {
    return { size: 3, minSize: 3, maxSize: 3, collapsible: true };
  }
  
  return { size: defaultSize, minSize: 15, maxSize: 30, collapsible: false };
}

function calculateCenterPanelConfig(
  state: PanelState,
  defaultSize: number
): PanelSizeConfig {
  if (state.isRightExpanded) {
    return { size: 0, minSize: 0, maxSize: 100, collapsible: true };
  }
  
  return { size: defaultSize, minSize: 30, maxSize: 100, collapsible: false };
}

function calculateRightPanelConfig(
  state: PanelState,
  defaultSize: number
): PanelSizeConfig {
  if (state.isRightExpanded) {
    return { size: 100, minSize: 100, maxSize: 100, collapsible: false };
  }
  
  if (state.isRightCollapsed) {
    return { size: 3, minSize: 3, maxSize: 3, collapsible: true };
  }
  
  return { size: defaultSize, minSize: 20, maxSize: 100, collapsible: false };
}

function App() {
  const paneSizes = useUIStore((state) => state.paneSizes);
  const setPaneSizes = useUIStore((state) => state.setPaneSizes);
  const isLeftPanelCollapsed = useUIStore((state) => state.isLeftPanelCollapsed);
  const isRightPanelExpanded = useUIStore((state) => state.isRightPanelExpanded);
  const isRightPanelCollapsed = useUIStore((state) => state.isRightPanelCollapsed);

  const panelState = useMemo<PanelState>(
    () => ({
      isLeftCollapsed: isLeftPanelCollapsed,
      isRightExpanded: isRightPanelExpanded,
      isRightCollapsed: isRightPanelCollapsed,
    }),
    [isLeftPanelCollapsed, isRightPanelExpanded, isRightPanelCollapsed]
  );

  const leftPanelConfig = useMemo(
    () => calculateLeftPanelConfig(panelState, paneSizes.left),
    [panelState, paneSizes.left]
  );

  const centerPanelConfig = useMemo(
    () => calculateCenterPanelConfig(panelState, paneSizes.center),
    [panelState, paneSizes.center]
  );

  const rightPanelConfig = useMemo(
    () => calculateRightPanelConfig(panelState, paneSizes.right),
    [panelState, paneSizes.right]
  );

  const resizeHandleStyle = useMemo(
    () => ({
      width: '4px',
      backgroundColor: '#ccc',
    }),
    []
  );

  const shouldSkipSizeUpdate = useCallback(
    () => isLeftPanelCollapsed || isRightPanelCollapsed || isRightPanelExpanded,
    [isLeftPanelCollapsed, isRightPanelCollapsed, isRightPanelExpanded]
  );

  const handleLayout = useCallback(
    (sizes: number[]) => {
      if (!isValidPanelSizes(sizes)) {
        return;
      }

      // Don't save sizes when panels are in collapsed/expanded state
      // These are temporary sizes that shouldn't overwrite the saved sizes
      if (shouldSkipSizeUpdate()) {
        return;
      }

      const [left, center, right] = sizes;
      setPaneSizes({ left, center, right });
    },
    [setPaneSizes, shouldSkipSizeUpdate]
  );

  const panelGroupKey = useMemo(
    () => `${isRightPanelExpanded ? 'expanded' : 'normal'}-${isLeftPanelCollapsed ? 'left-collapsed' : ''}-${isRightPanelCollapsed ? 'right-collapsed' : ''}`,
    [isRightPanelExpanded, isLeftPanelCollapsed, isRightPanelCollapsed]
  );

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Box sx={{ height: '100vh', width: '100vw' }}>
          <PanelGroup key={panelGroupKey} direction="horizontal" onLayout={handleLayout}>
            <Panel
              defaultSize={leftPanelConfig.size}
              minSize={leftPanelConfig.minSize}
              maxSize={leftPanelConfig.maxSize}
              collapsible={leftPanelConfig.collapsible}
            >
              <CircuitManagerPane />
            </Panel>

            <PanelResizeHandle style={resizeHandleStyle} />

            <Panel
              defaultSize={centerPanelConfig.size}
              minSize={centerPanelConfig.minSize}
              collapsible={centerPanelConfig.collapsible}
            >
              <CircuitEditorPane />
            </Panel>

            <PanelResizeHandle style={resizeHandleStyle} />

            <Panel
              defaultSize={rightPanelConfig.size}
              minSize={rightPanelConfig.minSize}
              maxSize={rightPanelConfig.maxSize}
              collapsible={rightPanelConfig.collapsible}
            >
              <AnalysisPaneWrapper />
            </Panel>
          </PanelGroup>
        </Box>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
