/**
 * Graph Tooltip Component
 * 
 * Displays detailed information about graph elements on hover.
 * Renders as an SVG overlay with automatic positioning to stay within bounds.
 */

import React, { useMemo } from "react";
import type { TooltipData } from "./types";

/**
 * Props for the GraphTooltip component
 */
export interface GraphTooltipProps {
  /** Tooltip data to display (null to hide) */
  data: TooltipData | null;
  /** Width of the SVG viewport */
  svgWidth: number;
  /** Height of the SVG viewport */
  svgHeight: number;
}

/**
 * Configuration constants for tooltip rendering
 */
const TOOLTIP_CONFIG = {
  padding: 8,
  borderRadius: 4,
  maxWidth: 200,
  lineHeight: 18,
  titleFontSize: 14,
  detailFontSize: 12,
  offset: 10, // Distance from hover point
} as const;

/**
 * 📏 Calculates tooltip dimensions based on content
 */
const calculateTooltipDimensions = (data: TooltipData) => {
  const { padding, lineHeight, titleFontSize } = TOOLTIP_CONFIG;
  
  const titleHeight = titleFontSize + 2;
  const detailHeight = data.content.details.length * lineHeight;
  const contentHeight = titleHeight + detailHeight;
  
  const height = contentHeight + 2 * padding;
  const width = TOOLTIP_CONFIG.maxWidth;
  
  return { width, height };
};

/**
 * Parameters for tooltip position calculation
 */
interface TooltipPositionParams {
  readonly data: TooltipData;
  readonly width: number;
  readonly height: number;
  readonly svgWidth: number;
  readonly svgHeight: number;
}

/**
 * 📍 Calculates tooltip position to stay within SVG bounds
 */
const calculateTooltipPosition = ({
  data,
  width,
  height,
  svgWidth,
  svgHeight,
}: TooltipPositionParams) => {
  const { offset } = TOOLTIP_CONFIG;
  
  let x = data.position.x + offset;
  let y = data.position.y + offset;
  
  if (x + width > svgWidth) {
    x = data.position.x - width - offset;
  }
  
  if (y + height > svgHeight) {
    y = data.position.y - height - offset;
  }
  
  x = Math.max(0, x);
  y = Math.max(0, y);
  
  return { x, y };
};

/**
 * 💬 Renders a tooltip overlay for graph elements.
 * 
 * Displays element details on hover with automatic positioning
 * to stay within the SVG viewport bounds.
 */
export const GraphTooltip: React.FC<GraphTooltipProps> = React.memo(({
  data,
  svgWidth,
  svgHeight,
}) => {
  const tooltipLayout = useMemo(() => {
    if (!data) return null;
    
    const dimensions = calculateTooltipDimensions(data);
    const position = calculateTooltipPosition({
      data,
      width: dimensions.width,
      height: dimensions.height,
      svgWidth,
      svgHeight,
    });
    
    return { ...dimensions, ...position };
  }, [data, svgWidth, svgHeight]);

  if (!data || !tooltipLayout) {
    return null;
  }

  const { x, y, width, height } = tooltipLayout;
  const { padding, borderRadius, titleFontSize, detailFontSize, lineHeight } = TOOLTIP_CONFIG;

  return (
    <g
      style={{
        pointerEvents: "none",
        opacity: 1,
        transition: "opacity 0.1s ease-in-out",
      }}
    >
      {/* Background rectangle */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#ffffff"
        fillOpacity={0.95}
        stroke="#cccccc"
        strokeWidth={1}
        rx={borderRadius}
        ry={borderRadius}
        filter="url(#tooltip-shadow)"
      />
      
      {/* Drop shadow filter */}
      <defs>
        <filter id="tooltip-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Title text */}
      <text
        x={x + padding}
        y={y + padding + titleFontSize}
        fill="#000000"
        fontSize={titleFontSize}
        fontFamily="sans-serif"
        fontWeight="bold"
        style={{ userSelect: "none" }}
      >
        {data.content.title}
      </text>

      {/* Detail lines */}
      {data.content.details.map((detail, index) => {
        const detailY = y + padding + titleFontSize + 4 + (index + 1) * lineHeight;
        return (
          <text
            key={`${detail.label}-${index.toString()}`}
            x={x + padding}
            y={detailY}
            fill="#333333"
            fontSize={detailFontSize}
            fontFamily="sans-serif"
            style={{ userSelect: "none" }}
          >
            <tspan fontWeight="500">{detail.label}:</tspan>
            <tspan fontWeight="normal"> {detail.value}</tspan>
          </text>
        );
      })}
    </g>
  );
});

GraphTooltip.displayName = "GraphTooltip";
