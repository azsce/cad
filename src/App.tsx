import { useMemo, useCallback } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Box } from "@mui/material";
import { CircuitManagerPane } from "./components/CircuitManager/CircuitManagerPane";
import { CircuitEditorPane } from "./components/CircuitEditor/CircuitEditorPane";
import { AnalysisPaneWrapper } from "./components/AnalysisPane/AnalysisPaneWrapper";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useUIStore } from "./store/uiStore";
import "./App.css";
import { ThemeProvider } from "./contexts/ThemeProvider";

function isValidPanelSizes(sizes: number[]): sizes is [number, number, number] {
  return sizes.length === 3 && sizes[0] !== undefined && sizes[1] !== undefined && sizes[2] !== undefined;
}

interface PanelState {
  isLeftCollapsed: boolean;
  isRightExpanded: boolean;
  isRightCollapsed: boolean;
}

const COLLAPSED_SIZE = 3;

function calculatePanelConfigs(state: PanelState, sizes: { left: number; center: number; right: number }) {
  // Right panel expanded - hide other panels
  if (state.isRightExpanded) {
    return {
      left: { size: 0, minSize: 0, maxSize: 0, collapsible: true },
      center: { size: 0, minSize: 0, maxSize: 100, collapsible: true },
      right: { size: 100, minSize: 100, maxSize: 100, collapsible: false },
    };
  }

  // Both panels collapsed
  if (state.isLeftCollapsed && state.isRightCollapsed) {
    return {
      left: { size: COLLAPSED_SIZE, minSize: COLLAPSED_SIZE, maxSize: COLLAPSED_SIZE, collapsible: true },
      center: { size: 100 - 2 * COLLAPSED_SIZE, minSize: 30, maxSize: 100, collapsible: false },
      right: { size: COLLAPSED_SIZE, minSize: COLLAPSED_SIZE, maxSize: COLLAPSED_SIZE, collapsible: true },
    };
  }

  // Left panel collapsed
  if (state.isLeftCollapsed) {
    const centerSize = 100 - COLLAPSED_SIZE - sizes.right;
    return {
      left: { size: COLLAPSED_SIZE, minSize: COLLAPSED_SIZE, maxSize: COLLAPSED_SIZE, collapsible: true },
      center: { size: centerSize, minSize: 30, maxSize: 100, collapsible: false },
      right: { size: sizes.right, minSize: 20, maxSize: 100, collapsible: false },
    };
  }

  // Right panel collapsed
  if (state.isRightCollapsed) {
    const centerSize = 100 - sizes.left - COLLAPSED_SIZE;
    return {
      left: { size: sizes.left, minSize: 15, maxSize: 30, collapsible: false },
      center: { size: centerSize, minSize: 30, maxSize: 100, collapsible: false },
      right: { size: COLLAPSED_SIZE, minSize: COLLAPSED_SIZE, maxSize: COLLAPSED_SIZE, collapsible: true },
    };
  }

  // Normal state - use saved sizes
  return {
    left: { size: sizes.left, minSize: 15, maxSize: 30, collapsible: false },
    center: { size: sizes.center, minSize: 30, maxSize: 100, collapsible: false },
    right: { size: sizes.right, minSize: 20, maxSize: 100, collapsible: false },
  };
}

function App() {
  const paneSizes = useUIStore(state => state.paneSizes);
  const setPaneSizes = useUIStore(state => state.setPaneSizes);
  const isLeftPanelCollapsed = useUIStore(state => state.isLeftPanelCollapsed);
  const isRightPanelExpanded = useUIStore(state => state.isRightPanelExpanded);
  const isRightPanelCollapsed = useUIStore(state => state.isRightPanelCollapsed);

  const panelState = useMemo<PanelState>(
    () => ({
      isLeftCollapsed: isLeftPanelCollapsed,
      isRightExpanded: isRightPanelExpanded,
      isRightCollapsed: isRightPanelCollapsed,
    }),
    [isLeftPanelCollapsed, isRightPanelExpanded, isRightPanelCollapsed]
  );

  const panelConfigs = useMemo(() => calculatePanelConfigs(panelState, paneSizes), [panelState, paneSizes]);

  const resizeHandleStyle = useMemo(
    () => ({
      width: "4px",
      backgroundColor: "#ccc",
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
    () =>
      `${isRightPanelExpanded ? "expanded" : "normal"}-${isLeftPanelCollapsed ? "left-collapsed" : ""}-${isRightPanelCollapsed ? "right-collapsed" : ""}`,
    [isRightPanelExpanded, isLeftPanelCollapsed, isRightPanelCollapsed]
  );

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Box sx={{ height: "100vh", width: "100vw" }}>
          <PanelGroup key={panelGroupKey} direction="horizontal" onLayout={handleLayout}>
            <Panel
              defaultSize={panelConfigs.left.size}
              minSize={panelConfigs.left.minSize}
              maxSize={panelConfigs.left.maxSize}
              collapsible={panelConfigs.left.collapsible}
            >
              <CircuitManagerPane />
            </Panel>

            <PanelResizeHandle style={resizeHandleStyle} />

            <Panel
              defaultSize={panelConfigs.center.size}
              minSize={panelConfigs.center.minSize}
              collapsible={panelConfigs.center.collapsible}
            >
              <CircuitEditorPane />
            </Panel>

            <PanelResizeHandle style={resizeHandleStyle} />

            <Panel
              defaultSize={panelConfigs.right.size}
              minSize={panelConfigs.right.minSize}
              maxSize={panelConfigs.right.maxSize}
              collapsible={panelConfigs.right.collapsible}
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
