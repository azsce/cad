/* eslint-disable sonarjs/function-return-type */
/**
 * Hook for generating React Flow canvas styles based on connection state
 */

import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { logger } from '../../../utils/logger';

// Create a pencil cursor using base64-encoded SVG
const PENCIL_CURSOR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#FFB300"/><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#FFA000"/><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="none" stroke="#000" stroke-width="0.5"/><circle cx="3" cy="21" r="1.5" fill="#424242"/></svg>';
const PENCIL_CURSOR_BASE64 = btoa(PENCIL_CURSOR_SVG);
const PENCIL_CURSOR = `url("data:image/svg+xml;base64,${PENCIL_CURSOR_BASE64}") 2 22, crosshair`;

/**
 * 🎨 Generate base styles for React Flow canvas
 */
function getBaseStyles(isConnecting: boolean, theme: Theme) {
  return {
    flex: 1,
    height: '100%',
    '& .react-flow__pane': {
      cursor: isConnecting ? PENCIL_CURSOR : 'default',
    },
    '& .react-flow__controls': {
      button: {
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
      },
    },
    '& .react-flow__handle': {
      cursor: isConnecting ? 'pointer' : 'crosshair',
      transition: 'all 0.2s ease',
    },
  };
}

/**
 * 🔗 Generate styles for connection mode
 */
function getConnectingStyles(theme: Theme) {
  return {
    '& .react-flow__handle': {
      width: '12px !important',
      height: '12px !important',
      border: `2px solid ${theme.palette.primary.main}`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        width: '16px !important',
        height: '16px !important',
        backgroundColor: theme.palette.primary.main,
        boxShadow: `0 0 8px ${theme.palette.primary.main}`,
      },
    },
    '& .react-flow__node': {
      opacity: 0.5,
      pointerEvents: 'none',
    },
    '& .react-flow__node .react-flow__handle': {
      pointerEvents: 'all',
      opacity: 1,
    },
    '& .react-flow__edge': {
      opacity: 0.5,
      pointerEvents: 'all', // ✅ Enable edge clicks during connection mode for wire-to-wire connections
      cursor: 'pointer',
      '&:hover': {
        opacity: 0.8,
        strokeWidth: '3px',
      },
    },
    '& .react-flow__controls': {
      opacity: 0.5,
    },
    '& .react-flow__minimap': {
      opacity: 0.5,
    },
  };
}

/**
 * 🎨 Generate React Flow canvas styles
 */
function generateReactFlowStyles(isConnecting: boolean, theme: Theme): SxProps<Theme> {
  logger.debug({ caller: 'useReactFlowStyles' }, 'generateReactFlowStyles called', { 
    isConnecting, 
    cursor: isConnecting ? 'pencil' : 'default',
    pencilCursorLength: PENCIL_CURSOR.length,
  });
  
  const baseStyles = getBaseStyles(isConnecting, theme);
  const connectingStyles = isConnecting ? getConnectingStyles(theme) : {};

  return {
    ...baseStyles,
    ...connectingStyles,
  };
}

export const useReactFlowStyles = (isConnecting: boolean): SxProps<Theme> => {
  const theme = useTheme();
  
  logger.debug({ caller: 'useReactFlowStyles' }, 'Hook called', { isConnecting });
  
  return useMemo(() => generateReactFlowStyles(isConnecting, theme), [isConnecting, theme]);
};
