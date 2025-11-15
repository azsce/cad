/**
 * Connection overlay that renders the connection line during click-based connection mode.
 * Renders as an SVG layer that follows React Flow's viewport transform.
 * Uses orthogonal (Manhattan) routing - lines are only horizontal or vertical.
 */

import { memo, useEffect } from 'react';
import { logger } from '../../../../utils/logger';
import { useConnectionStore } from '../../../../store/connectionStore';
import { useConnectionPath } from './useConnectionPath';
import { useViewportStyles } from './useViewportStyles';
import { ConnectionPath } from './ConnectionPath';
import { WaypointMarkers } from './WaypointMarkers';
import { CursorMarker } from './CursorMarker';
import type { Position, Waypoint } from '@/src/types/circuit';
import type { Viewport } from '@xyflow/react';

type logConnectionOverlayParams = {
  sourcePosition: Position | null;
  cursorPosition: Position | null;
  waypoints: Waypoint[];
  pathData: string;
  viewport: Viewport;
};

type ScreenCoordinates = {
  x: number;
  y: number;
};

type WindowDimensions = {
  width: number;
  height: number;
};

/**
 * Converts flow coordinates to screen coordinates using viewport transform
 */
function flowToScreenCoords(position: Position, viewport: Viewport): ScreenCoordinates {
  return {
    x: position.x * viewport.zoom + viewport.x,
    y: position.y * viewport.zoom + viewport.y,
  };
}

/**
 * Gets current window dimensions, safe for SSR
 */
function getWindowDimensions(): WindowDimensions {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Checks if screen coordinates are visible within window bounds
 */
function isPositionVisible(coords: ScreenCoordinates, windowSize: WindowDimensions): boolean {
  return (
    coords.x >= 0 &&
    coords.x <= windowSize.width &&
    coords.y >= 0 &&
    coords.y <= windowSize.height
  );
}

function logConnectionOverlay(params: logConnectionOverlayParams): void {
  const { sourcePosition, cursorPosition, waypoints, pathData, viewport } = params;
  
  if (!sourcePosition || !cursorPosition) {
    return;
  }

  const sourceScreen = flowToScreenCoords(sourcePosition, viewport);
  const cursorScreen = flowToScreenCoords(cursorPosition, viewport);
  const windowSize = getWindowDimensions();

  logger.debug({ caller: 'ConnectionOverlay' }, 'Rendering overlay', {
    flowCoords: {
      source: sourcePosition,
      cursor: cursorPosition,
    },
    screenCoords: {
      source: sourceScreen,
      cursor: cursorScreen,
    },
    viewport,
    windowSize,
    visibility: {
      source: isPositionVisible(sourceScreen, windowSize),
      cursor: isPositionVisible(cursorScreen, windowSize),
    },
    waypointsCount: waypoints.length,
    pathData: pathData.substring(0, 80),
  });
}

export const ConnectionOverlay = memo(() => {
  const isConnecting = useConnectionStore((state) => state.isConnecting);
  const sourcePosition = useConnectionStore((state) => state.sourcePosition);
  const waypoints = useConnectionStore((state) => state.waypoints);
  const cursorPosition = useConnectionStore((state) => state.cursorPosition);
  const lastDirection = useConnectionStore((state) => state.lastDirection);

  useEffect(() => {
    if (isConnecting && sourcePosition) {
      logger.debug({ caller: 'ConnectionOverlay' }, 'Connection state', {
        sourcePosition,
        cursorPosition,
        waypointsCount: waypoints.length,
      });
    }
  }, [isConnecting, sourcePosition, cursorPosition, waypoints.length]);

  const pathData = useConnectionPath({
    sourcePosition,
    cursorPosition,
    waypoints,
    lastDirection,
  });

  const { viewport, strokeWidth, dashArray, waypointRadius, waypointStroke, cursorRadius } = useViewportStyles();

  logConnectionOverlay({sourcePosition, cursorPosition, waypoints, pathData, viewport});

  if(!sourcePosition || !cursorPosition) return null;

  // Render SVG overlay with viewport transform
  // sourcePosition and cursorPosition are already in flow coordinates from screenToFlowPosition
  // We need to apply the viewport transform to convert flow coords to screen coords for rendering
  return (
    <svg
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 1000,
        overflow: 'visible',
      }}
    >
      {/* Apply viewport transform: translate by viewport offset, then scale by zoom */}
      <g transform={`translate(${viewport.x.toString()},${viewport.y.toString()}) scale(${viewport.zoom.toString()})`}>
        {/* Debug: Show source position with a red circle */}
        <circle
          cx={sourcePosition.x}
          cy={sourcePosition.y}
          r={10 / viewport.zoom}
          fill="red"
          fillOpacity={0.5}
          stroke="red"
          strokeWidth={2 / viewport.zoom}
        />
        <ConnectionPath pathData={pathData} strokeWidth={strokeWidth} dashArray={dashArray} />
        <WaypointMarkers waypoints={waypoints} radius={waypointRadius} strokeWidth={waypointStroke} />
        <CursorMarker position={cursorPosition} radius={cursorRadius} />
      </g>
    </svg>
  );
});

ConnectionOverlay.displayName = 'ConnectionOverlay';
