/**
 * ⚠️ ErrorDisplay - Shows error message when layout calculation fails.
 */

import React from "react";
import { Box, Typography } from "@mui/material";

/**
 * ⚠️ Display error message for layout calculation failure.
 */
export function ErrorDisplay(): React.ReactElement {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Typography variant="body1" color="error">
        Failed to calculate graph layout. Please check the circuit structure.
      </Typography>
    </Box>
  );
}
