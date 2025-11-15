/**
 * CurrentSourceNode component for React Flow.
 * Renders an SVG current source symbol with arrow indicator,
 * two handles for connections, direction toggle button,
 * and an inline editable current value input.
 */

import { memo, useState } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { logger } from '../../../../utils/logger';
import type { CurrentSourceData } from '../../../../types/circuit';
import { RotationButton } from '../RotationButton';
import { ConnectableHandle } from '../ConnectableHandle';
import { NodeWrapper, RotatedContent } from './styles';
import { CurrentSourceSymbol } from './CurrentSourceSymbol';
import { CurrentValue } from './CurrentValue';
import { useCurrentRotation } from './useCurrentRotation';
import { useCurrentValue } from './useCurrentValue';
import { useCurrentDirection } from './useCurrentDirection';
import { useCurrentDimensions } from './useCurrentDimensions';

/**
 * CurrentSourceNode component.
 * Displays a current source symbol with editable current value and direction control.
 */
export const CurrentSourceNode = memo(({ id, data, selected }: NodeProps<Node<CurrentSourceData>>) => {
  logger.debug({ caller: 'CurrentSourceNode' }, 'Rendering node', { id, data });

  const [isHovered, setIsHovered] = useState(false);
  const rotation = data.rotation ?? 0;

  const { handleRotateClockwise, handleRotateCounterClockwise } = useCurrentRotation({
    nodeId: id,
    rotation,
  });

  const { isEditing, setIsEditing, editValue, setEditValue, handleBlur, handleKeyDown } = useCurrentValue({
    nodeId: id,
    currentValue: data.value,
  });

  const { handleDirectionToggle } = useCurrentDirection({
    nodeId: id,
    direction: data.direction,
  });

  const { topHandlePosition, bottomHandlePosition, dimensions, handleStyle } = useCurrentDimensions(rotation);

  return (
    <NodeWrapper
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      sx={{
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      <RotationButton
        direction="clockwise"
        position="top-left"
        onClick={handleRotateClockwise}
        visible={isHovered || selected}
      />
      <RotationButton
        direction="counterclockwise"
        position="bottom-right"
        onClick={handleRotateCounterClockwise}
        visible={isHovered || selected}
      />

      <RotatedContent rotation={rotation} selected={selected}>
        <CurrentSourceSymbol direction={data.direction} onDirectionToggle={handleDirectionToggle} />

        <CurrentValue
          value={data.value}
          isEditing={isEditing}
          editValue={editValue}
          onEditStart={() => {
            setIsEditing(true);
          }}
          onEditValueChange={setEditValue}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </RotatedContent>

      <ConnectableHandle
        nodeId={id}
        handleId="top"
        type="source"
        position={topHandlePosition}
        id="top"
        style={handleStyle}
      />
      <ConnectableHandle
        nodeId={id}
        handleId="bottom"
        type="source"
        position={bottomHandlePosition}
        id="bottom"
        style={handleStyle}
      />
    </NodeWrapper>
  );
});

CurrentSourceNode.displayName = 'CurrentSourceNode';
