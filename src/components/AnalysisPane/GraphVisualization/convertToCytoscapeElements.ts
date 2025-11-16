/**
 * 🔄 Converts AnalysisGraph to Cytoscape elements.
 *
 * Transforms the circuit analysis graph into Cytoscape-compatible node and edge definitions.
 * Follows lecture notation conventions:
 * - Nodes labeled as n0, n1, n2, ... (matching lecture notation)
 * - Edges labeled as a, b, c, ... with component info (e.g., "a\n10Ω")
 * - Applies classes based on visualization mode (twig, link, loop-0, cutset-1, etc.)
 */

import type { ElementDefinition } from 'cytoscape';
import type { AnalysisGraph, Branch, SpanningTree } from '../../../types/analysis';
import type { VisualizationMode, GraphVisualizationData } from '../../../contexts/PresentationContext';
import { logger } from '../../../utils/logger';

/**
 * 🏗️ Formats component information for display.
 */
function formatComponentInfo(branch: Branch): string {
  switch (branch.type) {
    case 'resistor':
      return `${branch.value.toString()}Ω`;
    case 'voltageSource':
      return `${branch.value.toString()}V`;
    case 'currentSource':
      return `${branch.value.toString()}A`;
    default:
      return '';
  }
}

/**
 * 🎨 Applies tree-specific classes to an edge.
 */
function applyTreeClasses(
  branchId: string,
  selectedTree: SpanningTree,
  classes: string[]
): void {
  // Cast branchId to BranchId for comparison with branded types
  const typedBranchId = branchId as import('../../../types/analysis').BranchId;
  
  if (selectedTree.twigBranchIds.includes(typedBranchId)) {
    classes.push('twig');
  } else if (selectedTree.linkBranchIds.includes(typedBranchId)) {
    classes.push('link');
  }
}

/**
 * 🎨 Applies definition-specific classes to an edge (loops or cut-sets).
 */
function applyDefinitionClasses(
  branchId: string,
  definitions: Array<{ branchIds: string[] }> | undefined,
  classPrefix: string,
  classes: string[]
): void {
  if (!definitions) {
    return;
  }

  definitions.forEach((definition, index) => {
    if (definition.branchIds.includes(branchId)) {
      classes.push(`${classPrefix}-${index.toString()}`);
    }
  });
}

/**
 * 🎨 Determines CSS classes for an edge based on visualization mode.
 */
function getEdgeClasses(
  branchId: string,
  mode: VisualizationMode,
  graph: AnalysisGraph,
  visualizationData: GraphVisualizationData
): string {
  const caller = 'getEdgeClasses';
  const classes: string[] = [];

  // Get selected spanning tree
  const selectedTree = graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);

  if (!selectedTree) {
    logger.warn({ caller }, 'No selected spanning tree found', { treeId: graph.selectedTreeId });
    return '';
  }

  // Apply classes based on visualization mode
  if (mode === 'tree') {
    applyTreeClasses(branchId, selectedTree, classes);
  } else if (mode === 'loops') {
    applyDefinitionClasses(branchId, visualizationData.loopDefinitions, 'loop', classes);
  } else if (mode === 'cutsets') {
    applyDefinitionClasses(branchId, visualizationData.cutSetDefinitions, 'cutset', classes);
  }

  // Apply highlighting if this element is in the highlighted list
  if (visualizationData.highlightedElements.includes(branchId)) {
    classes.push('highlighted');
  }

  return classes.join(' ');
}

/**
 * 🗺️ Converts AnalysisGraph to Cytoscape elements.
 *
 * Creates node and edge definitions following lecture conventions:
 * - Nodes: circles with labels (n0, n1, n2, ...)
 * - Edges: directed with arrows, labeled (a, b, c, ...)
 * - Reference node: highlighted with ground symbol
 * - Classes applied based on visualization mode
 */
export function convertToCytoscapeElements(
  graph: AnalysisGraph,
  visualizationData: GraphVisualizationData
): ElementDefinition[] {
  const caller = 'convertToCytoscapeElements';

  logger.debug({ caller }, 'Converting graph to Cytoscape elements', {
    nodeCount: graph.nodes.length,
    branchCount: graph.branches.length,
    mode: visualizationData.mode,
  });

  // Create node elements with standard notation (n0, n1, n2, ...)
  const nodes: ElementDefinition[] = graph.nodes.map((node, index) => {
    const nodeLabel = `n${index.toString()}`;
    const isReference = node.id === graph.referenceNodeId;

    return {
      data: {
        id: node.id,
        label: nodeLabel,
      },
      classes: isReference ? 'reference' : '',
    };
  });

  // Create edge elements with standard notation (a, b, c, ...)
  const edges: ElementDefinition[] = graph.branches.map((branch, index) => {
    const branchLabel = String.fromCharCode(97 + index); // a, b, c, ...
    const componentInfo = formatComponentInfo(branch);
    const classes = getEdgeClasses(branch.id, visualizationData.mode, graph, visualizationData);

    // Get branch results if in results mode
    let resultLabel = '';
    if (visualizationData.mode === 'results' && visualizationData.branchResults) {
      const result = visualizationData.branchResults.get(branch.id);
      if (result) {
        const currentStr = result.current.toFixed(3);
        const voltageStr = result.voltage.toFixed(3);
        resultLabel = `\nI=${currentStr}A\nV=${voltageStr}V`;
      }
    }

    const labelText = `${branchLabel}\n${componentInfo}${resultLabel}`;

    return {
      data: {
        id: branch.id,
        source: branch.fromNodeId,
        target: branch.toNodeId,
        label: labelText,
        branchLabel,
        componentInfo,
      },
      classes,
    };
  });

  logger.debug({ caller }, 'Conversion complete', {
    totalElements: nodes.length + edges.length,
  });

  return [...nodes, ...edges];
}
