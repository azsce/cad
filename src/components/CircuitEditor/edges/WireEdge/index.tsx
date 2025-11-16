/**
 * WireEdge component for React Flow.
 * Displays a connection edge with waypoint support and a delete button.
 */

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { useTheme } from '@mui/material';
import type { EdgeId } from '../../../../types/identifiers';
import { useWireEdgePath } from './useWireEdgePath';
import { useWireEdgeWaypoints } from './useWireEdgeWaypoints';
import { useWireEdgeDelete } from './useWireEdgeDelete';
import { useWireEdgeClick } from './useWireEdgeClick';
import { WaypointHandles } from './WaypointHandles';
import { DeleteButton } from './DeleteButton';

/**
 * WireEdge component.
 * Renders an edge with optional waypoints, draggable waypoint handles, and a delete button.
 */
export const WireEdge = memo((props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, selected, data } = props;
  const theme = useTheme();

  const { path, labelPosition } = useWireEdgePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  });

  const { waypoints, waypointHandlers } = useWireEdgeWaypoints(id, data);
  const { handleDelete } = useWireEdgeDelete(id);
  const { handleEdgeClick, edgeStyle, setIsHovered } = useWireEdgeClick(id as EdgeId, selected ?? false, theme);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          ...style,
          ...edgeStyle,
        }}
        interactionWidth={20}
        onClick={handleEdgeClick}
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      />

      {selected && <WaypointHandles waypoints={waypoints} handlers={waypointHandlers} />}

      {selected && (
        <EdgeLabelRenderer>
          <DeleteButton labelPosition={labelPosition} onDelete={handleDelete} />
        </EdgeLabelRenderer>
      )}
    </>
  );
});

WireEdge.displayName = 'WireEdge';
