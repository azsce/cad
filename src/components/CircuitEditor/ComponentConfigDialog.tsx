/**
 * ComponentConfigDialog component.
 * Dialog for configuring component properties (ID and value) when dropped onto canvas.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
  Stack,
  Box,
} from '@mui/material';
import type { ComponentData } from '../../types/circuit';

/**
 * Component type for configuration.
 */
type ComponentType = 'resistor' | 'voltageSource' | 'currentSource';

/**
 * Props for ComponentConfigDialog.
 */
interface ComponentConfigDialogProps {
  /** Whether the dialog is open */
  readonly open: boolean;
  /** Component type being configured */
  readonly componentType: ComponentType | null;
  /** Callback when configuration is confirmed */
  readonly onConfirm: (id: string, data: ComponentData) => void;
  /** Callback when dialog is cancelled */
  readonly onCancel: () => void;
}

/**
 * Get default value for a component type.
 */
function getDefaultValue(type: ComponentType): number {
  switch (type) {
    case 'resistor':
      return 1000; // 1kΩ
    case 'voltageSource':
      return 5; // 5V
    case 'currentSource':
      return 0.001; // 1mA
  }
}

/**
 * Get label for component type.
 */
function getComponentLabel(type: ComponentType): string {
  switch (type) {
    case 'resistor':
      return 'Resistor';
    case 'voltageSource':
      return 'Voltage Source';
    case 'currentSource':
      return 'Current Source';
  }
}

/**
 * Get unit for component type.
 */
function getComponentUnit(type: ComponentType): string {
  switch (type) {
    case 'resistor':
      return 'Ω';
    case 'voltageSource':
      return 'V';
    case 'currentSource':
      return 'A';
  }
}

/**
 * Get helper text for value input.
 */
function getValueHelperText(type: ComponentType): string {
  if (type === 'resistor') {
    return 'Enter the resistance value';
  }
  if (type === 'voltageSource') {
    return 'Enter the voltage value';
  }
  return 'Enter the current value';
}

/**
 * ComponentConfigDialog component.
 * Opens when a component is dropped to configure its properties.
 */
/**
 * Generate default component ID.
 */
function generateDefaultId(type: ComponentType): string {
  const timestamp = Date.now().toString().slice(-6);
  const typePrefix = type.charAt(0).toUpperCase();
  return `${typePrefix}${timestamp}`;
}

/**
 * Inner dialog component that resets when key changes.
 */
function DialogContent_({
  componentType,
  onConfirm,
  onCancel,
}: {
  readonly componentType: ComponentType;
  readonly onConfirm: (id: string, data: ComponentData) => void;
  readonly onCancel: () => void;
}) {
  const [componentId, setComponentId] = useState(() => generateDefaultId(componentType));
  const [value, setValue] = useState(() => getDefaultValue(componentType).toString());

  /**
   * Handle form submission.
   */
  const handleConfirm = () => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      return; // Invalid value
    }

    // Create component data based on type
    let data: ComponentData;
    if (componentType === 'resistor') {
      data = {
        value: numericValue,
        label: componentId,
      };
    } else {
      // voltageSource or currentSource
      data = {
        value: numericValue,
        direction: 'up',
        label: componentId,
      };
    }

    onConfirm(componentId, data);
  };

  /**
   * Handle Enter key press.
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        label="Component ID"
        value={componentId}
        onChange={(e) => {
          setComponentId(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        fullWidth
        autoFocus
        helperText="Unique identifier for this component"
      />
      <TextField
        label={`Value (${getComponentUnit(componentType)})`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        type="number"
        fullWidth
        helperText={getValueHelperText(componentType)}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained"
          disabled={!componentId || !value || isNaN(parseFloat(value))}
        >
          Add Component
        </Button>
      </Box>
    </Stack>
  );
}

export function ComponentConfigDialog({
  open,
  componentType,
  onConfirm,
  onCancel,
}: ComponentConfigDialogProps) {
  if (!componentType) return null;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>
        Configure {getComponentLabel(componentType)}
      </DialogTitle>
      <DialogContent>
        {/* Use key to reset component state when type changes */}
        <DialogContent_ 
          key={componentType}
          componentType={componentType}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
