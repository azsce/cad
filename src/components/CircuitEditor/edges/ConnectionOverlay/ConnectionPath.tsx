/**
 * ConnectionPath component - renders the connection line
 */

import { memo } from 'react';

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
    />
  );
});

ConnectionPath.displayName = 'ConnectionPath';
