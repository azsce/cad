/**
 * CurrentSourceNode component for React Flow.
 * Renders an SVG current source symbol with arrow indicator,
 * two handles for connections, direction toggle button,
 * and an inline editable current value input.
 */

import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCircuitStore } from '../../../store/circuitStore';
import type { CircuitNode } from '../../../types/circuit';

/**
 * CurrentSourceNode component.
 * Displays a current source symbol with editable current value and direction control.
 */
export const CurrentSourceNode = memo(({ id, data }: NodeProps<CircuitNode>) => {
  const updateNode = useCircuitStore((state) => state.updateNode);
  const activeCircuit = useCircuitStore((state) => state.getActiveCircuit());
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.value.toString());

  const direction = data.direction ?? 'up';

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
    <div className="current-source-node">
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

      {/* Current source symbol SVG */}
      <svg width="60" height="80" viewBox="0 0 60 80">
        {/* Circle representing current source */}
        <circle
          cx="30"
          cy="40"
          r="20"
          stroke="#333"
          strokeWidth="2"
          fill="white"
        />

        {/* Arrow indicator showing current direction */}
        {direction === 'up' ? (
          <>
            {/* Arrow pointing up */}
            <line
              x1="30"
              y1="50"
              x2="30"
              y2="30"
              stroke="#27AE60"
              strokeWidth="3"
            />
            <polygon
              points="30,26 26,32 34,32"
              fill="#27AE60"
            />
          </>
        ) : (
          <>
            {/* Arrow pointing down */}
            <line
              x1="30"
              y1="30"
              x2="30"
              y2="50"
              stroke="#27AE60"
              strokeWidth="3"
            />
            <polygon
              points="30,54 26,48 34,48"
              fill="#27AE60"
            />
          </>
        )}

        {/* Connection lines */}
        <line x1="30" y1="0" x2="30" y2="20" stroke="#333" strokeWidth="2" />
        <line x1="30" y1="60" x2="30" y2="80" stroke="#333" strokeWidth="2" />
      </svg>

      {/* Direction toggle button */}
      <button
        onClick={handleDirectionToggle}
        style={{
          position: 'absolute',
          top: -25,
          right: -25,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '1px solid #ccc',
          background: '#fff',
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        title="Toggle direction"
      >
        ⇅
      </button>

      {/* Editable current value */}
      <div
        style={{
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
          <input
            type="text"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: 60,
              padding: 2,
              fontSize: 12,
              textAlign: 'center',
              border: '1px solid #4A90E2',
              borderRadius: 3,
            }}
          />
        ) : (
          <span
            onClick={() => {
              setIsEditing(true);
            }}
            style={{
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: 3,
              background: '#f0f0f0',
            }}
            title="Click to edit"
          >
            {data.value}A
          </span>
        )}
      </div>

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

CurrentSourceNode.displayName = 'CurrentSourceNode';
