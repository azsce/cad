/**
 * 🗺️ Cytoscape layout configuration.
 *
 * Defines the automatic layout algorithm for positioning nodes in the graph.
 * Uses breadthfirst layout from the reference node to create a hierarchical view.
 */

import type { LayoutOptions } from 'cytoscape';

/**
 * 🗺️ Creates layout configuration for Cytoscape.
 *
 * Uses breadthfirst layout starting from the reference node (typically n0).
 * This creates a hierarchical tree-like layout that matches academic conventions.
 *
 * @param referenceNodeId - ID of the reference (ground) node to use as root
 * @returns Cytoscape layout options
 */
export function createCytoscapeLayout(referenceNodeId: string): LayoutOptions {
  return {
    name: 'breadthfirst',
    roots: [`#${referenceNodeId}`],
    spacingFactor: 1.75,
    animate: true,
    animationDuration: 500,
    padding: 30,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true,
  };
}

/**
 * 🗺️ Alternative layout configurations for different use cases.
 */
export const LAYOUT_PRESETS = {
  /**
   * Breadthfirst - Hierarchical layout from reference node.
   */
  breadthfirst: (referenceNodeId: string): LayoutOptions => ({
    name: 'breadthfirst',
    roots: [`#${referenceNodeId}`],
    spacingFactor: 1.75,
    animate: true,
    animationDuration: 500,
    padding: 30,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true,
  }),

  /**
   * Circle - Nodes arranged in a circle.
   */
  circle: (): LayoutOptions => ({
    name: 'circle',
    animate: true,
    animationDuration: 500,
    padding: 30,
    avoidOverlap: true,
  }),

  /**
   * Grid - Nodes arranged in a grid.
   */
  grid: (): LayoutOptions => ({
    name: 'grid',
    animate: true,
    animationDuration: 500,
    padding: 30,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true,
  }),

  /**
   * COSE - Force-directed layout (physics-based).
   */
  cose: (): LayoutOptions => ({
    name: 'cose',
    animate: true,
    animationDuration: 1000,
    padding: 30,
    nodeRepulsion: 400000,
    idealEdgeLength: 100,
    edgeElasticity: 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  }),
};
