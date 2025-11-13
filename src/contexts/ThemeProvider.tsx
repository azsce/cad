import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  CssBaseline,
  type PaletteMode,
} from '@mui/material';
import { THEME_STORAGE_KEY, ThemeContext } from './ThemeContext';

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  // Initialize theme from localStorage or system preference
  const [mode, setMode] = useState<PaletteMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // Default to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                margin: 0,
                padding: 0,
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
              },
            },
          },
        },
      }),
    [mode]
  );

  const contextValue = useMemo(
    () => ({ mode, toggleTheme }),
    [mode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
