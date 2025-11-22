/**
 * Connection overlay that renders the connection line during click-based connection mode.
 * Renders as an SVG layer that follows React Flow's viewport transform.
 * Uses orthogonal (Manhattan) routing - lines are only horizontal or vertical.
 */

import { memo, useEffect, useRef } from "react";
import { logger } from "../../../../utils/logger";
import { useConnectionStore } from "../../../../store/connectionStore";
import { useConnectionPath } from "./useConnectionPath";
import { useViewportStyles } from "./useViewportStyles";
import { ConnectionPath } from "./ConnectionPath";
import { WaypointMarkers } from "./WaypointMarkers";
import { CursorMarker } from "./CursorMarker";
import { TemporaryJunction } from "../../nodes/JunctionNode/TemporaryJunction";
import type { Position, Waypoint } from "@/src/types/circuit";
import type { Viewport } from "@xyflow/react";

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
 * Gets current window dimensions
 */
function getWindowDimensions(): WindowDimensions {
  return {
    width: globalThis.window.innerWidth,
    height: globalThis.window.innerHeight,
  };
}

/**
 * Checks if screen coordinates are visible within window bounds
 */
function isPositionVisible(coords: ScreenCoordinates, windowSize: WindowDimensions): boolean {
  return coords.x >= 0 && coords.x <= windowSize.width && coords.y >= 0 && coords.y <= windowSize.height;
}

function logConnectionOverlay(params: logConnectionOverlayParams): void {
  const { sourcePosition, cursorPosition, waypoints, pathData, viewport } = params;

  if (!sourcePosition || !cursorPosition) {
    return;
  }

  const sourceScreen = flowToScreenCoords(sourcePosition, viewport);
  const cursorScreen = flowToScreenCoords(cursorPosition, viewport);
  const windowSize = getWindowDimensions();

  logger.debug({ caller: "ConnectionOverlay" }, "Rendering overlay", {
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

/**
 * 🎨 Hook for logging SVG overlay styles
 */
function useOverlayStyleLogging(svgRef: React.RefObject<SVGSVGElement | null>, isConnecting: boolean) {
  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;

    const computedStyle = globalThis.getComputedStyle(element);
    const pointerEvents = computedStyle.pointerEvents;

    logger.info({ caller: "ConnectionOverlay" }, "🎨 SVG overlay style check", {
      isConnecting,
      pointerEvents,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position,
    });
  }, [svgRef, isConnecting]);
}

/**
 * 📊 Hook for throttled connection logging
 */
function useThrottledConnectionLogging(params: {
  isConnecting: boolean;
  sourcePosition: Position | null;
  cursorPosition: Position | null;
  waypoints: Waypoint[];
  pathData: string;
  viewport: Viewport;
}) {
  const lastLogTimeRef = useRef<number>(0);
  const { isConnecting, sourcePosition, cursorPosition, waypoints, pathData, viewport } = params;

  useEffect(() => {
    if (!isConnecting) return;
    if (!sourcePosition) return;
    if (!cursorPosition) return;

    const now = Date.now();
    const timeSinceLastLog = now - lastLogTimeRef.current;
    if (timeSinceLastLog < 500) return;

    logConnectionOverlay({ sourcePosition, cursorPosition, waypoints, pathData, viewport });
    lastLogTimeRef.current = now;
  }, [isConnecting, sourcePosition, cursorPosition, waypoints, pathData, viewport]);
}

export const ConnectionOverlay = memo(() => {
  const isConnecting = useConnectionStore(state => state.isConnecting);
  const sourcePosition = useConnectionStore(state => state.sourcePosition);
  const waypoints = useConnectionStore(state => state.waypoints);
  const cursorPosition = useConnectionStore(state => state.cursorPosition);
  const lastDirection = useConnectionStore(state => state.lastDirection);
  const temporaryJunction = useConnectionStore(state => state.temporaryJunction);

  const svgRef = useRef<SVGSVGElement>(null);
  const mouseMoveCounterRef = useRef<number>(0);

  const pathData = useConnectionPath({
    sourcePosition,
    cursorPosition,
    waypoints,
    lastDirection,
  });

  const { viewport, strokeWidth, dashArray, waypointRadius, waypointStroke, cursorRadius } = useViewportStyles();

  useOverlayStyleLogging(svgRef, isConnecting);
  useThrottledConnectionLogging({
    isConnecting,
    sourcePosition,
    cursorPosition,
    waypoints,
    pathData,
    viewport,
  });

  if (!sourcePosition) return null;
  if (!cursorPosition) return null;

  // Render SVG overlay with viewport transform
  // sourcePosition and cursorPosition are already in flow coordinates from screenToFlowPosition
  // We need to apply the viewport transform to convert flow coords to screen coords for rendering
  return (
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 1000,
        overflow: "visible",
      }}
      onClick={e => {
        logger.warn({ caller: "ConnectionOverlay" }, "⚠️ SVG OVERLAY CLICKED (should not happen!)", {
          clientX: e.clientX,
          clientY: e.clientY,
          target: (e.target as Element).tagName,
          currentTarget: (e.currentTarget as Element).tagName,
        });
      }}
      onMouseDown={e => {
        logger.warn({ caller: "ConnectionOverlay" }, "⚠️ SVG OVERLAY MOUSE DOWN (should not happen!)", {
          clientX: e.clientX,
          clientY: e.clientY,
        });
      }}
      onMouseMove={e => {
        // Only log occasionally to avoid spam (every 100th move)
        mouseMoveCounterRef.current += 1;
        if (mouseMoveCounterRef.current % 100 === 0) {
          logger.debug({ caller: "ConnectionOverlay" }, "🖱️ SVG overlay mouse move (should pass through)", {
            clientX: e.clientX,
            clientY: e.clientY,
          });
        }
      }}
    >
      {/* Apply viewport transform: translate by viewport offset, then scale by zoom */}
      <g
        transform={`translate(${viewport.x.toString()},${viewport.y.toString()}) scale(${viewport.zoom.toString()})`}
        onClick={e => {
          logger.warn({ caller: "ConnectionOverlay" }, "⚠️ G ELEMENT CLICKED (should not happen!)", {
            target: (e.target as Element).tagName,
          });
        }}
      >
        {/* Debug: Show source position with a red circle */}
        <circle
          cx={sourcePosition.x}
          cy={sourcePosition.y}
          r={10 / viewport.zoom}
          fill="red"
          fillOpacity={0.5}
          stroke="red"
          strokeWidth={2 / viewport.zoom}
          onClick={e => {
            logger.warn({ caller: "ConnectionOverlay" }, "⚠️ DEBUG CIRCLE CLICKED (should not happen!)", {
              position: sourcePosition,
            });
            e.stopPropagation();
          }}
        />
        <ConnectionPath pathData={pathData} strokeWidth={strokeWidth} dashArray={dashArray} />
        <WaypointMarkers waypoints={waypoints} radius={waypointRadius} strokeWidth={waypointStroke} />
        <CursorMarker position={cursorPosition} radius={cursorRadius} />

        {/* Render temporary junction if exists */}
        {temporaryJunction && <TemporaryJunction position={temporaryJunction.position} />}
      </g>
    </svg>
  );
});

ConnectionOverlay.displayName = "ConnectionOverlay";
