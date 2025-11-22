/**
 * 🏷️ LabelOptimizer - Positions labels to avoid overlaps and maintain clarity
 *
 * This module implements collision-free label positioning for circuit graph visualization.
 * It calculates optimal positions for node and edge labels by:
 * 1. Computing initial positions with standard offsets
 * 2. Detecting collisions with existing elements
 * 3. Trying alternative positions when collisions occur
 * 4. Falling back to minimum-overlap positions when necessary
 */

import type {
  LayoutNode,
  LayoutEdge,
  LabelPosition,
  BoundingBox,
  Point,
} from "../types";
import { boundingBoxIntersects } from "../utils/geometry";
import { logger } from "../../../../utils/logger";

/**
 * Standard offset for label positioning (in pixels)
 */
const LABEL_OFFSET = 10;

/**
 * Estimated character width for label text (in pixels)
 */
const CHAR_WIDTH = 8;

/**
 * Estimated line height for label text (in pixels)
 */
const LINE_HEIGHT = 14;

/**
 * Type alias for elements that can be placed in the layout
 */
type PlacedElement = LayoutNode | LayoutEdge | LabelPosition;

/**
 * 🏷️ LabelOptimizer class for collision-free label positioning
 */
export class LabelOptimizer {
  /**
   * 🎯 Optimize label positions to avoid collisions
   *
   * Processes all nodes and edges to calculate optimal label positions.
   * Uses initial placement with collision detection and alternative position search.
   *
   * @param nodes - Renderable nodes needing labels
   * @param edges - Renderable edges needing labels
   * @returns Optimized label positions for nodes and edges
   */
  optimizeLabels(
    nodes: LayoutNode[],
    edges: LayoutEdge[]
  ): {
    nodeLabels: Map<string, LabelPosition>;
    edgeLabels: Map<string, LabelPosition>;
  } {
    const nodeLabels = new Map<string, LabelPosition>();
    const edgeLabels = new Map<string, LabelPosition>();

    // Track all placed elements for collision detection
    const placedElements: PlacedElement[] = [
      ...nodes,
      ...edges,
    ];

    // Process node labels first (higher priority)
    for (const node of nodes) {
      const elementsToCheck = this.filterElementsExcludingNode(placedElements, node.id);
      const finalPosition = this.getCollisionFreePosition(node, node.label, elementsToCheck);
      
      nodeLabels.set(node.id, finalPosition);
      placedElements.push(finalPosition);
    }

    // Process edge labels second
    for (const edge of edges) {
      const elementsToCheck = this.filterElementsExcludingEdge(placedElements, edge.id);
      const finalPosition = this.getCollisionFreePosition(edge, edge.label, elementsToCheck);
      
      edgeLabels.set(edge.id, finalPosition);
      placedElements.push(finalPosition);
    }

    return { nodeLabels, edgeLabels };
  }

  /**
   * 🔍 Filter elements excluding a specific element by ID and type
   *
   * @param elements - All placed elements
   * @param excludeId - Element ID to exclude
   * @param isTargetType - Type guard function to identify element type
   * @returns Filtered elements
   */
  private filterElementsExcluding(
    elements: PlacedElement[],
    excludeId: string,
    isTargetType: (el: PlacedElement) => boolean
  ): PlacedElement[] {
    return elements.filter((el): el is PlacedElement => {
      if (isTargetType(el)) {
        return (el as LayoutNode | LayoutEdge).id !== excludeId;
      }
      return true;
    });
  }

  /**
   * 🔍 Filter elements excluding a specific node
   *
   * @param elements - All placed elements
   * @param nodeId - Node ID to exclude
   * @returns Filtered elements
   */
  private filterElementsExcludingNode(
    elements: PlacedElement[],
    nodeId: string
  ): PlacedElement[] {
    return this.filterElementsExcluding(elements, nodeId, (el) => this.isLayoutNode(el));
  }

  /**
   * 🔍 Filter elements excluding a specific edge
   *
   * @param elements - All placed elements
   * @param edgeId - Edge ID to exclude
   * @returns Filtered elements
   */
  private filterElementsExcludingEdge(
    elements: PlacedElement[],
    edgeId: string
  ): PlacedElement[] {
    return this.filterElementsExcluding(elements, edgeId, (el) => this.isLayoutEdge(el));
  }

  /**
   * 🎯 Get collision-free position for a label
   *
   * Checks initial position for collisions and finds alternative if needed.
   *
   * @param element - Node or edge to position label for
   * @param text - Label text content
   * @param existingElements - Elements to check against
   * @returns Collision-free label position
   */
  private getCollisionFreePosition(
    element: LayoutNode | LayoutEdge,
    text: string,
    existingElements: PlacedElement[]
  ): LabelPosition {
    const initialPos = this.calculateInitialPosition(element, LABEL_OFFSET);
    const labelBounds = this.getLabelBounds(initialPos, text);
    const hasCollision = this.detectCollision(labelBounds, existingElements);

    if (hasCollision) {
      return this.findAlternativePosition(element, text, existingElements);
    }
    
    return initialPos;
  }

  /**
   * 📍 Calculate initial label position with standard offset
   *
   * For nodes: offset above node center
   * For edges: offset above edge midpoint (approximated from path)
   *
   * @param element - Node or edge to position label for
   * @param offset - Vertical offset in pixels
   * @returns Initial label position
   */
  private calculateInitialPosition(
    element: LayoutNode | LayoutEdge,
    offset: number
  ): LabelPosition {
    if (this.isLayoutNode(element)) {
      // Node label: position above node center
      return {
        x: element.x,
        y: element.y - offset,
      };
    }

    // Edge label: position above edge midpoint
    // Use the pre-calculated labelPos from the edge, then apply offset
    return {
      x: element.labelPos.x,
      y: element.labelPos.y - offset,
    };
  }

  /**
   * 🔍 Type guard to check if element is a LayoutNode
   */
  private isLayoutNode(
    element: PlacedElement
  ): element is LayoutNode {
    return "label" in element && "x" in element && "y" in element && !("path" in element);
  }

  /**
   * 🔍 Type guard to check if element is a LayoutEdge
   */
  private isLayoutEdge(
    element: PlacedElement
  ): element is LayoutEdge {
    return "path" in element;
  }

  /**
   * 💥 Detect collision between label and existing elements
   *
   * Calculates bounding box for the label text and checks for intersections
   * with all existing elements (nodes, edges, other labels).
   *
   * @param labelBounds - Bounding box for the label
   * @param existingElements - All elements to check against
   * @returns True if collision detected, false otherwise
   */
  private detectCollision(
    labelBounds: BoundingBox,
    existingElements: PlacedElement[]
  ): boolean {
    for (const element of existingElements) {
      const elementBounds = this.getElementBounds(element);
      if (boundingBoxIntersects(labelBounds, elementBounds)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 📦 Calculate bounding box for a label at given position
   *
   * @param position - Label position
   * @param text - Label text content
   * @returns Bounding box for the label
   */
  private getLabelBounds(position: Point, text: string): BoundingBox {
    const width = text.length * CHAR_WIDTH;
    const height = LINE_HEIGHT;

    return {
      x: position.x - width / 2,
      y: position.y - height / 2,
      width,
      height,
    };
  }

  /**
   * 📦 Get bounding box for any element type
   *
   * @param element - Node, edge, or label position
   * @returns Bounding box for the element
   */
  private getElementBounds(
    element: PlacedElement
  ): BoundingBox {
    if (this.isLayoutNode(element)) {
      // Node: small circle (radius ~3px)
      const radius = 3;
      return {
        x: element.x - radius,
        y: element.y - radius,
        width: radius * 2,
        height: radius * 2,
      };
    }

    if (this.isLabelPosition(element)) {
      // Label position: use estimated text bounds
      return {
        x: element.x - 20,
        y: element.y - LINE_HEIGHT / 2,
        width: 40,
        height: LINE_HEIGHT,
      };
    }

    // Edge: approximate as line segment bounding box
    // For simplicity, use a small buffer around the edge path
    return {
      x: element.labelPos.x - 30,
      y: element.labelPos.y - 30,
      width: 60,
      height: 60,
    };
  }

  /**
   * 🔍 Type guard to check if element is a LabelPosition
   */
  private isLabelPosition(
    element: PlacedElement
  ): element is LabelPosition {
    return (
      "x" in element &&
      "y" in element &&
      !("label" in element) &&
      !("path" in element)
    );
  }

  /**
   * 🔄 Find alternative position for label when initial position has collision
   *
   * Tries alternative positions in order: below, start-third, end-third.
   * Selects first position with zero collisions.
   *
   * @param element - Node or edge to position label for
   * @param text - Label text content
   * @param existingElements - All elements to check against
   * @returns Alternative label position (or best available)
   */
  private findAlternativePosition(
    element: LayoutNode | LayoutEdge,
    text: string,
    existingElements: PlacedElement[]
  ): LabelPosition {
    const alternatives = this.generateAlternativePositions(element);

    // Try each alternative position
    for (const position of alternatives) {
      const bounds = this.getLabelBounds(position, text);
      const hasCollision = this.detectCollision(bounds, existingElements);

      if (!hasCollision) {
        return position;
      }
    }

    // No collision-free position found, use fallback
    return this.selectFallbackPosition(element, text, alternatives, existingElements);
  }

  /**
   * 🎲 Generate alternative label positions
   *
   * Creates positions: below, start-third, end-third
   *
   * @param element - Node or edge to generate positions for
   * @returns Array of alternative positions
   */
  private generateAlternativePositions(
    element: LayoutNode | LayoutEdge
  ): LabelPosition[] {
    if (this.isLayoutNode(element)) {
      // Node alternatives: below, left, right
      return [
        { x: element.x, y: element.y + LABEL_OFFSET }, // Below
        { x: element.x - LABEL_OFFSET, y: element.y }, // Left
        { x: element.x + LABEL_OFFSET, y: element.y }, // Right
      ];
    }

    // Edge alternatives: below, start-third, end-third
    const baseX = element.labelPos.x;
    const baseY = element.labelPos.y;

    return [
      { x: baseX, y: baseY + LABEL_OFFSET }, // Below
      { x: baseX - 20, y: baseY }, // Start-third (approximate)
      { x: baseX + 20, y: baseY }, // End-third (approximate)
    ];
  }

  /**
   * ⚠️ Select fallback position when all alternatives have collisions
   *
   * Selects position with minimum overlap area.
   * Logs warning for debugging.
   *
   * @param element - Node or edge to position label for
   * @param text - Label text content
   * @param alternatives - Alternative positions to evaluate
   * @param existingElements - All elements to check against
   * @returns Fallback position with minimum overlap
   */
  private selectFallbackPosition(
    element: LayoutNode | LayoutEdge,
    text: string,
    alternatives: LabelPosition[],
    existingElements: PlacedElement[]
  ): LabelPosition {
    let minOverlap = Infinity;
    let bestPosition = alternatives[0] ?? this.calculateInitialPosition(element, LABEL_OFFSET);

    // Calculate overlap area for each alternative
    for (const position of alternatives) {
      const labelBounds = this.getLabelBounds(position, text);
      const overlapArea = this.calculateTotalOverlap(labelBounds, existingElements);

      if (overlapArea < minOverlap) {
        minOverlap = overlapArea;
        bestPosition = position;
      }
    }

    // Log warning for debugging
    logger.warn(
      { caller: "LabelOptimizer" },
      `No collision-free position found for label "${element.label}". Using position with minimum overlap (${minOverlap.toFixed(1)}px²).`
    );

    return bestPosition;
  }

  /**
   * 📊 Calculate total overlap area between label and existing elements
   *
   * Sums up the overlap area with all colliding elements.
   *
   * @param labelBounds - Bounding box for the label
   * @param existingElements - All elements to check against
   * @returns Total overlap area in square pixels
   */
  private calculateTotalOverlap(
    labelBounds: BoundingBox,
    existingElements: PlacedElement[]
  ): number {
    let totalOverlap = 0;

    for (const element of existingElements) {
      const elementBounds = this.getElementBounds(element);
      if (boundingBoxIntersects(labelBounds, elementBounds)) {
        totalOverlap += this.calculateOverlapArea(labelBounds, elementBounds);
      }
    }

    return totalOverlap;
  }

  /**
   * 📐 Calculate overlap area between two bounding boxes
   *
   * @param box1 - First bounding box
   * @param box2 - Second bounding box
   * @returns Overlap area in square pixels
   */
  private calculateOverlapArea(box1: BoundingBox, box2: BoundingBox): number {
    const overlapX = Math.max(
      0,
      Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x)
    );
    const overlapY = Math.max(
      0,
      Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y)
    );

    return overlapX * overlapY;
  }
}

