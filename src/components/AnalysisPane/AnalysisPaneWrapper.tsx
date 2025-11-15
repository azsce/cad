import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useMemo } from 'react';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { useUIStore } from '../../store/uiStore';

export function AnalysisPaneWrapper() {
  const isExpanded = useUIStore((state) => state.isRightPanelExpanded);
  const isCollapsed = useUIStore((state) => state.isRightPanelCollapsed);
  const toggleExpand = useUIStore((state) => state.toggleRightPanelExpand);
  const toggleCollapse = useUIStore((state) => state.toggleRightPanelCollapse);

  const containerStyle = useMemo(
    () => ({
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      bgcolor: 'background.default',
      color: 'text.primary',
    }),
    []
  );

  const headerStyle = useMemo(
    () => ({
      p: 2,
      borderBottom: 1,
      borderColor: 'divider',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }),
    []
  );

  const contentStyle = useMemo(
    () => ({
      flex: 1,
      p: 2,
      overflow: 'auto',
    }),
    []
  );

  const collapsedStyle = useMemo(
    () => ({
      height: '100%',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      pt: 2,
      bgcolor: 'background.default',
      color: 'text.primary',
    }),
    []
  );

  if (isCollapsed) {
    return (
      <Box sx={collapsedStyle}>
        <Tooltip title="Expand panel">
          <IconButton onClick={toggleCollapse} size="small">
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={containerStyle}>
      <Box sx={headerStyle}>
        <Typography variant="h6" component="h2">
          Analysis Pane
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={isExpanded ? 'Exit fullscreen' : 'Expand to fullscreen'}>
            <IconButton onClick={toggleExpand} size="small">
              {isExpanded ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Collapse panel">
            <IconButton onClick={toggleCollapse} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={contentStyle}>
        <p>Circuit analysis results will appear here</p>
      </Box>
    </Box>
  );
}
