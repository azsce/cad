/**
 * 📄 Markdown report generator for circuit analysis.
 *
 * Generates comprehensive step-by-step analysis reports with LaTeX formatting
 * following the conventions.
 *
 * - Nodal Analysis (Cut-Set Method): Uses incidence matrix A and admittance matrix Y_B
 * - Loop Analysis (Tie-Set Method): Uses tie-set matrix B and impedance matrix Z_B
 */

import type { CalculationResult, AnalysisGraph } from "../../../types/analysis";
import type { Matrix } from "mathjs";
import { formatValue } from "./matrixToLatex";
import { wrapInDisplayMath } from "./formatEquation";
import { generateLoopDescription, getLoopColor } from "./generateLoopDescription";
import {
  matrixToTableWithBrackets,
  matrixToVectorTable,
  matrixToDiagonalTable,
  getBranchLabels,
  getNodeLabels,
  createRowLabel,
  createRowLabels,
  createColumnLabels,
  createValueLabel,
  createBranchCount,
  createNodeCount,
  createMatrixData,
  ReferenceNodeInclusion,
} from "./matrixToTable";

/**
 * Generates a complete Markdown report for circuit analysis results.
 *
 * The report includes:
 * 1. Header with circuit name, method, and timestamp
 * 2. Selected spanning tree information (twigs and links)
 * 3. Topology matrices (A for nodal, B for loop) with LaTeX
 * 4. Branch impedance/admittance matrices (Z_B or Y_B)
 * 5. Source vectors (E_B and I_B)
 * 6. System matrix and vector
 * 7. Solution vector (E_N for nodal, I_L for loop)
 * 8. Final results table (branch voltages V_B and currents J_B)
 * 9. Summary section
 *
 * @param result - The calculation result
 * @param graph - The analysis graph
 * @param circuitName - Name of the circuit
 * @returns Markdown-formatted report string
 */
export function generateMarkdownReport(result: CalculationResult, graph: AnalysisGraph, circuitName: string): string {
  const sections: string[] = [
    generateHeader(circuitName, result.method),
    generateSpanningTreeInfo(graph),
    result.method === "nodal"
      ? generateNodalAnalysisSections(result, graph)
      : generateLoopAnalysisSections(result, graph),
    generateResultsTable(result, graph),
    generateSummary(result, graph),
  ];

  return sections.join("\n\n---\n\n");
}

/**
 * 📋 Generates the report header.
 *
 * - Nodal Analysis uses the cut-set method
 * - Loop Analysis uses the tie-set method
 */
function generateHeader(circuitName: string, method: "nodal" | "loop"): string {
  const timestamp = new Date().toLocaleString();
  const methodName = method === "nodal" ? "Nodal Analysis (Cut-Set Method)" : "Loop Analysis (Tie-Set Method)";

  return `# Circuit Analysis Report

**Circuit:** ${circuitName}  
**Method:** ${methodName}  
**Generated:** ${timestamp}`;
}

/**
 * 🌳 Generates spanning tree information section.
 *
 * - Tree branches (twigs): N - 1 branches
 * - Co-tree branches (links): B - N + 1 branches
 * - Number of links = B - N + 1
 */
function generateSpanningTreeInfo(graph: AnalysisGraph): string {
  const selectedTree = graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);

  if (!selectedTree) {
    return "## Spanning Tree\n\nNo spanning tree selected.";
  }

  const twigLabels = selectedTree.twigBranchIds.map(id => getBranchLabel(graph, id) ?? "?").join(", ");
  const linkLabels = selectedTree.linkBranchIds.map(id => getBranchLabel(graph, id) ?? "?").join(", ");

  const numNodes = graph.nodes.length;
  const numBranches = graph.branches.length;
  const numTwigs = selectedTree.twigBranchIds.length;
  const numLinks = selectedTree.linkBranchIds.length;

  const numNodesStr = String(numNodes);
  const numBranchesStr = String(numBranches);
  const numTwigsStr = String(numTwigs);
  const numLinksStr = String(numLinks);

  const nodesEq = wrapInDisplayMath("N = " + numNodesStr);
  const branchesEq = wrapInDisplayMath("B = " + numBranchesStr);
  const twigsEq = wrapInDisplayMath("T = N - 1 = " + numTwigsStr);
  const linksEq = wrapInDisplayMath("L = B - N + 1 = " + numLinksStr);

  return `## Spanning Tree

**Tree Branches (Twigs):** ${twigLabels} (${numTwigsStr} branches)  
**Co-tree Branches (Links):** ${linkLabels} (${numLinksStr} branches)

**Graph Statistics:**
- Nodes: ${nodesEq}
- Branches: ${branchesEq}
- Twigs: ${twigsEq}
- Links: ${linksEq}`;
}

/**
 * ⚡ Generates nodal analysis sections.
 */
function generateNodalAnalysisSections(result: CalculationResult, graph: AnalysisGraph): string {
  const sections: string[] = [];

  // Incidence matrix
  if (result.incidenceMatrix) {
    const numNodes = graph.nodes.length;
    const numBranches = graph.branches.length;
    const nodeLabels = getNodeLabels({
      numNodes: createNodeCount(numNodes),
      referenceNodeInclusion: ReferenceNodeInclusion.EXCLUDE,
    });
    const branchLabels = getBranchLabels(createBranchCount(numBranches));
    const matrixTable = matrixToTableWithBrackets({
      matrix: createMatrixData(result.incidenceMatrix),
      rowHeaders: createRowLabels(nodeLabels.map(String)),
      colHeaders: branchLabels,
      rowLabel: createRowLabel("Node"),
    });

    sections.push(`## Reduced Incidence Matrix (A)

The reduced incidence matrix represents the connectivity of branches to non-reference nodes.
- ${wrapInDisplayMath("A[i][j] = +1")} if branch ${wrapInDisplayMath("j")} current is leaving node ${wrapInDisplayMath("i")}
- ${wrapInDisplayMath("A[i][j] = -1")} if branch ${wrapInDisplayMath("j")} current is entering node ${wrapInDisplayMath("i")}
- ${wrapInDisplayMath("A[i][j] = 0")} otherwise

${matrixTable}`);
  }

  // Branch admittance matrix
  if (result.branchAdmittanceMatrix) {
    const numBranches = graph.branches.length;
    const branchLabels = getBranchLabels(createBranchCount(numBranches));
    const matrixTable = matrixToDiagonalTable({
      matrix: createMatrixData(result.branchAdmittanceMatrix),
      rowHeaders: createRowLabels(branchLabels.map(String)),
      rowLabel: createRowLabel("Branch"),
      valueLabel: createValueLabel("Admittance (S)"),
    });

    sections.push(`## Branch Admittance Matrix (Y_B)

The branch admittance matrix is diagonal, with ${wrapInDisplayMath("Y_B[i][i] = \\frac{1}{R}")} for resistors, ${wrapInDisplayMath("0")} for sources.

${matrixTable}`);
  }

  // Source vectors
  sections.push(generateSourceVectors(result));

  // System matrix and vector
  if (result.systemMatrix && result.systemVector) {
    const numNodes = graph.nodes.length;
    const nodeLabels = getNodeLabels({
      numNodes: createNodeCount(numNodes),
      referenceNodeInclusion: ReferenceNodeInclusion.EXCLUDE,
    });

    const systemMatrixTable = matrixToTableWithBrackets({
      matrix: createMatrixData(result.systemMatrix),
      rowHeaders: createRowLabels(nodeLabels.map(String)),
      colHeaders: createColumnLabels(nodeLabels.map(String)),
      rowLabel: createRowLabel("Node"),
    });
    const systemVectorTable = matrixToVectorTable({
      vector: createMatrixData(result.systemVector),
      rowHeaders: createRowLabels(nodeLabels.map(String)),
      rowLabel: createRowLabel("Node"),
      valueLabel: createValueLabel("Current (A)"),
    });

    const eq1 = wrapInDisplayMath("Y_{node} = A \\cdot Y_B \\cdot A^T");
    const eq3 = wrapInDisplayMath("I_{node} = A \\cdot (I_B - Y_B \\cdot E_B)");

    sections.push(`## System Equations

The node admittance matrix and current vector are computed as:

${eq1}

${systemMatrixTable}

${eq3}

${systemVectorTable}`);
  }

  // Solution
  if (result.nodeVoltages) {
    const numNodes = graph.nodes.length;
    const nodeLabels = getNodeLabels({
      numNodes: createNodeCount(numNodes),
      referenceNodeInclusion: ReferenceNodeInclusion.EXCLUDE,
    });
    const nodeVoltagesTable = matrixToVectorTable({
      vector: createMatrixData(result.nodeVoltages),
      rowHeaders: createRowLabels(nodeLabels.map(String)),
      rowLabel: createRowLabel("Node"),
      valueLabel: createValueLabel("Voltage (V)"),
    });

    const eq1 = wrapInDisplayMath("Y_{node} \\cdot E_N = I_{node}");

    sections.push(`## Node Voltages Solution

Solving the system ${eq1}:

${nodeVoltagesTable}`);
  }

  return sections.join("\n\n");
}

/**
 * 🔄 Generates loop analysis sections.
 */
function generateLoopAnalysisSections(result: CalculationResult, graph: AnalysisGraph): string {
  const sections: string[] = [];

  if (result.tieSetMatrix) {
    sections.push(generateTieSetMatrixSection(result.tieSetMatrix, graph));
  }

  if (result.branchImpedanceMatrix) {
    sections.push(generateBranchImpedanceSection(result.branchImpedanceMatrix, graph));
  }

  sections.push(generateSourceVectors(result));

  if (result.systemMatrix && result.systemVector) {
    sections.push(generateLoopSystemEquations(result, graph));
  }

  if (result.loopCurrents) {
    sections.push(generateLoopCurrentsSolution(result.loopCurrents, graph));
  }

  return sections.join("\n\n");
}

/**
 * 🔗 Generates tie-set matrix section.
 */
function generateTieSetMatrixSection(tieSetMatrix: Matrix, graph: AnalysisGraph): string {
  const selectedTree = graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);
  const numBranches = graph.branches.length;
  const branchLabels = getBranchLabels(createBranchCount(numBranches));
  const linkLabels = createRowLabels(getLinkLabels(selectedTree, graph));

  const matrixTable = matrixToTableWithBrackets({
    matrix: createMatrixData(tieSetMatrix),
    rowHeaders: linkLabels,
    colHeaders: branchLabels,
    rowLabel: createRowLabel("Link"),
  });

  const parts = [`## Tie-Set Matrix (B)

The tie-set matrix represents the fundamental loops (f-loops) defined by the links.
- Each row represents one f-loop (one link + tree branches)
- ${wrapInDisplayMath("B[i][j] = +1")} for the link that defines f-loop ${wrapInDisplayMath("i")}
- ${wrapInDisplayMath("B[i][j] = +1")} if tree branch ${wrapInDisplayMath("j")} has same direction as link
- ${wrapInDisplayMath("B[i][j] = -1")} if tree branch ${wrapInDisplayMath("j")} has opposite direction to link

${matrixTable}

**Fundamental Loops (f-loops):**`];

  if (selectedTree) {
    const loopDescriptions = selectedTree.linkBranchIds.map((_, index) => {
      const description = generateLoopDescription(index, graph);
      const color = getLoopColor(index);
      return `- <span style="color: ${color}">●</span> ${description}`;
    });
    parts.push(loopDescriptions.join("\n"));
  }

  return parts.join("\n\n");
}

/**
 * 🔧 Generates branch impedance matrix section.
 */
function generateBranchImpedanceSection(branchImpedanceMatrix: Matrix, graph: AnalysisGraph): string {
  const numBranches = graph.branches.length;
  const branchLabels = getBranchLabels(createBranchCount(numBranches));
  const matrixTable = matrixToDiagonalTable({
    matrix: createMatrixData(branchImpedanceMatrix),
    rowHeaders: createRowLabels(branchLabels.map(String)),
    rowLabel: createRowLabel("Branch"),
    valueLabel: createValueLabel("Impedance (Ω)"),
  });

  return `## Branch Impedance Matrix (Z_B)

The branch impedance matrix is diagonal, with ${wrapInDisplayMath("Z_B[i][i] = R")} for resistors, ${wrapInDisplayMath("0")} for ideal sources.

${matrixTable}`;
}

/**
 * ⚡ Generates loop system equations section.
 */
function generateLoopSystemEquations(result: CalculationResult, graph: AnalysisGraph): string {
  if (!result.systemMatrix || !result.systemVector) {
    return "";
  }

  const selectedTree = graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);
  const linkLabelsStr = getLinkLabels(selectedTree, graph);
  const linkLabelsRow = createRowLabels(linkLabelsStr);
  const linkLabelsCol = createColumnLabels(linkLabelsStr);

  const systemMatrixTable = matrixToTableWithBrackets({
    matrix: createMatrixData(result.systemMatrix),
    rowHeaders: linkLabelsRow,
    colHeaders: linkLabelsCol,
    rowLabel: createRowLabel("Loop"),
  });
  const systemVectorTable = matrixToVectorTable({
    vector: createMatrixData(result.systemVector),
    rowHeaders: linkLabelsRow,
    rowLabel: createRowLabel("Loop"),
    valueLabel: createValueLabel("Voltage (V)"),
  });

  const eq1 = wrapInDisplayMath("Z_{loop} = B \\cdot Z_B \\cdot B^T");
  const eq3 = wrapInDisplayMath("E_{loop} = B \\cdot E_B - B \\cdot Z_B \\cdot I_B");

  return `## System Equations

The loop impedance matrix and voltage vector are computed as:

${eq1}

${systemMatrixTable}

${eq3}

${systemVectorTable}`;
}

/**
 * 🔄 Generates loop currents solution section.
 */
function generateLoopCurrentsSolution(loopCurrents: Matrix, graph: AnalysisGraph): string {
  const selectedTree = graph.allSpanningTrees.find(tree => tree.id === graph.selectedTreeId);
  const linkLabels = createRowLabels(getLinkLabels(selectedTree, graph));

  const loopCurrentsTable = matrixToVectorTable({
    vector: createMatrixData(loopCurrents),
    rowHeaders: linkLabels,
    rowLabel: createRowLabel("Loop"),
    valueLabel: createValueLabel("Current (A)"),
  });
  const eq1 = wrapInDisplayMath("Z_{loop} \\cdot I_L = E_{loop}");

  return `## Loop Currents Solution

Solving the system ${eq1}:

${loopCurrentsTable}`;
}

/**
 * 🏷️ Gets link labels from selected tree.
 */
function getLinkLabels(
  selectedTree: { linkBranchIds: string[] } | undefined,
  graph: AnalysisGraph
): string[] {
  if (!selectedTree) {
    return [];
  }

  const numBranches = graph.branches.length;
  const branchLabels = getBranchLabels(createBranchCount(numBranches));

  return selectedTree.linkBranchIds.map(id => {
    const index = graph.branches.findIndex(b => b.id === id);
    const label = branchLabels[index];
    return label ? String(label) : "?";
  });
}

/**
 * 🔋 Generates source vectors section.
 */
function generateSourceVectors(result: CalculationResult): string {
  const parts: string[] = ["## Source Vectors"];

  if (result.branchVoltageSources) {
    const numBranches = (result.branchVoltageSources.valueOf() as number[][]).length;
    const branchLabels = getBranchLabels(createBranchCount(numBranches));
    const vectorTable = matrixToVectorTable({
      vector: createMatrixData(result.branchVoltageSources),
      rowHeaders: createRowLabels(branchLabels.map(String)),
      rowLabel: createRowLabel("Branch"),
      valueLabel: createValueLabel("Voltage (V)"),
    });
    parts.push(
      `**Branch Voltage Sources (E_B):**

${vectorTable}`
    );
  }

  if (result.branchCurrentSources) {
    const numBranches = (result.branchCurrentSources.valueOf() as number[][]).length;
    const branchLabels = getBranchLabels(createBranchCount(numBranches));
    const vectorTable = matrixToVectorTable({
      vector: createMatrixData(result.branchCurrentSources),
      rowHeaders: createRowLabels(branchLabels.map(String)),
      rowLabel: createRowLabel("Branch"),
      valueLabel: createValueLabel("Current (A)"),
    });
    parts.push(
      `**Branch Current Sources (I_B):**

${vectorTable}`
    );
  }

  return parts.join("\n\n");
}

/**
 * 📊 Generates final results table as HTML.
 */
function generateResultsTable(result: CalculationResult, graph: AnalysisGraph): string {
  const branchVoltages = result.branchVoltages.valueOf() as number[][];
  const branchCurrents = result.branchCurrents.valueOf() as number[][];

  const rows = graph.branches.map((branch, index) => {
    const label = getBranchLabel(graph, branch.id) ?? "?";
    const voltage = branchVoltages[index]?.[0] ?? 0;
    const current = branchCurrents[index]?.[0] ?? 0;
    const type = formatBranchType(branch.type);
    const value = formatBranchValue(branch);

    return `<tr>
<td style="text-align: center; padding: 8px; font-weight: bold;">${label}</td>
<td style="text-align: center; padding: 8px;">${type}</td>
<td style="text-align: center; padding: 8px;">${value}</td>
<td style="text-align: center; padding: 8px;"><span class="math math-inline">${formatValue(voltage)}</span> V</td>
<td style="text-align: center; padding: 8px;"><span class="math math-inline">${formatValue(current)}</span> A</td>
</tr>`;
  });

  const tableRows = rows.join("\n");

  return `## Final Results

<table style="border-collapse: collapse; margin: 20px 0; width: 100%;">
<thead>
<tr>
<th style="text-align: center; padding: 8px; font-weight: bold; border-bottom: 2px solid #333;">Branch</th>
<th style="text-align: center; padding: 8px; font-weight: bold; border-bottom: 2px solid #333;">Type</th>
<th style="text-align: center; padding: 8px; font-weight: bold; border-bottom: 2px solid #333;">Value</th>
<th style="text-align: center; padding: 8px; font-weight: bold; border-bottom: 2px solid #333;">Voltage</th>
<th style="text-align: center; padding: 8px; font-weight: bold; border-bottom: 2px solid #333;">Current</th>
</tr>
</thead>
<tbody>
${tableRows}
</tbody>
</table>`;
}

/**
 * 📝 Generates summary section.
 *
 * - KCL: A * J_B = 0 (nodal analysis)
 * - KVL: B * V_B = 0 (loop analysis)
 */
function generateSummary(result: CalculationResult, graph: AnalysisGraph): string {
  const numNodes = graph.nodes.length;
  const numBranches = graph.branches.length;
  const method = result.method === "nodal" ? "Nodal Analysis" : "Loop Analysis";

  const numNodesStr = String(numNodes);
  const numBranchesStr = String(numBranches);

  return `## Summary

Successfully completed ${method} for circuit with ${numNodesStr} nodes and ${numBranchesStr} branches.

All branch voltages ${wrapInDisplayMath("V_B")} and currents ${wrapInDisplayMath("J_B")} have been calculated and satisfy:
- Kirchhoff's Current Law (KCL): ${wrapInDisplayMath("A \\cdot J_B = 0")} at all nodes
- Kirchhoff's Voltage Law (KVL): ${wrapInDisplayMath("B \\cdot V_B = 0")} around all loops
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

  return String.fromCodePoint(97 + index);
}

/**
 * 🔧 Formats branch type for display.
 */
function formatBranchType(type: "resistor" | "voltageSource" | "currentSource"): string {
  const typeMap: Record<string, string> = {
    resistor: "Resistor",
    voltageSource: "Voltage Source",
    currentSource: "Current Source",
  };

  return typeMap[type] ?? type;
}

/**
 * 📏 Formats branch value for display.
 */
function formatBranchValue(branch: { type: "resistor" | "voltageSource" | "currentSource"; value: number }): string {
  const valueStr = String(branch.value);

  const unitMap: Record<string, string> = {
    resistor: "Ω",
    voltageSource: "V",
    currentSource: "A",
  };

  const unit = unitMap[branch.type] ?? "";
  return `${valueStr} ${unit}`;
}
