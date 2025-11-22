/**
 * Helper functions for calculating alignment helper lines
 */

import type { NodePositionChange } from "@xyflow/react";
import type { CircuitNode } from "../../types/circuit";

const SNAP_THRESHOLD = 5; // pixels

interface NodeBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

/**
 * Calculate bounds for a node
 */
function calculateNodeBounds(x: number, y: number, width: number, height: number): NodeBounds {
  return {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

/**
 * Check if two values are within snap threshold
 */
function isWithinThreshold(a: number, b: number): boolean {
  return Math.abs(a - b) < SNAP_THRESHOLD;
}

/**
 * Check alignment between two values and return the target value if aligned
 */
function checkAlignment(sourceValue: number, targetValue: number): number | undefined {
  return isWithinThreshold(sourceValue, targetValue) ? targetValue : undefined;
}

/**
 * Check vertical alignment between two nodes
 */
function checkVerticalAlignment(nodeABounds: NodeBounds, nodeBBounds: NodeBounds): number | undefined {
  return (
    checkAlignment(nodeABounds.left, nodeBBounds.left) ??
    checkAlignment(nodeABounds.centerX, nodeBBounds.centerX) ??
    checkAlignment(nodeABounds.right, nodeBBounds.right)
  );
}

/**
 * Check horizontal alignment between two nodes
 */
function checkHorizontalAlignment(nodeABounds: NodeBounds, nodeBBounds: NodeBounds): number | undefined {
  return (
    checkAlignment(nodeABounds.top, nodeBBounds.top) ??
    checkAlignment(nodeABounds.centerY, nodeBBounds.centerY) ??
    checkAlignment(nodeABounds.bottom, nodeBBounds.bottom)
  );
}

interface HelperLines {
  horizontal?: number;
  vertical?: number;
}

/**
 * Update alignment value if not already found
 */
function updateAlignment(
  currentValue: number | undefined,
  checkFn: (nodeA: NodeBounds, nodeB: NodeBounds) => number | undefined,
  nodeABounds: NodeBounds,
  nodeBBounds: NodeBounds
): number | undefined {
  if (currentValue !== undefined) {
    return currentValue;
  }
  return checkFn(nodeABounds, nodeBBounds);
}

/**
 * Check alignment with a single node
 */
function checkNodeAlignment(nodeABounds: NodeBounds, nodeB: CircuitNode, currentResult: HelperLines): HelperLines {
  const nodeBBounds = calculateNodeBounds(
    nodeB.position.x,
    nodeB.position.y,
    nodeB.measured?.width ?? 0,
    nodeB.measured?.height ?? 0
  );

  const vertical = updateAlignment(currentResult.vertical, checkVerticalAlignment, nodeABounds, nodeBBounds);
  const horizontal = updateAlignment(currentResult.horizontal, checkHorizontalAlignment, nodeABounds, nodeBBounds);

  const result: HelperLines = {};
  if (vertical !== undefined) {
    result.vertical = vertical;
  }
  if (horizontal !== undefined) {
    result.horizontal = horizontal;
  }

  return result;
}

/**
 * Check if both alignments are found
 */
function hasCompleteAlignment(result: HelperLines): boolean {
  return result.horizontal !== undefined && result.vertical !== undefined;
}

/**
 * Find alignment with other nodes
 */
function findAlignment(nodeABounds: NodeBounds, nodes: CircuitNode[], excludeId: string): HelperLines {
  let result: HelperLines = {};

  for (const nodeB of nodes) {
    if (nodeB.id === excludeId) continue;

    result = checkNodeAlignment(nodeABounds, nodeB, result);

    if (hasCompleteAlignment(result)) {
      break;
    }
  }

  return result;
}

/**
 * Calculate helper lines for node alignment
 */
export function calculateHelperLines(change: NodePositionChange, nodes: CircuitNode[]): HelperLines {
  const nodeA = nodes.find(node => node.id === change.id);
  if (!nodeA || !change.position) {
    return {};
  }

  const nodeABounds = calculateNodeBounds(
    change.position.x,
    change.position.y,
    nodeA.measured?.width ?? 0,
    nodeA.measured?.height ?? 0
  );

  return findAlignment(nodeABounds, nodes, change.id);
}
