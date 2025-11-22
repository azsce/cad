/**
 * Styled components for ResistorNode
 */

import { Box, styled } from "@mui/material";
import { HANDLE_BORDER_WIDTH, HORIZONTAL_WIDTH, HORIZONTAL_HEIGHT } from "./constants";

export const OuterWrapper = styled(Box)({
  position: "relative",
});

export const InnerRotatedBox = styled(Box, {
  shouldForwardProp: prop => prop !== "rotation" && prop !== "selected",
})<{ rotation: number; selected: boolean }>(({ theme, rotation, selected }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: `translate(-50%, -50%) rotate(${String(rotation)}deg)`,
  transformOrigin: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.background.paper,
  border: `${String(HANDLE_BORDER_WIDTH)}px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(1),
  width: HORIZONTAL_WIDTH,
  height: HORIZONTAL_HEIGHT,
  boxShadow: selected ? theme.shadows[3] : "none",
}));

export const ValueContainer = styled(Box)({
  position: "absolute",
  bottom: -2,
  left: "50%",
  transform: "translateX(-50%)",
  fontSize: 10,
  fontWeight: "bold",
  whiteSpace: "nowrap",
});

export const EditableValueBox = styled(Box)(({ theme }) => ({
  cursor: "pointer",
  padding: "1px 4px",
  borderRadius: theme.spacing(0.5),
  backgroundColor: theme.palette.action.hover,
  "&:hover": {
    backgroundColor: theme.palette.action.selected,
  },
}));
