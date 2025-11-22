/**
 * Utility functions for Circuit Graph Engine
 * 
 * This module contains helper functions for creating branded types
 * and other utilities used across the graph engine.
 */

import type { EdgeKey, PathData } from "./types";

/**
 * 🔑 Create a branded EdgeKey from a string.
 */
export function createEdgeKey(key: string): EdgeKey {
  return key as EdgeKey;
}

/**
 * 🎨 Create a branded PathData from a string.
 */
export function createPathData(path: string): PathData {
  return path as PathData;
}
