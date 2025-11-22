/**
 * Type declarations for react-cytoscape.
 * The library doesn't provide its own types.
 */

/* cspell:disable */
declare module "react-cytoscapejs" {
  import type { Core, ElementDefinition, Stylesheet, LayoutOptions } from "cytoscape";
  import type { CSSProperties } from "react";

  export interface CytoscapeComponentProps {
    elements?: ElementDefinition[];
    stylesheet?: Stylesheet[];
    layout?: LayoutOptions;
    cy?: (cy: Core) => void;
    style?: CSSProperties;
    className?: string;
    id?: string;
    zoom?: number;
    pan?: { x: number; y: number };
    minZoom?: number;
    maxZoom?: number;
    zoomingEnabled?: boolean;
    userZoomingEnabled?: boolean;
    panningEnabled?: boolean;
    userPanningEnabled?: boolean;
    boxSelectionEnabled?: boolean;
    autoungrabify?: boolean;
    autounselectify?: boolean;
  }

  export default function CytoscapeComponent(props: CytoscapeComponentProps): JSX.Element;
}
