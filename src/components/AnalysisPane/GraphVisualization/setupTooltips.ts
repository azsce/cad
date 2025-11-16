/**
 * 💬 Sets up hover tooltips for Cytoscape elements.
 *
 * Provides interactive tooltips that show:
 * - Component type, value, and ID on branch hover
 * - Node voltage on node hover (if results available)
 */

import type { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import type { AnalysisGraph, Branch } from '../../../types/analysis';
import type { GraphVisualizationData } from '../../../contexts/PresentationContext';
import { logger } from '../../../utils/logger';

/**
 * 🏗️ Formats branch tooltip content.
 */
function formatBranchTooltip(
  edge: EdgeSingular,
  branch: Branch,
  visualizationData: GraphVisualizationData
): string {
  const caller = 'formatBranchTooltip';
  const branchLabel = edge.data('branchLabel') as string;
  const componentInfo = edge.data('componentInfo') as string;

  let tooltip = `Branch: ${branchLabel}\n`;
  tooltip += `Type: ${branch.type}\n`;
  tooltip += `Value: ${componentInfo}\n`;
  tooltip += `ID: ${branch.id}`;

  // Add results if available
  if (visualizationData.mode === 'results' && visualizationData.branchResults) {
    const result = visualizationData.branchResults.get(branch.id);
    if (result) {
      tooltip += `\n\nCurrent: ${result.current.toFixed(3)} A`;
      tooltip += `\nVoltage: ${result.voltage.toFixed(3)} V`;
    }
  }

  logger.debug({ caller }, 'Formatted branch tooltip', { branchId: branch.id });
  return tooltip;
}

/**
 * 🏗️ Formats node tooltip content.
 */
function formatNodeTooltip(
  node: NodeSingular,
  analysisGraph: AnalysisGraph,
  visualizationData: GraphVisualizationData
): string {
  const caller = 'formatNodeTooltip';
  const nodeLabel = node.data('label') as string;
  const nodeId = node.id();
  const isReference = nodeId === analysisGraph.referenceNodeId;

  let tooltip = `Node: ${nodeLabel}`;
  if (isReference) {
    tooltip += ' (Reference/Ground)';
  }
  tooltip += `\nID: ${nodeId}`;

  // Add voltage if available (results mode)
  if (visualizationData.mode === 'results' && visualizationData.branchResults) {
    // Node voltages would need to be passed separately
    // For now, just indicate that this is the reference node
    if (isReference) {
      tooltip += `\n\nVoltage: 0.000 V (Reference)`;
    }
  }

  logger.debug({ caller }, 'Formatted node tooltip', { nodeId });
  return tooltip;
}

/**
 * 💬 Sets up hover tooltips for Cytoscape elements.
 *
 * Creates tooltips that appear on hover showing:
 * - Branch: component type, value, ID, and results (if available)
 * - Node: label, ID, and voltage (if available)
 */
export function setupTooltips(
  cy: Core,
  analysisGraph: AnalysisGraph,
  visualizationData: GraphVisualizationData
): void {
  const caller = 'setupTooltips';

  logger.debug({ caller }, 'Setting up tooltips');

  // Create tooltip element if it doesn't exist
  let tooltipElement = document.getElementById('cytoscape-tooltip');
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.id = 'cytoscape-tooltip';
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.display = 'none';
    tooltipElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    tooltipElement.style.color = '#fff';
    tooltipElement.style.padding = '8px 12px';
    tooltipElement.style.borderRadius = '4px';
    tooltipElement.style.fontSize = '12px';
    tooltipElement.style.fontFamily = 'monospace';
    tooltipElement.style.whiteSpace = 'pre-line';
    tooltipElement.style.pointerEvents = 'none';
    tooltipElement.style.zIndex = '9999';
    tooltipElement.style.maxWidth = '300px';
    tooltipElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    document.body.appendChild(tooltipElement);
  }

  // Show tooltip on mouseover
  cy.on('mouseover', 'node', event => {
    const node = event.target as NodeSingular;
    const tooltip = formatNodeTooltip(node, analysisGraph, visualizationData);

    tooltipElement.textContent = tooltip;
    tooltipElement.style.display = 'block';
  });

  cy.on('mouseover', 'edge', event => {
    const edge = event.target as EdgeSingular;
    const branchId = edge.id();
    const branch = analysisGraph.branches.find(b => b.id === branchId);

    if (branch) {
      const tooltip = formatBranchTooltip(edge, branch, visualizationData);
      tooltipElement.textContent = tooltip;
      tooltipElement.style.display = 'block';
    }
  });

  // Update tooltip position on mousemove
  cy.on('mousemove', event => {
    if (tooltipElement.style.display === 'block') {
      const mouseX = event.originalEvent.clientX;
      const mouseY = event.originalEvent.clientY;

      tooltipElement.style.left = `${(mouseX + 15).toString()}px`;
      tooltipElement.style.top = `${(mouseY + 15).toString()}px`;
    }
  });

  // Hide tooltip on mouseout
  cy.on('mouseout', 'node, edge', () => {
    tooltipElement.style.display = 'none';
  });

  logger.debug({ caller }, 'Tooltips setup complete');
}

/**
 * 🧹 Cleans up tooltip element.
 */
export function cleanupTooltips(): void {
  const tooltipElement = document.getElementById('cytoscape-tooltip');
  if (tooltipElement) {
    tooltipElement.remove();
  }
}
