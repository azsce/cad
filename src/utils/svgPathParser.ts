/**
 * SVG Path Parser Utility
 * Parses SVG path data (d attribute) into line segments
 */

import type { Position } from "../types/circuit";

export interface PathSegment {
  start: Position;
  end: Position;
  direction: "horizontal" | "vertical" | "diagonal";
}

/**
 * Parse SVG path commands (M and L) into position points
 */
function parseSVGPathCommands(pathData: string): Position[] {
  const points: Position[] = [];

  // Match M (moveto) and L (lineto) commands with their coordinates
  // Format: "M x,y L x,y L x,y" or "M x y L x y"
  const commandRegex = /([ML])\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/g;
  let match;

  while ((match = commandRegex.exec(pathData)) !== null) {
    const xStr = match[2];
    const yStr = match[3];
    if (!xStr || !yStr) continue;
    const x = Number.parseFloat(xStr);
    const y = Number.parseFloat(yStr);
    points.push({ x, y });
  }

  return points;
}

/**
 * Determine segment direction based on start and end points
 */
function determineSegmentDirection(start: Position, end: Position): "horizontal" | "vertical" | "diagonal" {
  const deltaX = Math.abs(end.x - start.x);
  const deltaY = Math.abs(end.y - start.y);

  const epsilon = 0.1; // Tolerance for floating point comparison

  if (deltaY < epsilon) {
    return "horizontal";
  }
  if (deltaX < epsilon) {
    return "vertical";
  }
  return "diagonal";
}

/**
 * Convert points array into segments with direction info
 */
function pointsToSegments(points: Position[]): PathSegment[] {
  const segments: PathSegment[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];

    if (!start || !end) continue;

    segments.push({
      start,
      end,
      direction: determineSegmentDirection(start, end),
    });
  }

  return segments;
}

/**
 * Parse SVG path data string into line segments
 *
 * @param pathData - SVG path 'd' attribute value (e.g., "M 100,200 L 300,200 L 300,400")
 * @returns Array of path segments with start, end, and direction
 */
export function parseSVGPath(pathData: string | null | undefined): PathSegment[] {
  if (!pathData) {
    return [];
  }

  const points = parseSVGPathCommands(pathData);

  if (points.length < 2) {
    return [];
  }

  return pointsToSegments(points);
}

/**
 * Get the rendered SVG path element for an edge
 *
 * @param edgeId - The edge ID to find
 * @returns The path element or null if not found
 */
export function getEdgePathElement(edgeId: string): SVGPathElement | null {
  // React Flow renders edges with data-id attribute
  const edgeGroup = document.querySelector(`[data-id="${edgeId}"]`);
  if (!edgeGroup) {
    return null;
  }

  // Find the path element (main edge path, not markers)
  const pathElement = edgeGroup.querySelector("path");
  return pathElement;
}

/**
 * Get parsed segments from a rendered edge's SVG path
 *
 * @param edgeId - The edge ID to parse
 * @returns Array of path segments, or empty array if edge not found
 */
export function getRenderedEdgeSegments(edgeId: string): PathSegment[] {
  const pathElement = getEdgePathElement(edgeId);
  if (!pathElement) {
    return [];
  }

  const pathData = pathElement.getAttribute("d");
  return parseSVGPath(pathData);
}
