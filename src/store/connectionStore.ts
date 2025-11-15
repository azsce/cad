import { create } from 'zustand';
import { logger } from '../utils/logger';
import type { Position, Waypoint } from '../types/circuit';
import type { NodeId } from '../types/identifiers';

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
function shouldSkipWaypoint(
  prev: Waypoint,
  current: Waypoint,
  next: Waypoint | undefined
): boolean {
  // Skip redundant auto waypoints on straight lines
  return Boolean(next && current.auto && isRedundantPoint(prev, current, next));
}

/**
 * Handle duplicate position by favoring manual waypoints
 */
function handleDuplicatePosition(
  cleaned: Waypoint[],
  current: Waypoint,
  prev: Waypoint
): boolean {
  if (!isSamePosition(prev, current)) {
    return false;
  }
  
  // Replace with manual waypoint if current is manual and prev is auto
  if (!current.auto && prev.auto) {
    cleaned[cleaned.length - 1] = { ...current };
  }
  return true;
}

/**
 * Determine movement direction based on deltas
 */
function determineDirection(deltaX: number, deltaY: number, threshold: number): 'horizontal' | 'vertical' | null {
  const hasSignificantMovement = deltaX > threshold || deltaY > threshold;
  if (!hasSignificantMovement) {
    return null;
  }
  return deltaX >= deltaY ? 'horizontal' : 'vertical';
}

/**
 * Check if movement is perpendicular to locked direction
 */
function isPerpendicularMovement(
  lastDirection: 'horizontal' | 'vertical',
  deltaX: number,
  deltaY: number,
  threshold: number
): boolean {
  if (lastDirection === 'horizontal') {
    return deltaY > threshold;
  }
  return deltaX > threshold;
}

/**
 * Create a turn waypoint at the intersection point
 */
function createTurnWaypoint(
  lastDirection: 'horizontal' | 'vertical',
  position: Position,
  lastPos: Waypoint
): Waypoint {
  return {
    x: lastDirection === 'horizontal' ? position.x : lastPos.x,
    y: lastDirection === 'vertical' ? position.y : lastPos.y,
    auto: true,
    direction: lastDirection,
  };
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
  lastDirection: 'horizontal' | 'vertical' | null;

  // Actions
  /** Initiate connection drawing mode */
  startConnecting: (sourceNode: NodeId, sourceHandle: string | null, sourcePosition: Position) => void;
  /** Add a waypoint at the specified position (manual = user clicked) */
  addWaypoint: (point: Position, auto?: boolean) => void;
  /** Update cursor position for connection line preview */
  updateCursorPosition: (position: Position | null) => void;
  /** Clean and optimize waypoints by removing redundant points */
  cleanWaypoints: (waypoints: Waypoint[]) => Waypoint[];
  /** End connection and return captured waypoints (state handoff) */
  endConnecting: () => { waypoints: Waypoint[] } | null;
  /** Cancel connection without creating an edge */
  cancelConnecting: () => void;
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

  /**
   * Start connection drawing mode
   * Called when user clicks a source handle
   */
  startConnecting: (sourceNode, sourceHandle, sourcePosition) => {
    logger.debug({ caller: 'connectionStore' }, 'startConnecting called', {
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
    
    logger.debug({ caller: 'connectionStore' }, 'startConnecting - state updated to isConnecting=true');
  },

  /**
   * Add a waypoint to the connection path
   * Called by onPaneClick handler when user clicks canvas during connection mode
   * @param point - The position of the waypoint
   * @param auto - Whether this waypoint was automatically created (true) or manually by user (false/undefined)
   */
  addWaypoint: (point, auto = false) => {
    set((state) => {
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
  updateCursorPosition: (position) => {
    set((state) => {
      if (!state.isConnecting || !position) {
        return { cursorPosition: position };
      }

      const lastPos = state.waypoints.length > 0 
        ? state.waypoints[state.waypoints.length - 1]
        : state.sourcePosition;
      
      if (!lastPos) {
        return { cursorPosition: position };
      }

      const deltaX = Math.abs(position.x - lastPos.x);
      const deltaY = Math.abs(position.y - lastPos.y);
      const threshold = 20;
      
      // No locked direction yet - establish one after significant movement
      if (!state.lastDirection) {
        const newDirection = determineDirection(deltaX, deltaY, threshold);
        return {
          cursorPosition: position,
          ...(newDirection && { lastDirection: newDirection }),
        };
      }
      
      // Check if moving perpendicular to locked direction
      const isPerpendicularMove = isPerpendicularMovement(
        state.lastDirection,
        deltaX,
        deltaY,
        threshold
      );
      
      if (!isPerpendicularMove) {
        return { cursorPosition: position, lastDirection: state.lastDirection };
      }
      
      // Direction change detected - add auto waypoint at turn
      const turnPoint = createTurnWaypoint(state.lastDirection, position, lastPos);
      
      return {
        cursorPosition: position,
        waypoints: [...state.waypoints, turnPoint],
        lastDirection: null,
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
      
      const prev = cleaned[cleaned.length - 1];
      const next = waypoints[i + 1];
      
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
   * @returns Object with waypoints array if connection was active, null otherwise
   */
  endConnecting: () => {
    const { isConnecting, waypoints, cleanWaypoints } = get();

    // If no connection is active, do nothing (idempotent)
    if (!isConnecting) return null;

    // Clean and optimize waypoints before capturing
    const cleanedWaypoints = cleanWaypoints(waypoints);

    // Reset the store to its initial state
    set({
      isConnecting: false,
      sourceNode: null,
      sourceHandle: null,
      sourcePosition: null,
      waypoints: [],
      cursorPosition: null,
      lastDirection: null,
    });

    // Return the cleaned waypoints for handoff to edge creation
    return { waypoints: cleanedWaypoints };
  },

  /**
   * Cancel connection without creating an edge
   * Called when user presses Escape or explicitly cancels
   */
  cancelConnecting: () => {
    const currentState = get();
    logger.debug({ caller: 'connectionStore' }, 'cancelConnecting called', { 
      wasConnecting: currentState.isConnecting 
    });
    
    set({
      isConnecting: false,
      sourceNode: null,
      sourceHandle: null,
      sourcePosition: null,
      waypoints: [],
      cursorPosition: null,
      lastDirection: null,
    });
  },
}));
