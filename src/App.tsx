import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Box } from '@mui/material';
import { CircuitManagerPane } from './components/CircuitManager/CircuitManagerPane';
import { CircuitEditorPane } from './components/CircuitEditor/CircuitEditorPane';
import { AnalysisPaneWrapper } from './components/AnalysisPane/AnalysisPaneWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';
import { ThemeProvider } from './contexts/ThemeProvider';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Box sx={{ height: '100vh', width: '100vw' }}>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={20} minSize={15} maxSize={30}>
              <CircuitManagerPane />
            </Panel>

            <PanelResizeHandle style={{ width: '4px', backgroundColor: '#ccc' }} />

            <Panel defaultSize={50} minSize={30}>
              <CircuitEditorPane />
            </Panel>

            <PanelResizeHandle style={{ width: '4px', backgroundColor: '#ccc' }} />

            <Panel defaultSize={30} minSize={20}>
              <AnalysisPaneWrapper />
            </Panel>
          </PanelGroup>
        </Box>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
