/**
 * 📷 exportToPNG - Utility for exporting SVG graph to PNG image.
 */

import { logger } from "../../../utils/logger";

const caller = "exportToPNG";

/**
 * 📷 Exports an SVG element to PNG and triggers download.
 *
 * @param svgElement - The SVG element to export
 * @param filename - Optional filename (defaults to circuit-graph-{timestamp}.png)
 */
export function exportToPNG(svgElement: SVGSVGElement, filename?: string): void {
  try {
    // Get SVG data
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    // Create image to load SVG
    const img = new Image();
    img.onload = () => {
      // Create canvas with SVG dimensions
      const canvas = document.createElement("canvas");
      canvas.width = svgElement.width.baseVal.value * 2; // 2x scale for better quality
      canvas.height = svgElement.height.baseVal.value * 2;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        logger.error({ caller }, "Failed to get canvas context");
        URL.revokeObjectURL(url);
        return;
      }

      // Scale for higher quality
      ctx.scale(2, 2);

      // Draw white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (!blob) {
          logger.error({ caller }, "Failed to create PNG blob");
          return;
        }

        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = filename ?? `circuit-graph-${Date.now().toString()}.png`;
        link.click();

        // Cleanup
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);

        logger.info({ caller }, "Graph exported as PNG", { filename: link.download });
      }, "image/png");
    };

    img.onerror = () => {
      logger.error({ caller }, "Failed to load SVG image");
      URL.revokeObjectURL(url);
    };

    img.src = url;
  } catch (error: unknown) {
    logger.error({ caller }, "Error exporting PNG", { error });
  }
}
