/**
 * ResistorNode component for React Flow.
 * Renders an SVG resistor symbol with two handles (left and right terminals)
 * and an inline editable resistance value input.
 */

import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { TextField, Tooltip, Box } from '@mui/material';
import { useCircuitStore } from '../../../store/circuitStore';
import type { ResistorData } from '../../../types/circuit';

/**
 * ResistorNode component.
 * Displays a resistor symbol with editable resistance value.
 */
export const ResistorNode = memo(({ id, data }: NodeProps<Node<ResistorData>>) => {
  const updateNode = useCircuitStore((state) => state.updateNode);
  const activeCircuit = useCircuitStore((state) => state.getActiveCircuit());
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.value.toString());

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
    <div className="resistor-node">
      {/* Left terminal handle */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{
          left: -8,
          width: 12,
          height: 12,
          background: '#555',
          border: '2px solid #fff',
        }}
      />

      {/* Resistor symbol SVG */}
      <svg width="80" height="40" viewBox="0 0 80 40">
        {/* Resistor zigzag pattern */}
        <path
          d="M 0 20 L 10 20 L 15 10 L 25 30 L 35 10 L 45 30 L 55 10 L 65 30 L 70 20 L 80 20"
          stroke="#333"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      {/* Editable resistance value */}
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
          <Tooltip title="Click to edit resistance">
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
              {data.value}Ω
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Right terminal handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          right: -8,
          width: 12,
          height: 12,
          background: '#555',
          border: '2px solid #fff',
        }}
      />
    </div>
  );
});

ResistorNode.displayName = 'ResistorNode';
