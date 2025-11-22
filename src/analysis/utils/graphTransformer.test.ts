import { describe, it, expect } from "bun:test";
import { createAnalysisGraph } from "./graphTransformer";
import type { Circuit, CircuitNode, CircuitEdge } from "../../types/circuit";
import { createCircuitId, createNodeId, createEdgeId } from "../../types/identifiers";
import { logger } from "../../utils/logger";

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                          CIRCUIT TOPOLOGY VISUALIZATION                                       ║
 * ║                     (Based on graphTransformer.test.png)                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * This test circuit represents a complex DC electrical network with:
 * - 5 Resistors (R1=30Ω, R2=5Ω, R3=10Ω, R4=10Ω, R5=20Ω)
 * - 1 Voltage Source (V1=20V, pointing up)
 * - 1 Current Source (I1=4A, pointing up)
 * - 5 Junction nodes (electrical connection points)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 * │                                  CIRCUIT DIAGRAM                                            │
 * └─────────────────────────────────────────────────────────────────────────────────────────────┘
 *
*       ┌────────────────────────[ R1 : 30Ω ]─────────────────────────┐
 *      │                                                             │
 *      │                                                             │
 *      │                                                             │
 *      │ Node_A                                                      │ Node_C
 *      ●──────────[ R2 : 5Ω ]──────────●──────────[ R3 : 10Ω ]───────●──────────────┐
 *      │                             Node_B                          │              │
 *      │                               │                             │              │
 *      (+)                             │                             │             (↑)
 *      [V1 : 20V]                  [R4 : 10Ω]                    [R5 : 20Ω]      [I1 : 4A]
 *      (-)                             │                             │              │
 *      │                               │                             │              │
 *      │                               │                             │              │
 *      │                             Node_D                        Node_E           │
 *      └───────────────────────────────●─────────────────────────────●──────────────┘
 *
 * KEY OBSERVATIONS:
 *   • The circuit forms a RECTANGULAR OUTER LOOP (left rail → top → right rail → bottom)
 *   • V1 (20V) is on the LEFT vertical rail between Node_A and Node_D
 *   • I1 (4A) is on the RIGHT vertical rail (extends beyond Node_C and Node_E)
 *   • R1 (30Ω) is on the TOP horizontal rail between Node_A and Node_C
 *   • The BOTTOM rail connects Node_D (J_center_bottom) to Node_E (J_right_bottom)
 *   • R2 (5Ω), R3 (10Ω) form a MIDDLE horizontal path through Node_B
 *   • R4 (10Ω) is a VERTICAL resistor connecting Node_B to Node_D
 *   • R5 (20Ω) is a VERTICAL resistor connecting Node_C to Node_E
 *   • There are 5 electrical nodes (Node_A through Node_E) formed by junctions
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 * │                              COMPONENT DETAILS                                              │
 * └─────────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * RESISTORS (5):
 *   R1_top_30ohm     : 30Ω  - Top horizontal resistor connecting left and right sides
 *   R2_left_5ohm     : 5Ω   - Left middle resistor connecting J_left_top to J_center_top
 *   R3_right_10ohm   : 10Ω  - Right middle resistor connecting J_center_top to J_right_top
 *   R4_center_10ohm  : 10Ω  - Center vertical resistor (rotated 270°) connecting top to bottom
 *   R5_right_20ohm   : 20Ω  - Right vertical resistor (rotated 270°) connecting top to bottom
 *
 * SOURCES (2):
 *   V1_left_20v      : 20V  - Voltage source on left side (direction: up, + on top)
 *   I1_right_4a      : 4A   - Current source on right side (direction: up, arrow pointing up)
 *
 * JUNCTIONS (5 electrical nodes):
 *   ┌────────────┬──────────────────┬─────────────────────────────────────────────────────────┐
 *   │ Diagram ID │ Code Identifier  │ Description                                             │
 *   ├────────────┼──────────────────┼─────────────────────────────────────────────────────────┤
 *   │ Node_A     │ J_left_top       │ Left-top junction - connects R1, R2, and V1             │
 *   │ Node_B     │ J_center_top     │ Center-top junction - connects R2, R3, and R4           │
 *   │ Node_C     │ J_right_top      │ Right-top junction - connects R1, R3, R5, and I1        │
 *   │ Node_D     │ J_center_bottom  │ Center-bottom junction - connects V1, R4, bottom rail   │
 *   │ Node_E     │ J_right_bottom   │ Right-bottom junction - connects R5, I1, bottom rail    │
 *   └────────────┴──────────────────┴─────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 * │                            GRAPH THEORY ANALYSIS                                            │
 * └─────────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * BRANCHES (b = 6):
 *   Each resistor and voltage source represents one branch in the analysis graph.
 *   current sources are replaced with open circuits (excluded from graph).
 *   Branch 1: R1_top_30ohm     (30Ω)
 *   Branch 2: R2_left_5ohm     (5Ω)
 *   Branch 3: R3_right_10ohm   (10Ω)
 *   Branch 4: V1_left_20v      (20V voltage source)
 *   Branch 5: R4_center_10ohm  (10Ω)
 *   Branch 6: R5_right_20ohm   (20Ω)
 *   Note: I1_right_4a (4A current source) is NOT included as a branch
 *
 * NODES (n):
 *   Electrical nodes are formed by junctions and their connected components
 *   The exact node count depends on how the graph transformer identifies unique nodes
 *
 * EXPECTED GRAPH PROPERTIES:
 *   - Number of branches (b): 6 (current sources excluded
 *   - Number of independent loops: b - n + 1 (depends on node count)
 *   - Number of independent cut-sets: n - 1 (depends on node count)
 *   - Spanning trees: Multiple possible spanning trees for this circuit
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 * │                              CONNECTION MATRIX                                              │
 * └─────────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * EDGE CONNECTIONS (16 edges total):
 *
 *   TOP RAIL (R1 connections):
 *     R1_to_J_left_top         : R1 (left)  → Node_A (J_left_top)
 *     R1_to_J_right_top        : R1 (right) → Node_C (J_right_top)
 *
 *   LEFT RAIL (V1 and R2 connections):
 *     R2_to_J_left_top         : R2 (left)  → Node_A (J_left_top)
 *     R2_to_J_center_top       : R2 (right) → Node_B (J_center_top)
 *     J_left_top_to_V1         : Node_A (J_left_top) → V1 (top)
 *     V1_to_J_center_bottom    : V1 (bottom) → Node_D (J_center_bottom)
 *
 *   CENTER SECTION (R3 and R4 connections):
 *     J_center_top_to_R3       : Node_B (J_center_top) → R3 (left)
 *     R4_to_J_center_top       : R4 (top) → Node_B (J_center_top)
 *     R4_to_J_center_bottom    : R4 (bottom) → Node_D (J_center_bottom)
 *
 *   RIGHT RAIL (R5 and I1 connections):
 *     R3_to_J_right_top        : R3 (right) → Node_C (J_right_top)
 *     J_right_top_to_R5        : Node_C (J_right_top) → R5 (top)
 *     R5_to_J_right_bottom     : R5 (bottom) → Node_E (J_right_bottom)
 *     I1_to_J_right_top        : I1 (top) → Node_C (J_right_top)
 *     J_right_bottom_to_I1     : Node_E (J_right_bottom) → I1 (bottom)
 *
 *   BOTTOM RAIL (horizontal connection):
 *     J_center_bottom_to_J_right_bottom : Node_D → Node_E (horizontal wire)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 * │                            ANALYSIS EXPECTATIONS                                            │
 * └─────────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * This circuit should produce:
 *   ✓ 6 branches (resistors and voltage sources only, current sources excluded)
 *   ✓ Multiple spanning trees (for tie-set analysis)
 *   ✓ Multiple independent loops (for mesh/loop analysis)
 *   ✓ Multiple independent cut-sets (for nodal analysis)
 *   ✓ Valid incidence matrix (branch-to-node relationships)
 *   ✓ Valid adjacency matrix (node-to-node connections)
 *
 * The graph transformer should correctly:
 *   1. Identify 6 components as branches (excluding current sources)
 *   2. Merge junction nodes with their connected components
 *   3. Build the graph adjacency structure
 *   4. Generate all possible spanning trees
 *   5. Prepare data for nodal and loop analysis
 */

const circuitNodes: CircuitNode[] = [
        // ═══════════════════════════════════════════════════════════════
        // RESISTORS (5 components)
        // ═══════════════════════════════════════════════════════════════
        {
            id: createNodeId("R1_top_30ohm"),
            type: "resistor",
            position: { x: 447.6319932421969, y: 177.84520325670104 },
            data: { value: 30, label: "R1_top_30ohm" },
            measured: { width: 100, height: 50 },
        },
        {
            id: createNodeId("R2_left_5ohm"),
            type: "resistor",
            position: { x: 308.87104009776044, y: 332.7553350706364 },
            data: { value: 5, label: "R2_left_5ohm" },
            measured: { width: 100, height: 50 },
        },
        {
            id: createNodeId("R3_right_10ohm"),
            type: "resistor",
            position: { x: 600.9338716606708, y: 336.06051026552916 },
            data: { value: 10, label: "R3_right_10ohm" },
            measured: { width: 100, height: 50 },
        },
        // ═══════════════════════════════════════════════════════════════
        // VOLTAGE SOURCES (1 component)
        // ═══════════════════════════════════════════════════════════════
        {
            id: createNodeId("V1_left_20v"),
            type: "voltageSource",
            position: { x: 197.04133120473642, y: 451.9669358303354 },
            data: { value: 20, direction: "up", label: "V1_left_20v" },
            measured: { width: 50, height: 100 },
        },
        {
            id: createNodeId("R4_center_10ohm"),
            type: "resistor",
            position: { x: 463.0413312047364, y: 452.6336024970021 },
            data: { value: 10, label: "R4_center_10ohm", rotation: 270 },
            measured: { width: 100, height: 50 },
        },
        {
            id: createNodeId("R5_right_20ohm"),
            type: "resistor",
            position: { x: 727.7079978714029, y: 451.3002691636687 },
            data: { value: 20, label: "R5_right_20ohm", rotation: 270 },
            measured: { width: 100, height: 50 },
        },
        // ═══════════════════════════════════════════════════════════════
        // CURRENT SOURCES (1 component)
        // ═══════════════════════════════════════════════════════════════
        {
            id: createNodeId("I1_right_4a"),
            type: "currentSource",
            position: { x: 873.0413312047364, y: 449.3002691636687 },
            data: { value: 4, direction: "up", label: "I1_right_4a" },
            measured: { width: 50, height: 100 },
        },
        // ═══════════════════════════════════════════════════════════════
        // JUNCTIONS (5 electrical connection points)
        // ═══════════════════════════════════════════════════════════════
        {
            id: createNodeId("J_center_top"),
            type: "junction",
            position: { x: 487.971893541976, y: 357.7553350706364 },
            width: 1,
            height: 1,
            data: { isHighlighted: false },
            measured: { width: 1, height: 1 },
        },
        {
            id: createNodeId("J_right_bottom"),
            type: "junction",
            position: { x: 752.6385602086426, y: 602.633602497002 },
            width: 1,
            height: 1,
            data: { isHighlighted: false },
            measured: { width: 1, height: 1 },
        },
        {
            id: createNodeId("J_center_bottom"),
            type: "junction",
            position: { x: 486.6385602086427, y: 602.633602497002 },
            width: 1,
            height: 1,
            data: { isHighlighted: false },
            measured: { width: 1, height: 1 },
        },
        {
            id: createNodeId("J_right_top"),
            type: "junction",
            position: { x: 752.860809557601, y: 363.3002691636687 },
            width: 1,
            height: 1,
            data: { isHighlighted: false },
            measured: { width: 1, height: 1 },
        },
        {
            id: createNodeId("J_left_top"),
            type: "junction",
            position: { x: 226.63856020864264, y: 351.9669358303354 },
            width: 1,
            height: 1,
            data: { isHighlighted: false },
            measured: { width: 1, height: 1 },
        },
    ];

const circuitEdges: CircuitEdge[] = [
        // ═══════════════════════════════════════════════════════════════
        // LEFT SECTION CONNECTIONS (R2, V1, J_left_top)
        // ═══════════════════════════════════════════════════════════════
        {
            id: createEdgeId("R2_to_J_center_top"),
            type: "default",
            source: createNodeId("R2_left_5ohm"),
            sourceHandle: "right",
            target: createNodeId("J_center_top"),
            targetHandle: "center",
        },
        // ═══════════════════════════════════════════════════════════════
        // CENTER SECTION CONNECTIONS (R3, R4, J_center_top)
        // ═══════════════════════════════════════════════════════════════
        {
            id: createEdgeId("J_center_top_to_R3"),
            type: "default",
            source: createNodeId("J_center_top"),
            sourceHandle: "center",
            target: createNodeId("R3_right_10ohm"),
            targetHandle: "left",
            data: {
                waypoints: [
                    { x: 594.9338716606708, y: 357.7553350706364, direction: "horizontal", auto: true },
                    { x: 594.9338716606708, y: 359.7553350706364, auto: true, direction: "horizontal" },
                ],
            },
        },
        {
            id: createEdgeId("R4_to_J_center_top"),
            source: createNodeId("R4_center_10ohm"),
            sourceHandle: "right",
            target: createNodeId("J_center_top"),
            targetHandle: "center",
            data: {
                waypoints: [
                    { x: 487.971893541976, y: 486.6336024970021, auto: true, direction: "horizontal" },
                ],
            },
        },
        // ═══════════════════════════════════════════════════════════════
        // RIGHT SECTION CONNECTIONS (R5, I1, J_right_top, J_right_bottom)
        // ═══════════════════════════════════════════════════════════════
        {
            id: createEdgeId("J_right_bottom_to_I1"),
            type: "default",
            source: createNodeId("J_right_bottom"),
            sourceHandle: "center",
            target: createNodeId("I1_right_4a"),
            targetHandle: "bottom",
            data: {
                waypoints: [
                    { x: 905.749725573226, y: 602.633602497002, auto: true, direction: "horizontal" },
                ],
            },
        },
        {
            id: createEdgeId("R5_to_J_right_bottom"),
            source: createNodeId("R5_right_20ohm"),
            sourceHandle: "left",
            target: createNodeId("J_right_bottom"),
            targetHandle: "center",
            data: {
                waypoints: [
                    { x: 752.6385602086426, y: 525.3002691636686, auto: true, direction: "horizontal" },
                ],
            },
        },
        // ═══════════════════════════════════════════════════════════════
        // BOTTOM RAIL CONNECTIONS (J_center_bottom, J_right_bottom)
        // ═══════════════════════════════════════════════════════════════
        {
            id: createEdgeId("V1_to_J_center_bottom"),
            type: "default",
            source: createNodeId("V1_left_20v"),
            sourceHandle: "bottom",
            target: createNodeId("J_center_bottom"),
            targetHandle: "center",
            data: {
                waypoints: [
                    { x: 227.0413515497885, y: 602.633602497002, auto: true, direction: "vertical" },
                ],
            },
        },
        {
            id: createEdgeId("J_center_bottom_to_J_right_bottom"),
            type: "default",
            source: createNodeId("J_center_bottom"),
            sourceHandle: "center",
            target: createNodeId("J_right_bottom"),
            targetHandle: "center",
        },
        {
            id: createEdgeId("R4_to_J_center_bottom"),
            source: createNodeId("R4_center_10ohm"),
            sourceHandle: "left",
            target: createNodeId("J_center_bottom"),
            targetHandle: "center",
            data: {
                waypoints: [
                    { x: 486.6385602086427, y: 526.6336024970021, auto: true, direction: "horizontal" },
                ],
            },
        },
        // ═══════════════════════════════════════════════════════════════
        // TOP SECTION CONNECTIONS (R1, J_left_top, J_right_top)
        // ═══════════════════════════════════════════════════════════════
        {
            id: createEdgeId("R1_to_J_right_top"),
            type: "default",
            source: createNodeId("R1_top_30ohm"),
            sourceHandle: "right",
            target: createNodeId("J_right_top"),
            targetHandle: "center",
            data: {
                waypoints: [
                    { x: 752.860809557601, y: 200.8558315009083 },
                ],
            },
        },
        {
            id: createEdgeId("J_right_top_to_R5"),
            type: "default",
            source: createNodeId("J_right_top"),
            sourceHandle: "center",
            target: createNodeId("R5_right_20ohm"),
            targetHandle: "right",
            data: {
                waypoints: [
                    { x: 752.860809557601, y: 485.3002691636687, direction: "vertical", auto: true },
                ],
            },
        },
        {
            id: createEdgeId("R3_to_J_right_top"),
            source: createNodeId("R3_right_10ohm"),
            sourceHandle: "right",
            target: createNodeId("J_right_top"),
            targetHandle: "center",
            data: {
                waypoints: [
                    { x: 752.860809557601, y: 361.06051026552916, auto: true, direction: "horizontal" },
                ],
            },
        },
        // ─────────────────────────────────────────────────────────────
        // R1 left side connection
        // ─────────────────────────────────────────────────────────────
        {
            id: createEdgeId("R1_to_J_left_top"),
            type: "default",
            source: createNodeId("R1_top_30ohm"),
            sourceHandle: "left",
            target: createNodeId("J_left_top"),
            targetHandle: "center",
            data: {
                waypoints: [
                    { x: 226.63856020864264, y: 200.8558315009083 },
                ],
            },
        },
        // ─────────────────────────────────────────────────────────────
        // J_left_top to V1 connection
        // ─────────────────────────────────────────────────────────────
        {
            id: createEdgeId("J_left_top_to_V1"),
            type: "default",
            source: createNodeId("J_left_top"),
            sourceHandle: "center",
            target: createNodeId("V1_left_20v"),
            targetHandle: "top",
            data: {
                waypoints: [
                    { x: 226.63856020864264, y: 445.9669358303354, direction: "vertical", auto: true },
                ],
            },
        },
        // ─────────────────────────────────────────────────────────────
        // R2 left side connection
        // ─────────────────────────────────────────────────────────────
        {
            id: createEdgeId("R2_to_J_left_top"),
            source: createNodeId("R2_left_5ohm"),
            sourceHandle: "left",
            target: createNodeId("J_left_top"),
            targetHandle: "center",
            data: {
                waypoints: [
                    { x: 226.63856020864264, y: 357.7553350706364, auto: true, direction: "horizontal" },
                ],
            },
        },
        // ─────────────────────────────────────────────────────────────
        // I1 top connection
        // ─────────────────────────────────────────────────────────────
        {
            id: createEdgeId("I1_to_J_right_top"),
            source: createNodeId("I1_right_4a"),
            sourceHandle: "top",
            target: createNodeId("J_right_top"),
            targetHandle: "center",
            data: {
                waypoints: [
                    { x: 901.3052268753094, y: 362.6336024970021 },
                ],
            },
        },
    ];

const circuit: Circuit = {
    id: createCircuitId("circuit-1763603622498-14f53d4f"),
    name: "Circuit 1",
    nodes: circuitNodes,
    edges: circuitEdges,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
};

describe("createAnalysisGraph", () => {
    /**
     * ╔═══════════════════════════════════════════════════════════════════════════════════════╗
     * ║                        GRAPH TRANSFORMATION TEST                                      ║
     * ╚═══════════════════════════════════════════════════════════════════════════════════════╝
     *
     * This test validates the transformation of a React Flow circuit representation
     * into an analysis graph suitable for nodal and loop analysis.
     *
     * INPUT: Circuit with 12 CircuitNodes (5 resistors, 1 voltage source, 1 current source, 5 junctions)
     *        and 16 CircuitEdges (wire connections)
     *
     * OUTPUT: AnalysisGraph with:
     *   - nodes: Electrical nodes (junctions merged with components)
     *   - branches: 6 branches (resistors and voltage sources only, current sources excluded)
     *   - allSpanningTrees: Multiple spanning trees for tie-set analysis
     *   - adjacency data: For graph traversal and analysis
     *
     * TRANSFORMATION PROCESS:
     *   1. Extract components (resistors, voltage sources) as branches (exclude current sources)
     *   2. Identify electrical nodes (merge junctions with connected components)
     *   3. Build adjacency matrix (node-to-node connections via branches)
     *   4. Generate spanning trees (for independent loop identification)
     *   5. Prepare incidence matrix data (branch-to-node relationships)
     *
     * EXPECTED RESULTS:
     *   ✓ 6 branches total (5 resistors + 1 voltage source, current source excluded)
     *   ✓ Multiple electrical nodes (depends on junction merging logic)
     *   ✓ At least 1 spanning tree (for connected graph)
     *   ✓ Valid graph structure (no isolated components)
     */
    it("should transform circuit to analysis graph correctly", () => {
        const graph = createAnalysisGraph(circuit);

        // ═══════════════════════════════════════════════════════════════
        // DEBUG LOGGING (visible in development mode)
        // ═══════════════════════════════════════════════════════════════
        logger.info({ caller: "graphTransformer.test" }, "Nodes:", graph.nodes);
        logger.info({ caller: "graphTransformer.test" }, "Branches:", graph.branches);
        logger.info({ caller: "graphTransformer.test" }, "Spanning Trees:", graph.allSpanningTrees.length);

        // ═══════════════════════════════════════════════════════════════
        // BASIC STRUCTURE VALIDATION
        // ═══════════════════════════════════════════════════════════════
        expect(graph).toBeDefined();
        expect(graph.nodes.length).toBeGreaterThan(0);
        expect(graph.branches.length).toBeGreaterThan(0);
        expect(graph.allSpanningTrees.length).toBeGreaterThan(0);

        // ═══════════════════════════════════════════════════════════════
        // BRANCH COUNT VALIDATION
        // ═══════════════════════════════════════════════════════════════
        // We expect exactly 6 branches (resistors and voltage sources only):
        //   1. R1_top_30ohm     (30Ω resistor)
        //   2. R2_left_5ohm     (5Ω resistor)
        //   3. R3_right_10ohm   (10Ω resistor)
        //   4. V1_left_20v      (20V voltage source)
        //   5. R4_center_10ohm  (10Ω resistor)
        //   6. R5_right_20ohm   (20Ω resistor)
        // Note: I1_right_4a (4A current source) is excluded
        expect(graph.branches.length).toBe(6);

        /**
         * ┌───────────────────────────────────────────────────────────────────────────┐
         * │                    ADDITIONAL VALIDATION OPPORTUNITIES                    │
         * └───────────────────────────────────────────────────────────────────────────┘
         *
         * Future tests could validate:
         *   □ Node count matches expected electrical nodes
         *   □ Each branch has valid from/to node references
         *   □ Spanning tree count matches expected value
         *   □ Graph is fully connected (no isolated components)
         *   □ Incidence matrix dimensions (branches × nodes)
         *   □ Adjacency matrix is symmetric (for undirected graph)
         *   □ Branch types are correctly identified (resistor, voltage, current)
         *   □ Branch values match component values
         *   □ Node IDs are unique and valid
         *   □ Graph can be used for nodal analysis
         *   □ Graph can be used for loop analysis
         */
    });
});
