import { describe, it, expect } from "bun:test";
import {
  getLineIntersection,
  getLineCircleIntersection,
  getBezierPoint,
  getBezierTangent,
  pointToLineDistance,
  boundingBoxIntersects,
} from "./geometry";
import type { Point, BoundingBox } from "../types";

// Helper to create line objects
function createLine(params: { x1: number; y1: number; x2: number; y2: number }) {
  return {
    start: { x: params.x1, y: params.y1 },
    end: { x: params.x2, y: params.y2 },
  };
}

// Helper to create circle objects
function createCircle(params: { cx: number; cy: number; r: number }) {
  return {
    center: { x: params.cx, y: params.cy },
    radius: params.r,
  };
}

// Helper to create point objects
function createPoint(params: { x: number; y: number }): Point {
  return { x: params.x, y: params.y };
}

// Helper to create bounding box objects
function createBox(params: { x: number; y: number; width: number; height: number }): BoundingBox {
  return { x: params.x, y: params.y, width: params.width, height: params.height };
}

// Helper to assert point coordinates
function expectPointToBeCloseTo(point: Point | undefined, x: number, y: number, precision: number) {
  expect(point?.x).toBeCloseTo(x, precision);
  expect(point?.y).toBeCloseTo(y, precision);
}

describe("getLineIntersection", () => {
  it("should find intersection of two intersecting lines", () => {
    const line1 = createLine({ x1: 0, y1: 0, x2: 10, y2: 10 });
    const line2 = createLine({ x1: 0, y1: 10, x2: 10, y2: 0 });

    const result = getLineIntersection(line1, line2);

    expect(result).toBeDefined();
    expect(result?.x).toBeCloseTo(5, 5);
    expect(result?.y).toBeCloseTo(5, 5);
  });

  it("should return undefined for parallel lines", () => {
    const line1 = createLine({ x1: 0, y1: 0, x2: 10, y2: 0 });
    const line2 = createLine({ x1: 0, y1: 5, x2: 10, y2: 5 });

    const result = getLineIntersection(line1, line2);

    expect(result).toBeUndefined();
  });

  it("should return undefined for non-intersecting lines", () => {
    const line1 = createLine({ x1: 0, y1: 0, x2: 5, y2: 0 });
    const line2 = createLine({ x1: 10, y1: 0, x2: 15, y2: 0 });

    const result = getLineIntersection(line1, line2);

    expect(result).toBeUndefined();
  });

  it("should return undefined when lines would intersect if extended but not within segments", () => {
    const line1 = createLine({ x1: 0, y1: 0, x2: 2, y2: 2 });
    const line2 = createLine({ x1: 5, y1: 0, x2: 10, y2: 5 });

    const result = getLineIntersection(line1, line2);

    expect(result).toBeUndefined();
  });
});

describe("getLineCircleIntersection", () => {
  it("should find two intersection points when line passes through circle", () => {
    const line = createLine({ x1: -10, y1: 0, x2: 10, y2: 0 });
    const circle = createCircle({ cx: 0, cy: 0, r: 5 });

    const result = getLineCircleIntersection(line, circle);

    expect(result).toBeDefined();
    expect(result).toHaveLength(2);
    
    expectPointToBeCloseTo(result?.[0], -5, 0, 5);
    expectPointToBeCloseTo(result?.[1], 5, 0, 5);
  });

  it("should find one intersection point when line is tangent to circle", () => {
    const line = createLine({ x1: -10, y1: 5, x2: 10, y2: 5 });
    const circle = createCircle({ cx: 0, cy: 0, r: 5 });

    const result = getLineCircleIntersection(line, circle);

    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expectPointToBeCloseTo(result?.[0], 0, 5, 5);
  });

  it("should return undefined when line does not intersect circle", () => {
    const line = createLine({ x1: -10, y1: 10, x2: 10, y2: 10 });
    const circle = createCircle({ cx: 0, cy: 0, r: 5 });

    const result = getLineCircleIntersection(line, circle);

    expect(result).toBeUndefined();
  });

  it("should return undefined when line segment is too short to reach circle", () => {
    const line = createLine({ x1: -2, y1: 0, x2: -1, y2: 0 });
    const circle = createCircle({ cx: 10, cy: 0, r: 5 });

    const result = getLineCircleIntersection(line, circle);

    expect(result).toBeUndefined();
  });
});

describe("getBezierPoint", () => {
  const start: Point = { x: 0, y: 0 };
  const control: Point = { x: 50, y: 100 };
  const end: Point = { x: 100, y: 0 };

  it("should return start point at t=0", () => {
    const result = getBezierPoint(start, control, end, 0);

    expect(result.x).toBeCloseTo(start.x, 5);
    expect(result.y).toBeCloseTo(start.y, 5);
  });

  it("should return end point at t=1", () => {
    const result = getBezierPoint(start, control, end, 1);

    expect(result.x).toBeCloseTo(end.x, 5);
    expect(result.y).toBeCloseTo(end.y, 5);
  });

  it("should return midpoint at t=0.5", () => {
    const result = getBezierPoint(start, control, end, 0.5);

    expect(result.x).toBeCloseTo(50, 5);
    expect(result.y).toBeCloseTo(50, 5);
  });

  it("should calculate correct point at t=0.25", () => {
    const result = getBezierPoint(start, control, end, 0.25);

    // At t=0.25: (1-0.25)²*0 + 2*(1-0.25)*0.25*50 + 0.25²*100
    // x = 0 + 18.75 + 6.25 = 25
    // y = 0 + 37.5 + 0 = 37.5
    expect(result.x).toBeCloseTo(25, 5);
    expect(result.y).toBeCloseTo(37.5, 5);
  });

  it("should calculate correct point at t=0.75", () => {
    const result = getBezierPoint(start, control, end, 0.75);

    // At t=0.75: (1-0.75)²*0 + 2*(1-0.75)*0.75*50 + 0.75²*100
    // x = 0 + 18.75 + 56.25 = 75
    // y = 0 + 37.5 + 0 = 37.5
    expect(result.x).toBeCloseTo(75, 5);
    expect(result.y).toBeCloseTo(37.5, 5);
  });
});

describe("getBezierTangent", () => {
  const start: Point = { x: 0, y: 0 };
  const control: Point = { x: 50, y: 100 };
  const end: Point = { x: 100, y: 0 };

  it("should calculate tangent at t=0", () => {
    const result = getBezierTangent(start, control, end, 0);

    // At t=0: 2*(1-0)*(50-0) + 2*0*(100-50) = 100
    // dy: 2*(1-0)*(100-0) + 2*0*(0-100) = 200
    expect(result.dx).toBeCloseTo(100, 5);
    expect(result.dy).toBeCloseTo(200, 5);
  });

  it("should calculate tangent at t=1", () => {
    const result = getBezierTangent(start, control, end, 1);

    // At t=1: 2*(1-1)*(50-0) + 2*1*(100-50) = 100
    // dy: 2*(1-1)*(100-0) + 2*1*(0-100) = -200
    expect(result.dx).toBeCloseTo(100, 5);
    expect(result.dy).toBeCloseTo(-200, 5);
  });

  it("should calculate tangent at t=0.5", () => {
    const result = getBezierTangent(start, control, end, 0.5);

    // At t=0.5: 2*0.5*(50-0) + 2*0.5*(100-50) = 50 + 50 = 100
    // dy: 2*0.5*(100-0) + 2*0.5*(0-100) = 100 - 100 = 0
    expect(result.dx).toBeCloseTo(100, 5);
    expect(result.dy).toBeCloseTo(0, 5);
  });

  it("should calculate tangent at t=0.25", () => {
    const result = getBezierTangent(start, control, end, 0.25);

    // At t=0.25: 2*0.75*50 + 2*0.25*50 = 75 + 25 = 100
    // dy: 2*0.75*100 + 2*0.25*(-100) = 150 - 50 = 100
    expect(result.dx).toBeCloseTo(100, 5);
    expect(result.dy).toBeCloseTo(100, 5);
  });

  it("should calculate tangent at t=0.75", () => {
    const result = getBezierTangent(start, control, end, 0.75);

    // At t=0.75: 2*0.25*50 + 2*0.75*50 = 25 + 75 = 100
    // dy: 2*0.25*100 + 2*0.75*(-100) = 50 - 150 = -100
    expect(result.dx).toBeCloseTo(100, 5);
    expect(result.dy).toBeCloseTo(-100, 5);
  });
});

describe("pointToLineDistance", () => {
  it("should calculate distance to horizontal line", () => {
    const point = createPoint({ x: 5, y: 5 });
    const line = createLine({ x1: 0, y1: 0, x2: 10, y2: 0 });

    const result = pointToLineDistance(point, line);

    expect(result).toBeCloseTo(5, 5);
  });

  it("should calculate distance to vertical line", () => {
    const point = createPoint({ x: 5, y: 5 });
    const line = createLine({ x1: 0, y1: 0, x2: 0, y2: 10 });

    const result = pointToLineDistance(point, line);

    expect(result).toBeCloseTo(5, 5);
  });

  it("should calculate distance to diagonal line", () => {
    const point = createPoint({ x: 0, y: 10 });
    const line = createLine({ x1: 0, y1: 0, x2: 10, y2: 10 });

    const result = pointToLineDistance(point, line);

    // Distance from (0,10) to line y=x is |10-0|/sqrt(2) ≈ 7.071
    expect(result).toBeCloseTo(7.071, 2);
  });

  it("should calculate distance to nearest endpoint when projection is outside segment", () => {
    const point = createPoint({ x: 15, y: 0 });
    const line = createLine({ x1: 0, y1: 0, x2: 10, y2: 0 });

    const result = pointToLineDistance(point, line);

    expect(result).toBeCloseTo(5, 5);
  });

  it("should handle point on the line", () => {
    const point = createPoint({ x: 5, y: 5 });
    const line = createLine({ x1: 0, y1: 0, x2: 10, y2: 10 });

    const result = pointToLineDistance(point, line);

    expect(result).toBeCloseTo(0, 5);
  });

  it("should handle zero-length line segment", () => {
    const point = createPoint({ x: 5, y: 5 });
    const line = createLine({ x1: 0, y1: 0, x2: 0, y2: 0 });

    const result = pointToLineDistance(point, line);

    // Distance from (5,5) to (0,0) is sqrt(50) ≈ 7.071
    expect(result).toBeCloseTo(7.071, 2);
  });
});

describe("boundingBoxIntersects", () => {
  it("should detect intersection when boxes overlap", () => {
    const box1 = createBox({ x: 0, y: 0, width: 10, height: 10 });
    const box2 = createBox({ x: 5, y: 5, width: 10, height: 10 });

    const result = boundingBoxIntersects(box1, box2);

    expect(result).toBe(true);
  });

  it("should detect no intersection when boxes touch at edge", () => {
    const box1 = createBox({ x: 0, y: 0, width: 10, height: 10 });
    const box2 = createBox({ x: 10, y: 0, width: 10, height: 10 });

    const result = boundingBoxIntersects(box1, box2);

    expect(result).toBe(false);
  });

  it("should detect no intersection when boxes are separated horizontally", () => {
    const box1 = createBox({ x: 0, y: 0, width: 10, height: 10 });
    const box2 = createBox({ x: 15, y: 0, width: 10, height: 10 });

    const result = boundingBoxIntersects(box1, box2);

    expect(result).toBe(false);
  });

  it("should detect no intersection when boxes are separated vertically", () => {
    const box1 = createBox({ x: 0, y: 0, width: 10, height: 10 });
    const box2 = createBox({ x: 0, y: 15, width: 10, height: 10 });

    const result = boundingBoxIntersects(box1, box2);

    expect(result).toBe(false);
  });

  it("should detect intersection when one box contains another", () => {
    const box1 = createBox({ x: 0, y: 0, width: 20, height: 20 });
    const box2 = createBox({ x: 5, y: 5, width: 5, height: 5 });

    const result = boundingBoxIntersects(box1, box2);

    expect(result).toBe(true);
  });

  it("should detect no intersection when boxes touch at corner", () => {
    const box1 = createBox({ x: 0, y: 0, width: 10, height: 10 });
    const box2 = createBox({ x: 10, y: 10, width: 10, height: 10 });

    const result = boundingBoxIntersects(box1, box2);

    expect(result).toBe(false);
  });
});
