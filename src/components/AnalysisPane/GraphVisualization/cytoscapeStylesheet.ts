/**
 * 🎨 Cytoscape stylesheet for graph visualization.
 *
 * Defines visual styling for nodes and edges following lecture conventions:
 * - Nodes: circles with labels (n0, n1, n2, ...)
 * - Reference node: triangle shape (ground symbol)
 * - Edges: directed with arrows showing current direction
 * - Tree branches (twigs): solid green lines
 * - Links (co-tree): dashed red lines
 * - Loop highlighting: different color per loop
 * - Cut-set highlighting: different color per cut-set
 */

/**
 * Type for Cytoscape stylesheet elements.
 * Using Record to allow flexible style properties while maintaining type safety.
 */
type StylesheetElement = {
  selector: string;
  style: Record<string, string | number>;
};

/**
 * 🎨 Color palette for loop and cut-set highlighting.
 */
const LOOP_COLORS = [
  '#E74C3C', // Red
  '#9B59B6', // Purple
  '#F39C12', // Orange
  '#1ABC9C', // Turquoise
  '#3498DB', // Blue
  '#E67E22', // Dark Orange
  '#2ECC71', // Green
  '#F1C40F', // Yellow
];

const CUTSET_COLORS = [
  '#3498DB', // Blue
  '#E67E22', // Dark Orange
  '#9B59B6', // Purple
  '#1ABC9C', // Turquoise
  '#E74C3C', // Red
  '#2ECC71', // Green
  '#F39C12', // Orange
  '#F1C40F', // Yellow
];

/**
 * 🎨 Creates node styles for graph visualization.
 */
function createNodeStyles(): StylesheetElement[] {
  return [
    // Default node style - circles with labels
    {
      selector: 'node',
      style: {
        'background-color': '#4A90E2',
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '14px',
        'font-weight': 'bold',
        color: '#000',
        width: '40px',
        height: '40px',
        'border-width': '2px',
        'border-color': '#2E5C8A',
      },
    },

    // Reference node (ground) - triangle shape
    {
      selector: 'node.reference',
      style: {
        'background-color': '#000',
        'border-color': '#000',
        color: '#fff',
        shape: 'triangle',
        label: 'data(label)',
      },
    },

    // Highlighted nodes - larger with glow
    {
      selector: 'node.highlighted',
      style: {
        width: '50px',
        height: '50px',
        'border-width': '4px',
      },
    },
  ];
}

/**
 * 🎨 Creates base edge styles for graph visualization.
 */
function createBaseEdgeStyles(): StylesheetElement[] {
  return [
    // Default edge style - directed with arrows
    {
      selector: 'edge',
      style: {
        width: 3,
        'line-color': '#333',
        'target-arrow-color': '#333',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': '11px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'text-background-color': '#fff',
        'text-background-opacity': 0.8,
        'text-background-padding': '2px',
      },
    },

    // Highlighted edges - thicker with glow effect
    {
      selector: 'edge.highlighted',
      style: {
        width: 8,
        'line-style': 'solid',
        opacity: 1,
      },
    },
  ];
}

/**
 * 🌳 Creates spanning tree edge styles (twigs and links).
 */
function createSpanningTreeStyles(): StylesheetElement[] {
  return [
    // Twigs (tree branches) - solid green lines
    {
      selector: 'edge.twig',
      style: {
        'line-color': '#27AE60',
        'target-arrow-color': '#27AE60',
        width: 5,
        'line-style': 'solid',
      },
    },

    // Links (co-tree) - dashed red lines
    {
      selector: 'edge.link',
      style: {
        'line-color': '#E74C3C',
        'target-arrow-color': '#E74C3C',
        width: 4,
        'line-style': 'dashed',
      },
    },
  ];
}

/**
 * 🔄 Creates loop highlighting styles.
 */
function createLoopStyles(): StylesheetElement[] {
  return LOOP_COLORS.map(
    (color, index): StylesheetElement => ({
      selector: `edge.loop-${index.toString()}`,
      style: {
        'line-color': color,
        'target-arrow-color': color,
        width: 6,
        'line-style': 'solid',
      },
    })
  );
}

/**
 * ✂️ Creates cut-set highlighting styles.
 */
function createCutsetStyles(): StylesheetElement[] {
  return CUTSET_COLORS.map(
    (color, index): StylesheetElement => ({
      selector: `edge.cutset-${index.toString()}`,
      style: {
        'line-color': color,
        'target-arrow-color': color,
        width: 6,
        'line-style': 'solid',
      },
    })
  );
}

/**
 * 🎨 Creates Cytoscape stylesheet with academic conventions.
 *
 * Follows the visual style from lecture materials:
 * - Clear node and edge labeling
 * - Directed graph representation
 * - Color-coded tree/link distinction
 * - Loop and cut-set highlighting
 */
export function createCytoscapeStylesheet(): StylesheetElement[] {
  return [
    ...createNodeStyles(),
    ...createBaseEdgeStyles(),
    ...createSpanningTreeStyles(),
    ...createLoopStyles(),
    ...createCutsetStyles(),
  ];
}

/**
 * 🎨 Export color palettes for use in other components.
 */
export { LOOP_COLORS, CUTSET_COLORS };
