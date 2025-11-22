/**
 * ⚠️ ErrorDisplay for GraphCanvasNode - Shows error when layout calculation fails.
 */

import React from "react";
import { Box, Typography } from "@mui/material";

/**
 * ⚠️ Display error message for layout calculation failure in canvas node.
 */
export function GraphCanvasErrorDisplay(): React.ReactElement {
  return (
    <Box
      sx={{
        width: 800,
        height: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="body1" color="error">
        Failed to calculate graph layout. Please check the circuit structure.
      </Typography>
    </Box>
  );
}
