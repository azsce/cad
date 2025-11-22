/**
 * Hook for consuming PresentationContext.
 * Provides access to presentation state in child components.
 */

import { useContext } from "react";
import { PresentationContext } from "./context";
import type { PresentationContextState } from "./context";

/**
 * 🎨 Hook to access presentation context state.
 *
 * Must be used within a PresentationProvider.
 *
 * @returns Presentation context state
 * @throws Error if used outside PresentationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     markdownOutput,
 *     isGenerating,
 *     visualizationData,
 *     setVisualizationMode,
 *     setHighlightedElements
 *   } = usePresentation();
 *
 *   const handleModeChange = (mode: VisualizationMode) => {
 *     setVisualizationMode(mode);
 *   };
 *
 *   const handleLoopClick = (loopIndex: number) => {
 *     const loop = visualizationData.loopDefinitions?.[loopIndex];
 *     if (loop) {
 *       setHighlightedElements(loop.branchIds);
 *     }
 *   };
 *
 *   if (isGenerating) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return (
 *     <div>
 *       <GraphVisualization data={visualizationData} />
 *       <ReactMarkdown>{markdownOutput}</ReactMarkdown>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePresentation(): PresentationContextState {
  const context = useContext(PresentationContext);

  // Context will always have a value due to default state
  return context;
}
