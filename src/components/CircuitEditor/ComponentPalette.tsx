/**
 * ComponentPalette component.
 * Provides draggable circuit components that can be dropped onto the canvas.
 * Displays resistor, voltage source, and current source options.
 */

import { Box, Paper, Typography, Stack, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Component type identifier for drag-and-drop.
 */
type ComponentType = 'resistor' | 'voltageSource' | 'currentSource';

/**
 * Palette item configuration.
 */
interface PaletteItem {
  type: ComponentType;
  label: string;
  icon: string;
  description: string;
}

/**
 * Available components in the palette.
 */
const paletteItems: PaletteItem[] = [
  {
    type: 'resistor',
    label: 'Resistor',
    icon: '⚡',
    description: 'Add a resistor component',
  },
  {
    type: 'voltageSource',
    label: 'Voltage Source',
    icon: '🔋',
    description: 'Add a voltage source',
  },
  {
    type: 'currentSource',
    label: 'Current Source',
    icon: '⚡',
    description: 'Add a current source',
  },
];

/**
 * Individual draggable palette item component.
 */
function PaletteItemComponent({ item }: { readonly item: PaletteItem }) {
  const theme = useTheme();

  /**
   * Handle drag start event.
   * Sets the component type data for the drop handler.
   */
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    // Set the component type in the drag data
    // cspell:ignore reactflow
    event.dataTransfer.setData('application/reactflow', item.type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Tooltip title={item.description} placement="right">
      <Paper
        draggable
        onDragStart={onDragStart}
        sx={{
          p: 2,
          cursor: 'grab',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: 'action.hover',
            transform: 'scale(1.05)',
          },
          '&:active': {
            cursor: 'grabbing',
          },
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h4" component="div">
          {item.icon}
        </Typography>
        <Typography variant="caption" align="center">
          {item.label}
        </Typography>
      </Paper>
    </Tooltip>
  );
}

/**
 * ComponentPalette component.
 * Sidebar containing draggable circuit components.
 */
export function ComponentPalette() {
  return (
    <Box
      sx={{
        width: 120,
        height: '100%',
        p: 2,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        overflowY: 'auto',
      }}
    >
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
        Components
      </Typography>
      <Stack spacing={2}>
        {paletteItems.map((item) => (
          <PaletteItemComponent key={item.type} item={item} />
        ))}
      </Stack>
    </Box>
  );
}
