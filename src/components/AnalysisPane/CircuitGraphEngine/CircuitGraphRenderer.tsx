/**
 * Circuit Graph Renderer Component
 * 
 * Pure presentation layer that renders a LayoutGraph as SVG elements.
 * Handles node/edge rendering, labels, arrows, and spanning tree styling.
 */

import React, { useMemo, useCallback } from "react";
import type { LayoutGraph, LayoutEdge, LayoutNode } from "./types";
import type { TreeId, BranchId, NodeId } from "../../../types/analysis";

/**
 * Point where two edges intersect (not at a node)
 */
export interface EdgeIntersection {
  x: number;
  y: number;
  /** Angle of intersection in radians (for rendering cross) */
  angle?: number;
}

/**
 * Props for the CircuitGraphRenderer component
 */
export interface CircuitGraphRendererProps {
  /** The geometric graph layout to render */
  graph: LayoutGraph;
  /** ID of the currently selected spanning tree (for twig/link styling) */
  selectedTreeId?: TreeId;
  /** Set of branch IDs that are twigs in the selected spanning tree */
  twigBranchIds?: Set<BranchId>;
  /** Optional list of edge intersection points to render as crosses */
  intersections?: EdgeIntersection[];
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: NodeId) => void;
  /** Callback when an edge is clicked */
  onEdgeClick?: (branchId: BranchId) => void;
  /** Color for graph elements (nodes, edges, labels) - should contrast with background */
  color?: string;
}

/**
 * 🔗 Renders edges as SVG paths
 */
const EdgesRenderer: React.FC<{
  edges: LayoutEdge[];
  twigBranchIds?: Set<BranchId>;
  onEdgeClick?: (branchId: BranchId) => void;
  color: string;
}> = React.memo(({ edges, twigBranchIds, onEdgeClick, color }) => {
  const getStrokeDashArray = useCallback((edgeId: string) => {
    if (!twigBranchIds) return "none";
    return twigBranchIds.has(edgeId as BranchId) ? "none" : "5,5";
  }, [twigBranchIds]);

  const handleClick = useCallback((branchId: BranchId) => {
    return (event: React.MouseEvent) => {
      event.stopPropagation();
      onEdgeClick?.(branchId);
    };
  }, [onEdgeClick]);

  return (
    <>
      {edges.map((edge) => (
        <path
          key={edge.id}
          d={edge.path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={getStrokeDashArray(edge.id)}
          style={{ cursor: onEdgeClick ? "pointer" : "default" }}
          onClick={handleClick(edge.id as BranchId)}
        />
      ))}
    </>
  );
});
EdgesRenderer.displayName = "EdgesRenderer";

/**
 * ⚫ Renders nodes as circles
 */
const NodesRenderer: React.FC<{
  nodes: LayoutNode[];
  onNodeClick?: (nodeId: NodeId) => void;
  color: string;
}> = React.memo(({ nodes, onNodeClick, color }) => {
  const handleClick = useCallback((nodeId: NodeId) => {
    return (event: React.MouseEvent) => {
      event.stopPropagation();
      onNodeClick?.(nodeId);
    };
  }, [onNodeClick]);

  return (
    <>
      {nodes.map((node) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={3}
          fill={color}
          style={{ cursor: onNodeClick ? "pointer" : "default" }}
          onClick={handleClick(node.id as NodeId)}
        />
      ))}
    </>
  );
});
NodesRenderer.displayName = "NodesRenderer";

/**
 * ✖️ Renders edge intersections as crosses
 */
const IntersectionsRenderer: React.FC<{
  intersections?: EdgeIntersection[];
  color: string;
}> = React.memo(({ intersections, color }) => {
  if (!intersections) return null;

  const crossSize = 4;

  return (
    <>
      {intersections.map((intersection, index) => (
        <g
          key={`intersection-${index.toString()}`}
          transform={`translate(${intersection.x.toString()}, ${intersection.y.toString()})`}
          style={{ pointerEvents: "none" }}
        >
          <line
            x1={-crossSize}
            y1={-crossSize}
            x2={crossSize}
            y2={crossSize}
            stroke={color}
            strokeWidth="1.5"
          />
          <line
            x1={-crossSize}
            y1={crossSize}
            x2={crossSize}
            y2={-crossSize}
            stroke={color}
            strokeWidth="1.5"
          />
        </g>
      ))}
    </>
  );
});
IntersectionsRenderer.displayName = "IntersectionsRenderer";

/**
 * ➡️ Renders arrows on edges
 */
const ArrowsRenderer: React.FC<{
  edges: LayoutEdge[];
  color: string;
}> = React.memo(({ edges, color }) => {
  return (
    <>
      {edges.map((edge) => {
        const angleDegrees = (edge.arrowPoint.angle * 180) / Math.PI;
        return (
          <g
            key={`${edge.id}-arrow`}
            transform={`translate(${edge.arrowPoint.x.toString()}, ${edge.arrowPoint.y.toString()}) rotate(${angleDegrees.toString()})`}
            style={{ pointerEvents: "none" }}
          >
            <path d="M0,0 L0,6 L9,3 z" fill={color} />
          </g>
        );
      })}
    </>
  );
});
ArrowsRenderer.displayName = "ArrowsRenderer";

/**
 * Label item with position and text
 */
interface LabelItem {
  readonly id: string;
  readonly labelPos: { readonly x: number; readonly y: number };
  readonly label: string;
}

/**
 * 🏷️ Generic label renderer component
 */
const LabelRenderer: React.FC<{
  items: readonly LabelItem[];
  color: string;
  fontSize: number;
  fontWeight: string;
}> = React.memo(({ items, color, fontSize, fontWeight }) => {
  return (
    <>
      {items.map((item) => (
        <text
          key={`${item.id}-label`}
          x={item.labelPos.x}
          y={item.labelPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={fontSize}
          fontFamily="sans-serif"
          fontWeight={fontWeight}
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {item.label}
        </text>
      ))}
    </>
  );
});
LabelRenderer.displayName = "LabelRenderer";

/**
 * 🏷️ Renders edge labels
 */
const EdgeLabelsRenderer: React.FC<{
  edges: LayoutEdge[];
  color: string;
}> = React.memo(({ edges, color }) => {
  return <LabelRenderer items={edges} color={color} fontSize={14} fontWeight="600" />;
});
EdgeLabelsRenderer.displayName = "EdgeLabelsRenderer";

/**
 * 🏷️ Renders node labels
 */
const NodeLabelsRenderer: React.FC<{
  nodes: LayoutNode[];
  color: string;
}> = React.memo(({ nodes, color }) => {
  return <LabelRenderer items={nodes} color={color} fontSize={12} fontWeight="500" />;
});
NodeLabelsRenderer.displayName = "NodeLabelsRenderer";

/**
 * 📏 Calculates the actual bounding box of all graph elements
 */
const calculateBounds = (nodes: LayoutNode[], edges: LayoutEdge[]) => {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Check all node positions
  for (const node of nodes) {
    minX = Math.min(minX, node.x, node.labelPos.x);
    minY = Math.min(minY, node.y, node.labelPos.y);
    maxX = Math.max(maxX, node.x, node.labelPos.x);
    maxY = Math.max(maxY, node.y, node.labelPos.y);
  }

  // Check all edge label positions
  for (const edge of edges) {
    minX = Math.min(minX, edge.labelPos.x, edge.arrowPoint.x);
    minY = Math.min(minY, edge.labelPos.y, edge.arrowPoint.y);
    maxX = Math.max(maxX, edge.labelPos.x, edge.arrowPoint.x);
    maxY = Math.max(maxY, edge.labelPos.y, edge.arrowPoint.y);
  }

  return { minX, minY, maxX, maxY };
};

/**
 * 🎨 Renders a circuit graph as SVG elements.
 * 
 * Takes a LayoutGraph with pre-calculated positions and paths,
 * and renders it as clean, textbook-quality SVG visualization.
 */
export const CircuitGraphRenderer: React.FC<CircuitGraphRendererProps> = React.memo(({
  graph,
  twigBranchIds,
  intersections,
  onNodeClick,
  onEdgeClick,
  color = "#000000",
}) => {
  const viewBox = useMemo(() => {
    const padding = 20;
    const bounds = calculateBounds(graph.nodes, graph.edges);
    
    const minX = bounds.minX - padding;
    const minY = bounds.minY - padding;
    const width = (bounds.maxX - bounds.minX) + (2 * padding);
    const height = (bounds.maxY - bounds.minY) + (2 * padding);
    
    return `${minX.toString()} ${minY.toString()} ${width.toString()} ${height.toString()}`;
  }, [graph.nodes, graph.edges]);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <EdgesRenderer 
        edges={graph.edges}
        color={color}
        {...(twigBranchIds && { twigBranchIds })}
        {...(onEdgeClick && { onEdgeClick })}
      />
      <NodesRenderer 
        nodes={graph.nodes}
        color={color}
        {...(onNodeClick && { onNodeClick })}
      />
      {intersections && <IntersectionsRenderer intersections={intersections} color={color} />}
      <ArrowsRenderer edges={graph.edges} color={color} />
      <EdgeLabelsRenderer edges={graph.edges} color={color} />
      <NodeLabelsRenderer nodes={graph.nodes} color={color} />
    </svg>
  );
});

CircuitGraphRenderer.displayName = "CircuitGraphRenderer";
