/**
 * VoltageSourceNode component for React Flow.
 * Renders an SVG voltage source symbol with polarity indicators,
 * two handles (top and bottom terminals), direction toggle button,
 * and an inline editable voltage value input.
 */

import { memo, useState, useEffect, useRef } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { logger } from "../../../../utils/logger";
import type { VoltageSourceData } from "../../../../types/circuit";
import { RotationButton } from "../RotationButton";
import { ConnectableHandle } from "../ConnectableHandle";
import { OuterWrapper, InnerRotatedBox } from "./styles";
import { VoltageSourceSymbol } from "./VoltageSourceSymbol";
import { VoltageValue } from "./VoltageValue";
import { useVoltageRotation } from "./useVoltageRotation";
import { useVoltageValue } from "./useVoltageValue";
import { useVoltageDirection } from "./useVoltageDirection";
import { useVoltageDimensions } from "./useVoltageDimensions";

/**
 * VoltageSourceNode component.
 * Displays a voltage source symbol with editable voltage value and polarity control.
 */
export const VoltageSourceNode = memo(({ id, data, selected }: NodeProps<Node<VoltageSourceData>>) => {
  const [isHovered, setIsHovered] = useState(false);
  const lastLogTimeRef = useRef<number>(0);

  // Throttled logging effect - runs every 3 seconds
  useEffect(() => {
    const now = Date.now();
    if (now - lastLogTimeRef.current < 3000) return;

    logger.debug({ caller: "VoltageSourceNode" }, "Rendering node", { id, data });
    lastLogTimeRef.current = now;
  }, [id, data]);
  const rotation = data.rotation ?? 0;

  const { handleRotateClockwise, handleRotateCounterClockwise } = useVoltageRotation({
    nodeId: id,
    rotation,
  });

  const { isEditing, setIsEditing, editValue, setEditValue, handleBlur, handleKeyDown } = useVoltageValue({
    nodeId: id,
    currentValue: data.value,
  });

  const { handleDirectionToggle } = useVoltageDirection({
    nodeId: id,
    direction: data.direction,
  });

  const { topHandlePosition, bottomHandlePosition, dimensions, handleStyle } = useVoltageDimensions(rotation);

  return (
    <OuterWrapper
      width={dimensions.width}
      height={dimensions.height}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
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

      <InnerRotatedBox rotation={rotation} selected={selected}>
        <VoltageSourceSymbol direction={data.direction} onDirectionToggle={handleDirectionToggle} />

        <VoltageValue
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
      </InnerRotatedBox>

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
    </OuterWrapper>
  );
});

VoltageSourceNode.displayName = "VoltageSourceNode";
