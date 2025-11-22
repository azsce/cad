/**
 * Geometric utility functions for circuit graph layout calculations.
 * Provides pure functions for intersection detection, distance calculations,
 * and Bezier curve mathematics.
 */

import type { Point, BoundingBox } from "../types";

/**
 * 🔍 Calculate the intersection point of two line segments.
 *
 * Uses parametric line equations to find where two line segments intersect.
 * Returns undefined if lines are parallel or don't intersect within their segments.
 *
 * @param line1 - First line segment with start and end points
 * @param line2 - Second line segment with start and end points
 * @returns Intersection point or undefined if no intersection exists
 */
export function getLineIntersection(
  line1: { start: Point; end: Point },
  line2: { start: Point; end: Point }
): Point | undefined {
  const { start: p1, end: p2 } = line1;
  const { start: p3, end: p4 } = line2;

  const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

  // Lines are parallel or coincident
  if (Math.abs(denominator) < 1e-10) {
    return undefined;
  }

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

  const isUaOutOfBounds = ua < 0 || ua > 1;
  const isUbOutOfBounds = ub < 0 || ub > 1;

  // Check if intersection is within both line segments
  if (isUaOutOfBounds || isUbOutOfBounds) {
    return undefined;
  }

  return {
    x: p1.x + ua * (p2.x - p1.x),
    y: p1.y + ua * (p2.y - p1.y),
  };
}

/**
 * 🔍 Calculate intersection points between a line segment and a circle.
 *
 * Solves the quadratic equation formed by substituting the parametric line
 * equation into the circle equation. Returns up to two intersection points.
 *
 * @param line - Line segment with start and end points
 * @param circle - Circle with center point and radius
 * @returns Array of intersection points (0, 1, or 2 points), or undefined if no intersection
 */
export function getLineCircleIntersection(
  line: { start: Point; end: Point },
  circle: { center: Point; radius: number }
): Point[] | undefined {
  const { start, end } = line;
  const { center, radius } = circle;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const fx = start.x - center.x;
  const fy = start.y - center.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;

  // No intersection
  if (discriminant < 0) {
    return undefined;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDiscriminant) / (2 * a);
  const t2 = (-b + sqrtDiscriminant) / (2 * a);

  const intersections: Point[] = [];

  const isT1Valid = t1 >= 0 && t1 <= 1;
  const isT2Valid = t2 >= 0 && t2 <= 1;
  const isT2Different = Math.abs(t2 - t1) > 1e-10;

  // Check if t1 is within the line segment
  if (isT1Valid) {
    intersections.push({
      x: start.x + t1 * dx,
      y: start.y + t1 * dy,
    });
  }

  // Check if t2 is within the line segment (and different from t1)
  if (isT2Valid && isT2Different) {
    intersections.push({
      x: start.x + t2 * dx,
      y: start.y + t2 * dy,
    });
  }

  return intersections.length > 0 ? intersections : undefined;
}

/**
 * 🛤️ Calculate a point on a quadratic Bezier curve at parameter t.
 *
 * Uses the quadratic Bezier formula: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
 * where P₀ is start, P₁ is control, and P₂ is end.
 *
 * @param start - Start point of the curve
 * @param control - Control point that defines the curve shape
 * @param end - End point of the curve
 * @param t - Parameter value between 0 and 1 (0 = start, 1 = end)
 * @returns Point on the Bezier curve at parameter t
 */
export function getBezierPoint(
  start: Point,
  control: Point,
  end: Point,
  t: number
): Point {
  const oneMinusT = 1 - t;
  const oneMinusTSquared = oneMinusT * oneMinusT;
  const tSquared = t * t;

  return {
    x: oneMinusTSquared * start.x + 2 * oneMinusT * t * control.x + tSquared * end.x,
    y: oneMinusTSquared * start.y + 2 * oneMinusT * t * control.y + tSquared * end.y,
  };
}

/**
 * 🛤️ Calculate the tangent vector on a quadratic Bezier curve at parameter t.
 *
 * Uses the derivative of the quadratic Bezier formula:
 * B'(t) = 2(1-t)(P₁-P₀) + 2t(P₂-P₁)
 *
 * @param start - Start point of the curve
 * @param control - Control point that defines the curve shape
 * @param end - End point of the curve
 * @param t - Parameter value between 0 and 1
 * @returns Tangent vector (dx, dy) at parameter t
 */
export function getBezierTangent(
  start: Point,
  control: Point,
  end: Point,
  t: number
): { dx: number; dy: number } {
  const oneMinusT = 1 - t;

  return {
    dx: 2 * oneMinusT * (control.x - start.x) + 2 * t * (end.x - control.x),
    dy: 2 * oneMinusT * (control.y - start.y) + 2 * t * (end.y - control.y),
  };
}

/**
 * 📏 Calculate the shortest distance from a point to a line segment.
 *
 * Projects the point onto the line and checks if the projection falls within
 * the segment. If not, returns distance to the nearest endpoint.
 *
 * @param point - Point to measure distance from
 * @param line - Line segment with start and end points
 * @returns Shortest distance from point to line segment
 */
export function pointToLineDistance(
  point: Point,
  line: { start: Point; end: Point }
): number {
  const { start, end } = line;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  // Line segment is actually a point
  if (lengthSquared < 1e-10) {
    const distX = point.x - start.x;
    const distY = point.y - start.y;
    return Math.hypot(distX, distY);
  }

  // Calculate projection parameter t
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)
  );

  // Calculate closest point on line segment
  const closestX = start.x + t * dx;
  const closestY = start.y + t * dy;

  // Calculate distance
  const distX = point.x - closestX;
  const distY = point.y - closestY;
  return Math.hypot(distX, distY);
}

/**
 * 📦 Check if two bounding boxes intersect.
 *
 * Uses axis-aligned bounding box intersection test.
 * Returns true if boxes overlap (touching edges do not count as intersecting).
 *
 * @param box1 - First bounding box
 * @param box2 - Second bounding box
 * @returns True if boxes intersect, false otherwise
 */
export function boundingBoxIntersects(box1: BoundingBox, box2: BoundingBox): boolean {
  return (
    box1.x < box2.x + box2.width &&
    box1.x + box1.width > box2.x &&
    box1.y < box2.y + box2.height &&
    box1.y + box1.height > box2.y
  );
}
