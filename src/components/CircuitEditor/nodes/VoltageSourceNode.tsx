/**
 * VoltageSourceNode component for React Flow.
 * Renders an SVG voltage source symbol with polarity indicators,
 * two handles (top and bottom terminals), direction toggle button,
 * and an inline editable voltage value input.
 */

import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { TextField, Tooltip, Box, IconButton } from '@mui/material';
import { SwapVert as SwapVertIcon } from '@mui/icons-material';
import { useCircuitStore } from '../../../store/circuitStore';
import type { VoltageSourceData } from '../../../types/circuit';

/**
 * VoltageSourceNode component.
 * Displays a voltage source symbol with editable voltage value and polarity control.
 */
export const VoltageSourceNode = memo(({ id, data }: NodeProps<Node<VoltageSourceData>>) => {
  const updateNode = useCircuitStore((state) => state.updateNode);
  const activeCircuit = useCircuitStore((state) => state.getActiveCircuit());
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.value.toString());

  const direction = data.direction;

  const handleValueChange = useCallback(
    (newValue: string) => {
      const parsed = parseFloat(newValue);
      if (!isNaN(parsed) && parsed > 0 && activeCircuit) {
        updateNode(activeCircuit.id, id, {
          data: { ...data, value: parsed },
        });
      }
    },
    [activeCircuit, data, id, updateNode]
  );

  const handleDirectionToggle = useCallback(() => {
    if (!activeCircuit) return;

    const newDirection = direction === 'up' ? 'down' : 'up';
    updateNode(activeCircuit.id, id, {
      data: { ...data, direction: newDirection },
    });
  }, [activeCircuit, data, direction, id, updateNode]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    handleValueChange(editValue);
  }, [editValue, handleValueChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        setIsEditing(false);
        handleValueChange(editValue);
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditValue(data.value.toString());
      }
    },
    [data.value, editValue, handleValueChange]
  );

  return (
    <div className="voltage-source-node">
      {/* Top terminal handle */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{
          top: -8,
          width: 12,
          height: 12,
          background: '#555',
          border: '2px solid #fff',
        }}
      />

      {/* Voltage source symbol SVG */}
      <svg width="60" height="80" viewBox="0 0 60 80">
        {/* Circle representing voltage source */}
        <circle
          cx="30"
          cy="40"
          r="20"
          stroke="#333"
          strokeWidth="2"
          fill="white"
        />

        {/* Polarity indicators */}
        {direction === 'up' ? (
          <>
            {/* Plus sign at top */}
            <text
              x="30"
              y="28"
              textAnchor="middle"
              fontSize="16"
              fontWeight="bold"
              fill="#E74C3C"
            >
              +
            </text>
            {/* Minus sign at bottom */}
            <text
              x="30"
              y="56"
              textAnchor="middle"
              fontSize="16"
              fontWeight="bold"
              fill="#3498DB"
            >
              −
            </text>
          </>
        ) : (
          <>
            {/* Minus sign at top */}
            <text
              x="30"
              y="28"
              textAnchor="middle"
              fontSize="16"
              fontWeight="bold"
              fill="#3498DB"
            >
              −
            </text>
            {/* Plus sign at bottom */}
            <text
              x="30"
              y="56"
              textAnchor="middle"
              fontSize="16"
              fontWeight="bold"
              fill="#E74C3C"
            >
              +
            </text>
          </>
        )}

        {/* Connection lines */}
        <line x1="30" y1="0" x2="30" y2="20" stroke="#333" strokeWidth="2" />
        <line x1="30" y1="60" x2="30" y2="80" stroke="#333" strokeWidth="2" />
      </svg>

      {/* Direction toggle button */}
      <Tooltip title="Toggle polarity">
        <IconButton
          onClick={handleDirectionToggle}
          size="small"
          sx={{
            position: 'absolute',
            top: -25,
            right: -25,
            width: 24,
            height: 24,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <SwapVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Editable voltage value */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -25,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 12,
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}
      >
        {isEditing ? (
          <TextField
            value={editValue}
            onChange={(e) => { setEditValue(e.target.value); }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            size="small"
            sx={{
              width: 60,
              '& .MuiInputBase-input': {
                fontSize: 12,
                textAlign: 'center',
                padding: '2px 4px',
              },
            }}
          />
        ) : (
          <Tooltip title="Click to edit voltage">
            <Box
              component="span"
              onClick={() => { setIsEditing(true); }}
              sx={{
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 1,
                bgcolor: 'action.hover',
                '&:hover': {
                  bgcolor: 'action.selected',
                },
              }}
            >
              {data.value}V
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Bottom terminal handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          bottom: -8,
          width: 12,
          height: 12,
          background: '#555',
          border: '2px solid #fff',
        }}
      />
    </div>
  );
});

VoltageSourceNode.displayName = 'VoltageSourceNode';
