/**
 * ComponentConfigDialog component.
 * Dialog for configuring component properties (ID and value) when dropped onto canvas.
 */

import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, Button, TextField, Stack, Box } from "@mui/material";
import { logger } from "../../utils/logger";
import type { ComponentData } from "../../types/circuit";

/**
 * Component type for configuration.
 */
type ComponentType = "resistor" | "voltageSource" | "currentSource";

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
 * Component configuration metadata.
 */
interface ComponentConfig {
  readonly defaultValue: number;
  readonly label: string;
  readonly unit: string;
  readonly helperText: string;
  readonly idPrefix: string;
}

/**
 * Configuration metadata for each component type.
 */
const COMPONENT_CONFIGS: Record<ComponentType, ComponentConfig> = {
  resistor: {
    defaultValue: 1000, // 1kΩ
    label: "Resistor",
    unit: "Ω",
    helperText: "Enter the resistance value",
    idPrefix: "R",
  },
  voltageSource: {
    defaultValue: 5, // 5V
    label: "Voltage Source",
    unit: "V",
    helperText: "Enter the voltage value",
    idPrefix: "V",
  },
  currentSource: {
    defaultValue: 0.001, // 1mA
    label: "Current Source",
    unit: "A",
    helperText: "Enter the current value",
    idPrefix: "I",
  },
};

/**
 * ComponentConfigDialog component.
 * Opens when a component is dropped to configure its properties.
 */
/**
 * Generate default component ID.
 */
const generateDefaultId = (type: ComponentType): string => {
  const timestamp = Date.now().toString().slice(-6);
  const config = COMPONENT_CONFIGS[type];
  return `${config.idPrefix}${timestamp}`;
};

/**
 * Inner dialog component that resets when key changes.
 */
function DialogContentInner({
  componentType,
  onConfirm,
  onCancel,
}: {
  readonly componentType: ComponentType;
  readonly onConfirm: (id: string, data: ComponentData) => void;
  readonly onCancel: () => void;
}) {
  const config = useMemo(() => COMPONENT_CONFIGS[componentType], [componentType]);

  const [componentId, setComponentId] = useState(() => generateDefaultId(componentType));
  const [value, setValue] = useState(() => config.defaultValue.toString());

  /**
   * Handle form submission.
   */
  const handleConfirm = useCallback(() => {
    logger.debug({ caller: "ComponentConfigDialog" }, "Add Component button clicked", { componentId, value });

    const numericValue = Number.parseFloat(value);
    if (Number.isNaN(numericValue)) {
      logger.error({ caller: "ComponentConfigDialog" }, "Invalid numeric value", { value });
      return; // Invalid value
    }

    // Create component data based on type
    let data: ComponentData;
    if (componentType === "resistor") {
      data = {
        value: numericValue,
        label: componentId,
      };
    } else {
      // voltageSource or currentSource
      data = {
        value: numericValue,
        direction: "up",
        label: componentId,
      };
    }

    logger.debug({ caller: "ComponentConfigDialog" }, "Created component data, calling onConfirm", { data });
    onConfirm(componentId, data);
  }, [componentId, value, componentType, onConfirm]);

  /**
   * Handle Enter key press.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        handleConfirm();
      }
    },
    [handleConfirm]
  );

  const isDisabled = useMemo(() => {
    return !componentId || !value || Number.isNaN(Number.parseFloat(value));
  }, [componentId, value]);

  const valueLabel = useMemo(() => {
    return `Value (${config.unit})`;
  }, [config.unit]);

  const helperText = useMemo(() => {
    return config.helperText;
  }, [config.helperText]);

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        label="Component ID"
        value={componentId}
        onChange={e => {
          setComponentId(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        fullWidth
        autoFocus
        helperText="Unique identifier for this component"
      />
      <TextField
        label={valueLabel}
        value={value}
        onChange={e => {
          setValue(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        type="number"
        fullWidth
        helperText={helperText}
      />
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={isDisabled}>
          Add Component
        </Button>
      </Box>
    </Stack>
  );
}

export function ComponentConfigDialog({ open, componentType, onConfirm, onCancel }: ComponentConfigDialogProps) {
  const dialogTitle = useMemo(() => {
    if (!componentType) return "";
    const config = COMPONENT_CONFIGS[componentType];
    return `Configure ${config.label}`;
  }, [componentType]);

  if (!componentType) return null;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent>
        {/* Use key to reset component state when type changes */}
        <DialogContentInner
          key={componentType}
          componentType={componentType}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
