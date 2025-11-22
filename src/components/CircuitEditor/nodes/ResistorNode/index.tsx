/**
 * ResistorNode component for React Flow.
 * Renders an SVG resistor symbol with two handles (left and right terminals)
 * and an inline editable resistance value input.
 */

import { memo, useState, useEffect, useRef } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { logger } from "../../../../utils/logger";
import { RotationButton } from "../RotationButton";
import { ConnectableHandle } from "../ConnectableHandle";
import type { ResistorData } from "../../../../types/circuit";
import { OuterWrapper, InnerRotatedBox } from "./styles";
import { ResistorSymbol } from "./ResistorSymbol";
import { ResistorValue } from "./ResistorValue";
import { useResistorRotation } from "./useResistorRotation";
import { useResistorValue } from "./useResistorValue";
import { useResistorDimensions } from "./useResistorDimensions";

/**
 * ResistorNode component.
 * Displays a resistor symbol with editable resistance value.
 */
export const ResistorNode = memo(({ id, data, selected }: NodeProps<Node<ResistorData>>) => {
  const [isHovered, setIsHovered] = useState(false);
  const lastLogTimeRef = useRef<number>(0);

  // Throttled logging effect - runs every 3 seconds
  useEffect(() => {
    const now = Date.now();
    if (now - lastLogTimeRef.current < 3000) return;

    logger.debug({ caller: "ResistorNode" }, "Rendering node", { id, data });
    lastLogTimeRef.current = now;
  }, [id, data]);
  const rotation = data.rotation ?? 0;

  const { handleRotateClockwise, handleRotateCounterClockwise } = useResistorRotation({
    nodeId: id,
    rotation,
  });

  const { isEditing, setIsEditing, editValue, setEditValue, handleBlur, handleKeyDown } = useResistorValue({
    nodeId: id,
    currentValue: data.value,
  });

  const { leftHandlePosition, rightHandlePosition, wrapperSx, handleStyle } = useResistorDimensions(rotation);

  return (
    <OuterWrapper
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      sx={wrapperSx}
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
        <ResistorSymbol />
        <ResistorValue
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
        handleId="left"
        type="source"
        position={leftHandlePosition}
        id="left"
        style={handleStyle}
      />
      <ConnectableHandle
        nodeId={id}
        handleId="right"
        type="source"
        position={rightHandlePosition}
        id="right"
        style={handleStyle}
      />
    </OuterWrapper>
  );
});

ResistorNode.displayName = "ResistorNode";
