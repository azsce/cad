/**
 * WireEdge component for React Flow.
 * Displays a connection edge with waypoint support and a delete button.
 */

import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { useWireEdgePath } from "./useWireEdgePath";
import { useWireEdgeWaypoints } from "./useWireEdgeWaypoints";
import { useWireEdgeDelete } from "./useWireEdgeDelete";
import { WaypointHandles } from "./WaypointHandles";
import { DeleteButton } from "./DeleteButton";
import { useCircuitFlow } from "../../../../hooks/useCircuitFlow";

/**
 * WireEdge component.
 * Renders an edge with optional waypoints, draggable waypoint handles, and a delete button.
 */
export const WireEdge = memo((props: EdgeProps) => {
  const { id, source, target, sourceX, sourceY, targetX, targetY, style = {}, selected, data } = props;
  const { getEdgeStyle } = useCircuitFlow();

  const { path, labelPosition } = useWireEdgePath({
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    edgeId: id,
  });

  const { waypoints, waypointHandlers } = useWireEdgeWaypoints(id, data);
  const { handleDelete } = useWireEdgeDelete(id);
  const edgeStyle = getEdgeStyle(id, selected ?? false);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          ...style,
          ...edgeStyle,
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

WireEdge.displayName = "WireEdge";
