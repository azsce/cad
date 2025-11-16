/**
 * 📄 Markdown report generator.
 * Generates comprehensive step-by-step analysis reports with LaTeX formatting.
 */

import type { CalculationResult, AnalysisGraph } from '../../../types/analysis';
import { matrixToLatex } from './matrixToLatex';
import { wrapInDisplayMath } from './formatEquation';
import { generateLoopDescription, getLoopColor } from './generateLoopDescription';

/**
 * Generates a complete Markdown report for circuit analysis results.
 * 
 * The report includes:
 * 1. Header with circuit name, method, and timestamp
 * 2. Selected spanning tree information
 * 3. Topology matrices (A or B) with LaTeX
 * 4. Branch impedance/admittance matrices
 * 5. Source vectors
 * 6. System matrix and vector
 * 7. Solution vector
 * 8. Final results table
 * 9. Summary section
 * 
 * @param result - The calculation result
 * @param graph - The analysis graph
 * @param circuitName - Name of the circuit
 * @returns Markdown-formatted report string
 */
export function generateMarkdownReport(
  result: CalculationResult,
  graph: AnalysisGraph,
  circuitName: string
): string {
  const sections: string[] = [];
  
  // 1. Header
  sections.push(generateHeader(circuitName, result.method));
  
  // 2. Spanning tree info
  sections.push(generateSpanningTreeInfo(graph));
  
  // 3. Method-specific sections
  if (result.method === 'nodal') {
    sections.push(generateNodalAnalysisSections(result, graph));
  } else {
    sections.push(generateLoopAnalysisSections(result, graph));
  }
  
  // 4. Final results
  sections.push(generateResultsTable(result, graph));
  
  // 5. Summary
  sections.push(generateSummary(result, graph));
  
  return sections.join('\n\n---\n\n');
}

/**
 * 📋 Generates the report header.
 */
function generateHeader(circuitName: string, method: 'nodal' | 'loop'): string {
  const timestamp = new Date().toLocaleString();
  const methodName = method === 'nodal' ? 'Nodal Analysis (Cut-Set Method)' : 'Loop Analysis (Tie-Set Method)';
  
  return `# Circuit Analysis Report

**Circuit:** ${circuitName}  
**Method:** ${methodName}  
**Generated:** ${timestamp}`;
}

/**
 * 🌳 Generates spanning tree information section.
 */
function generateSpanningTreeInfo(graph: AnalysisGraph): string {
  const selectedTree = graph.allSpanningTrees.find(
    tree => tree.id === graph.selectedTreeId
  );
  
  if (!selectedTree) {
    return '## Spanning Tree\n\nNo spanning tree selected.';
  }
  
  const twigLabels = selectedTree.twigBranchIds
    .map(id => getBranchLabel(graph, id) ?? '?')
    .join(', ');
  
  const linkLabels = selectedTree.linkBranchIds
    .map(id => getBranchLabel(graph, id) ?? '?')
    .join(', ');
  
  const numNodes = graph.nodes.length;
  const numBranches = graph.branches.length;
  const numTwigs = selectedTree.twigBranchIds.length;
  const numLinks = selectedTree.linkBranchIds.length;
  
  const numNodesStr = String(numNodes);
  const numBranchesStr = String(numBranches);
  const numTwigsStr = String(numTwigs);
  const numLinksStr = String(numLinks);
  
  return `## Spanning Tree

**Tree Branches (Twigs):** ${twigLabels} (${numTwigsStr} branches)  
**Co-tree Branches (Links):** ${linkLabels} (${numLinksStr} branches)

**Graph Statistics:**
- Nodes (N): ${numNodesStr}
- Branches (B): ${numBranchesStr}
- Twigs: N - 1 = ${numTwigsStr}
- Links: B - N + 1 = ${numLinksStr}`;
}

/**
 * ⚡ Generates nodal analysis sections.
 */
function generateNodalAnalysisSections(
  result: CalculationResult,
  _graph: AnalysisGraph
): string {
  const sections: string[] = [];
  
  // Incidence matrix
  if (result.incidenceMatrix) {
    const matrixLatex = matrixToLatex(result.incidenceMatrix);
    const equation = wrapInDisplayMath(`A = ${matrixLatex}`);
    sections.push(`## Reduced Incidence Matrix (A)

The reduced incidence matrix represents the connectivity of branches to non-reference nodes.

${equation}`);
  }
  
  // Branch admittance matrix
  if (result.branchAdmittanceMatrix) {
    const matrixLatex = matrixToLatex(result.branchAdmittanceMatrix);
    const equation = wrapInDisplayMath(`Y_B = ${matrixLatex}`);
    sections.push(`## Branch Admittance Matrix (Y_B)

The branch admittance matrix is diagonal, with Y_B[i][i] = 1/R for resistors.

${equation}`);
  }
  
  // Source vectors
  sections.push(generateSourceVectors(result));
  
  // System matrix and vector
  if (result.systemMatrix && result.systemVector) {
    const systemMatrixLatex = matrixToLatex(result.systemMatrix);
    const systemVectorLatex = matrixToLatex(result.systemVector);
    const eq1 = wrapInDisplayMath('Y_{node} = A Y_B A^T');
    const eq2 = wrapInDisplayMath(`Y_{node} = ${systemMatrixLatex}`);
    const eq3 = wrapInDisplayMath('I_{node} = A (I_B - Y_B E_B)');
    const eq4 = wrapInDisplayMath(`I_{node} = ${systemVectorLatex}`);
    
    sections.push(`## System Equations

The node admittance matrix and current vector are computed as:

${eq1}

${eq2}

${eq3}

${eq4}`);
  }
  
  // Solution
  if (result.nodeVoltages) {
    const nodeVoltagesLatex = matrixToLatex(result.nodeVoltages);
    const eq1 = wrapInDisplayMath('Y_{node} E_N = I_{node}');
    const eq2 = wrapInDisplayMath(`E_N = ${nodeVoltagesLatex}`);
    
    sections.push(`## Node Voltages Solution

Solving the system ${eq1}:

${eq2}`);
  }
  
  return sections.join('\n\n');
}

/**
 * 🔄 Generates loop analysis sections.
 */
function generateLoopAnalysisSections(
  result: CalculationResult,
  graph: AnalysisGraph
): string {
  const sections: string[] = [];
  
  // Tie-set matrix
  if (result.tieSetMatrix) {
    sections.push(`## Tie-Set Matrix (B)

The tie-set matrix represents the fundamental loops defined by the links.

${wrapInDisplayMath(`B = ${matrixToLatex(result.tieSetMatrix)}`)}

**Fundamental Loops:**`);
    
    // Add loop descriptions
    const selectedTree = graph.allSpanningTrees.find(
      tree => tree.id === graph.selectedTreeId
    );
    
    if (selectedTree) {
      const loopDescriptions = selectedTree.linkBranchIds.map((_, index) => {
        const description = generateLoopDescription(index, graph);
        const color = getLoopColor(index);
        return `- <span style="color: ${color}">●</span> ${description}`;
      });
      
      sections.push(loopDescriptions.join('\n'));
    }
  }
  
  // Branch impedance matrix
  if (result.branchImpedanceMatrix) {
    const matrixLatex = matrixToLatex(result.branchImpedanceMatrix);
    const equation = wrapInDisplayMath(`Z_B = ${matrixLatex}`);
    
    sections.push(`## Branch Impedance Matrix (Z_B)

The branch impedance matrix is diagonal, with Z_B[i][i] = R for resistors.

${equation}`);
  }
  
  // Source vectors
  sections.push(generateSourceVectors(result));
  
  // System matrix and vector
  if (result.systemMatrix && result.systemVector) {
    const systemMatrixLatex = matrixToLatex(result.systemMatrix);
    const systemVectorLatex = matrixToLatex(result.systemVector);
    const eq1 = wrapInDisplayMath('Z_{loop} = B Z_B B^T');
    const eq2 = wrapInDisplayMath(`Z_{loop} = ${systemMatrixLatex}`);
    const eq3 = wrapInDisplayMath('E_{loop} = B E_B - B Z_B I_B');
    const eq4 = wrapInDisplayMath(`E_{loop} = ${systemVectorLatex}`);
    
    sections.push(`## System Equations

The loop impedance matrix and voltage vector are computed as:

${eq1}

${eq2}

${eq3}

${eq4}`);
  }
  
  // Solution
  if (result.loopCurrents) {
    const loopCurrentsLatex = matrixToLatex(result.loopCurrents);
    const eq1 = wrapInDisplayMath('Z_{loop} I_L = E_{loop}');
    const eq2 = wrapInDisplayMath(`I_L = ${loopCurrentsLatex}`);
    
    sections.push(`## Loop Currents Solution

Solving the system ${eq1}:

${eq2}`);
  }
  
  return sections.join('\n\n');
}

/**
 * 🔋 Generates source vectors section.
 */
function generateSourceVectors(result: CalculationResult): string {
  const parts: string[] = ['## Source Vectors'];
  
  if (result.branchVoltageSources) {
    const matrixLatex = matrixToLatex(result.branchVoltageSources);
    const equation = wrapInDisplayMath(`E_B = ${matrixLatex}`);
    parts.push(`**Branch Voltage Sources (E_B):**

${equation}`);
  }
  
  if (result.branchCurrentSources) {
    const matrixLatex = matrixToLatex(result.branchCurrentSources);
    const equation = wrapInDisplayMath(`I_B = ${matrixLatex}`);
    parts.push(`**Branch Current Sources (I_B):**

${equation}`);
  }
  
  return parts.join('\n\n');
}

/**
 * 📊 Generates final results table.
 */
function generateResultsTable(result: CalculationResult, graph: AnalysisGraph): string {
  const branchVoltages = result.branchVoltages.valueOf() as number[][];
  const branchCurrents = result.branchCurrents.valueOf() as number[][];
  
  const rows = graph.branches.map((branch, index) => {
    const label = getBranchLabel(graph, branch.id) ?? '?';
    const voltage = branchVoltages[index]?.[0] ?? 0;
    const current = branchCurrents[index]?.[0] ?? 0;
    const type = formatBranchType(branch.type);
    const value = formatBranchValue(branch);
    
    return `| ${label} | ${type} | ${value} | ${voltage.toFixed(3)} V | ${current.toFixed(3)} A |`;
  });
  
  return `## Final Results

| Branch | Type | Value | Voltage | Current |
|--------|------|-------|---------|---------|
${rows.join('\n')}`;
}

/**
 * 📝 Generates summary section.
 */
function generateSummary(result: CalculationResult, graph: AnalysisGraph): string {
  const numNodes = graph.nodes.length;
  const numBranches = graph.branches.length;
  const method = result.method === 'nodal' ? 'Nodal Analysis' : 'Loop Analysis';
  
  const numNodesStr = String(numNodes);
  const numBranchesStr = String(numBranches);
  
  return `## Summary

Successfully completed ${method} for circuit with ${numNodesStr} nodes and ${numBranchesStr} branches.

All branch voltages and currents have been calculated and satisfy:
- Kirchhoff's Current Law (KCL) at all nodes
- Kirchhoff's Voltage Law (KVL) around all loops
- Branch constitutive relations (Ohm's law for resistors)`;
}

/**
 * 🏷️ Gets the standard label for a branch (a, b, c, ...).
 */
function getBranchLabel(graph: AnalysisGraph, branchId: string): string | undefined {
  const index = graph.branches.findIndex(b => b.id === branchId);
  
  if (index === -1) {
    return undefined;
  }
  
  return String.fromCharCode(97 + index);
}

/**
 * 🔧 Formats branch type for display.
 */
function formatBranchType(type: 'resistor' | 'voltageSource' | 'currentSource'): string {
  const typeMap: Record<string, string> = {
    resistor: 'Resistor',
    voltageSource: 'Voltage Source',
    currentSource: 'Current Source',
  };
  
  return typeMap[type] ?? type;
}

/**
 * 📏 Formats branch value for display.
 */
function formatBranchValue(branch: { type: 'resistor' | 'voltageSource' | 'currentSource'; value: number }): string {
  const valueStr = String(branch.value);
  
  const unitMap: Record<string, string> = {
    resistor: 'Ω',
    voltageSource: 'V',
    currentSource: 'A',
  };
  
  const unit = unitMap[branch.type] ?? '';
  return `${valueStr} ${unit}`;
}
