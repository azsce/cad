import { create } from "zustand";
import { logger } from "../utils/logger";
import type { Position, Waypoint } from "../types/circuit";
import type { NodeId } from "../types/identifiers";

/**
 * Check if three points form a straight line (horizontal or vertical)
 */
function isRedundantPoint(prev: Waypoint, current: Waypoint, next: Waypoint): boolean {
  const isHorizontalLine = prev.y === current.y && current.y === next.y;
  const isVerticalLine = prev.x === current.x && current.x === next.x;
  return isHorizontalLine || isVerticalLine;
}

/**
 * Check if two waypoints are at the same position
 */
function isSamePosition(a: Waypoint, b: Waypoint): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Check if a waypoint should be skipped during cleaning
 */
function shouldSkipWaypoint(prev: Waypoint, current: Waypoint, next: Waypoint | undefined): boolean {
  // Skip redundant auto waypoints on straight lines
  return Boolean(next && current.auto && isRedundantPoint(prev, current, next));
}

/**
 * Handle duplicate position by favoring manual waypoints
 */
function handleDuplicatePosition(cleaned: Waypoint[], current: Waypoint, prev: Waypoint): boolean {
  if (!isSamePosition(prev, current)) {
    return false;
  }

  // Replace with manual waypoint if current is manual and prev is auto
  if (!current.auto && prev.auto) {
    cleaned[cleaned.length - 1] = { ...current };
  }
  return true;
}

type Direction = "horizontal" | "vertical" | null;

/**
 * Determine movement direction based on deltas
 */
function determineDirection(deltaX: number, deltaY: number, threshold: number): Direction {
  const hasSignificantMovement = deltaX > threshold || deltaY > threshold;
  if (!hasSignificantMovement) {
    return null;
  }
  return deltaX >= deltaY ? "horizontal" : "vertical";
}

/**
 * 🔄 Handle waypoint cleanup when cursor returns to previous position
 */
function handleWaypointCleanup(
  waypoints: Waypoint[],
  position: Position
): { waypoints: Waypoint[]; wasCleanedUp: boolean } {
  const waypointsAfterCleanup = removeReturnedAutoWaypoints(waypoints, position, 10);

  if (waypointsAfterCleanup.length !== waypoints.length) {
    logger.debug({ caller: "connectionStore" }, "🔄 Removed returned-to auto-waypoints", {
      before: waypoints.length,
      after: waypointsAfterCleanup.length,
      removed: waypoints.length - waypointsAfterCleanup.length,
    });

    return { waypoints: waypointsAfterCleanup, wasCleanedUp: true };
  }

  return { waypoints, wasCleanedUp: false };
}

/**
 * 🧭 Handle direction establishment when no direction is locked
 */
function handleDirectionEstablishment(
  position: Position,
  deltaX: number,
  deltaY: number,
  threshold: number
): { cursorPosition: Position; lastDirection?: "horizontal" | "vertical" | null } {
  const newDirection = determineDirection(deltaX, deltaY, threshold);
  return {
    cursorPosition: position,
    ...(newDirection && { lastDirection: newDirection }),
  };
}

/**
 * 🔄 Handle turn detection and auto-waypoint creation
 */
function handleTurnDetection(
  position: Position,
  lastPos: Waypoint,
  lastDirection: "horizontal" | "vertical",
  deltaX: number,
  deltaY: number,
  threshold: number,
  waypoints: Waypoint[]
):
  | { cursorPosition: Position; waypoints?: Waypoint[]; lastDirection?: null }
  | { cursorPosition: Position; lastDirection: "horizontal" | "vertical" } {
  const isPerpendicularMove = isPerpendicularMovement(lastDirection, deltaX, deltaY, threshold);

  if (isPerpendicularMove) {
    const turnPoint = createTurnWaypoint(lastDirection, position, lastPos);
    return {
      cursorPosition: position,
      waypoints: [...waypoints, turnPoint],
      lastDirection: null,
    };
  }

  return { cursorPosition: position, lastDirection };
}

/**
 * Check if movement is perpendicular to locked direction
 */
function isPerpendicularMovement(
  lastDirection: "horizontal" | "vertical",
  deltaX: number,
  deltaY: number,
  threshold: number
): boolean {
  if (lastDirection === "horizontal") {
    return deltaY > threshold;
  }
  return deltaX > threshold;
}

/**
 * Create a turn waypoint at the intersection point
 */
function createTurnWaypoint(lastDirection: "horizontal" | "vertical", position: Position, lastPos: Waypoint): Waypoint {
  return {
    x: lastDirection === "horizontal" ? position.x : lastPos.x,
    y: lastDirection === "vertical" ? position.y : lastPos.y,
    auto: true,
    direction: lastDirection,
  };
}

/**
 * 📏 Calculate Euclidean distance between cursor and waypoint
 */
function calculateDistance(cursorPosition: Position, waypoint: Waypoint): number {
  return Math.hypot(cursorPosition.x - waypoint.x, cursorPosition.y - waypoint.y);
}

/**
 * 🔍 Check if there are manual waypoints after given index
 */
function hasManualWaypointsAfter(waypoints: Waypoint[], index: number): boolean {
  return waypoints.slice(index + 1).some(wp => !wp.auto);
}

/**
 * 🔄 Remove auto-waypoints when cursor returns to them (within radius tolerance)
 * Only removes if there are no manual waypoints after the returned-to waypoint
 *
 * @param waypoints - Current waypoints array
 * @param cursorPosition - Current cursor position
 * @param radius - Detection radius in pixels (default: 10)
 * @returns New waypoints array with returned-to auto-waypoints removed
 */
function removeReturnedAutoWaypoints(waypoints: Waypoint[], cursorPosition: Position, radius: number): Waypoint[] {
  // Check waypoints in reverse order (most recent first)
  for (let i = waypoints.length - 1; i >= 0; i--) {
    const waypoint = waypoints[i];
    if (!waypoint) continue;

    // Skip manual waypoints - never delete them
    if (!waypoint.auto) continue;

    const distance = calculateDistance(cursorPosition, waypoint);

    // Check if cursor is within radius of this auto-waypoint
    if (distance <= radius && !hasManualWaypointsAfter(waypoints, i)) {
      // Delete this waypoint and all after it (they're all auto-waypoints)
      return waypoints.slice(0, i);
    }
  }

  return waypoints; // No changes needed
}

/**
 * Temporary state for connection-in-progress (Phase 1: Drawing Mode)
 * This store manages the transient state while a user creates a waypoint-based connection.
 * It exists only during the drawing process and is reset when the connection completes or cancels.
 */
interface ConnectionState {
  /** Whether a connection is currently being created */
  isConnecting: boolean;
  /** Source node ID */
  sourceNode: NodeId | null;
  /** Source handle ID */
  sourceHandle: string | null;
  /** Source handle position in flow coordinates */
  sourcePosition: Position | null;
  /** Accumulated waypoints during drawing */
  waypoints: Waypoint[];
  /** Current cursor position in flow coordinates (for connection line preview) */
  cursorPosition: Position | null;
  /** Last movement direction (for detecting turns) */
  lastDirection: "horizontal" | "vertical" | null;
  /** Temporary junction created when clicking edge during connection */
  temporaryJunction: {
    position: Position;
    edgeId: string;
  } | null;

  // Actions
  /** Initiate connection drawing mode */
  startConnecting: (sourceNode: NodeId, sourceHandle: string | null, sourcePosition: Position) => void;
  /** Add a waypoint at the specified position (manual = user clicked) */
  addWaypoint: (point: Position, auto?: boolean) => void;
  /** Update cursor position for connection line preview */
  updateCursorPosition: (position: Position | null) => void;
  /** Remove the last waypoint and move cursor to its position */
  removeLastWaypoint: () => void;
  /** Clean and optimize waypoints by removing redundant points */
  cleanWaypoints: (waypoints: Waypoint[]) => Waypoint[];
  /** End connection and return captured waypoints (state handoff) */
  endConnecting: () => {
    waypoints: Waypoint[];
    temporaryJunction: { position: Position; edgeId: string } | null;
  } | null;
  /** Cancel connection without creating an edge */
  cancelConnecting: () => void;
  /** Create a temporary junction at the specified position on an edge */
  createTemporaryJunction: (position: Position, edgeId: string) => void;
  /** Clear temporary junction */
  clearTemporaryJunction: () => void;
}

/**
 * Connection store for managing waypoint-based edge creation.
 * Follows the dual-phase architecture from the design document:
 * - Phase 1 (Drawing): This store manages temporary state
 * - Phase 2 (Rendering): Waypoints are handed off to edge data prop
 */
export const useConnectionStore = create<ConnectionState>((set, get) => ({
  isConnecting: false,
  sourceNode: null,
  sourceHandle: null,
  sourcePosition: null,
  waypoints: [],
  cursorPosition: null,
  lastDirection: null,
  temporaryJunction: null,

  /**
   * Start connection drawing mode
   * Called when user clicks a source handle
   */
  startConnecting: (sourceNode, sourceHandle, sourcePosition) => {
    logger.debug({ caller: "connectionStore" }, "startConnecting called", {
      sourceNode,
      sourceHandle,
      sourcePosition,
    });

    set({
      isConnecting: true,
      sourceNode,
      sourceHandle,
      sourcePosition,
      waypoints: [], // Clear waypoints from any previous connection
      cursorPosition: null,
      lastDirection: null,
    });

    logger.debug({ caller: "connectionStore" }, "startConnecting - state updated to isConnecting=true");
  },

  /**
   * Add a waypoint to the connection path
   * Called by onPaneClick handler when user clicks canvas during connection mode
   * @param point - The position of the waypoint
   * @param auto - Whether this waypoint was automatically created (true) or manually by user (false/undefined)
   */
  addWaypoint: (point, auto = false) => {
    set(state => {
      // Only add waypoint if a connection is in progress
      if (!state.isConnecting) return state;

      const waypoint: Waypoint = {
        x: point.x,
        y: point.y,
        ...(auto && { auto: true }), // Only add auto flag if true
        ...(state.lastDirection && { direction: state.lastDirection }), // Store the direction that led to this waypoint
      };

      return {
        waypoints: [...state.waypoints, waypoint],
        lastDirection: null, // Reset direction after adding waypoint so next segment can establish new direction
      };
    });
  },

  /**
   * Update cursor position for connection line preview
   * Called during mouse move when in connection mode
   */
  updateCursorPosition: position => {
    set(state => {
      if (!state.isConnecting || !position) {
        return { cursorPosition: position };
      }

      // Check if cursor returned to any auto-waypoint
      const { waypoints: cleanedWaypoints, wasCleanedUp } = handleWaypointCleanup(state.waypoints, position);

      if (wasCleanedUp) {
        return {
          cursorPosition: position,
          waypoints: cleanedWaypoints,
          lastDirection: null,
        };
      }

      const lastPos = state.waypoints.length > 0 ? state.waypoints.at(-1) : state.sourcePosition;

      if (!lastPos) {
        return { cursorPosition: position };
      }

      const deltaX = Math.abs(position.x - lastPos.x);
      const deltaY = Math.abs(position.y - lastPos.y);
      const threshold = 20;

      // No locked direction yet - establish one after significant movement
      if (!state.lastDirection) {
        return handleDirectionEstablishment(position, deltaX, deltaY, threshold);
      }

      // Check if moving perpendicular to locked direction and handle turn
      return handleTurnDetection(position, lastPos, state.lastDirection, deltaX, deltaY, threshold, state.waypoints);
    });
  },

  /**
   * ⌫ Remove the last waypoint and move cursor to its position
   * Called when user presses Delete or Backspace during connection mode
   */
  removeLastWaypoint: () => {
    set(state => {
      if (!state.isConnecting) return state;
      if (state.waypoints.length === 0) return state;

      const lastWaypoint = state.waypoints.at(-1);
      if (!lastWaypoint) return state;

      logger.debug({ caller: "connectionStore" }, "⌫ Removing last waypoint", {
        waypoint: lastWaypoint,
        remainingCount: state.waypoints.length - 1,
      });

      return {
        waypoints: state.waypoints.slice(0, -1),
        cursorPosition: { x: lastWaypoint.x, y: lastWaypoint.y },
        lastDirection: null, // Reset direction after removing waypoint
      };
    });
  },

  /**
   * Clean and optimize waypoints by removing redundant points.
   * Favors manual waypoints over auto waypoints.
   * Preserves direction information.
   */
  cleanWaypoints: (waypoints: Waypoint[]): Waypoint[] => {
    if (waypoints.length === 0) return [];

    const cleaned: Waypoint[] = [];

    for (let i = 0; i < waypoints.length; i++) {
      const current = waypoints[i];
      if (!current) continue;

      const prev = cleaned.at(-1);
      const next = waypoints.at(i + 1);

      // Always keep the first waypoint
      if (!prev) {
        cleaned.push({ ...current });
        continue;
      }

      // Skip duplicate positions, favoring manual waypoints
      if (handleDuplicatePosition(cleaned, current, prev)) {
        continue;
      }

      // Skip redundant auto waypoints on straight lines
      if (shouldSkipWaypoint(prev, current, next)) {
        continue;
      }

      // Keep this waypoint with all its metadata
      cleaned.push({ ...current });
    }

    return cleaned;
  },

  /**
   * End connection and return captured waypoints
   * Called by onConnect (success) handler
   * This is the "state handoff" point where temporary waypoints become persistent edge data
   *
   * @returns Object with waypoints array and temporary junction if connection was active, null otherwise
   */
  endConnecting: () => {
    const { isConnecting, waypoints, cleanWaypoints, temporaryJunction } = get();

    // If no connection is active, do nothing (idempotent)
    if (!isConnecting) return null;

    // Clean and optimize waypoints before capturing
    const cleanedWaypoints = cleanWaypoints(waypoints);

    // Capture temporary junction before clearing
    const capturedTempJunction = temporaryJunction;

    // Reset the store to its initial state
    set({
      isConnecting: false,
      sourceNode: null,
      sourceHandle: null,
      sourcePosition: null,
      waypoints: [],
      cursorPosition: null,
      lastDirection: null,
      temporaryJunction: null,
    });

    // Return the cleaned waypoints and temporary junction for handoff to edge creation
    return {
      waypoints: cleanedWaypoints,
      temporaryJunction: capturedTempJunction,
    };
  },

  /**
   * Cancel connection without creating an edge
   * Called when user presses Escape or explicitly cancels
   */
  cancelConnecting: () => {
    const currentState = get();
    logger.debug({ caller: "connectionStore" }, "cancelConnecting called", {
      wasConnecting: currentState.isConnecting,
    });

    set({
      isConnecting: false,
      sourceNode: null,
      sourceHandle: null,
      sourcePosition: null,
      waypoints: [],
      cursorPosition: null,
      lastDirection: null,
      temporaryJunction: null,
    });
  },

  /**
   * Create a temporary junction at the specified position on an edge.
   * Called when user clicks an edge during connection mode.
   */
  createTemporaryJunction: (position, edgeId) => {
    logger.debug({ caller: "connectionStore" }, "Creating temporary junction", {
      position,
      edgeId,
    });

    set({
      temporaryJunction: {
        position,
        edgeId,
      },
    });
  },

  /**
   * Clear temporary junction (on cancel or completion).
   */
  clearTemporaryJunction: () => {
    set({
      temporaryJunction: null,
    });
  },
}));
