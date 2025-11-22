/**
 * ConnectionPath component - renders the connection line
 */

import { memo } from "react";
import { logger } from "../../../../utils/logger";

interface ConnectionPathProps {
  pathData: string;
  strokeWidth: number;
  dashArray: number;
}

export const ConnectionPath = memo(({ pathData, strokeWidth, dashArray }: ConnectionPathProps) => {
  return (
    <path
      d={pathData}
      fill="none"
      stroke="#2563eb"
      strokeWidth={strokeWidth}
      strokeDasharray={`${dashArray.toString()} ${dashArray.toString()}`}
      strokeLinecap="round"
      onClick={e => {
        logger.warn({ caller: "ConnectionPath" }, "⚠️ CONNECTION PATH CLICKED (should not happen!)", {
          clientX: e.clientX,
          clientY: e.clientY,
        });
        e.stopPropagation();
      }}
      onMouseDown={e => {
        logger.warn({ caller: "ConnectionPath" }, "⚠️ CONNECTION PATH MOUSE DOWN (should not happen!)", {
          clientX: e.clientX,
          clientY: e.clientY,
        });
      }}
    />
  );
});

ConnectionPath.displayName = "ConnectionPath";
